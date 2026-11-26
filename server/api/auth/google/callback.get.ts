import crypto from 'node:crypto'
import { deleteCookie, getCookie, getQuery, sendRedirect } from 'h3'
import {
  buildGoogleProfileId,
  isGoogleOAuthConfigured,
  OAUTH_STATE_COOKIE_NAME,
  parseOAuthStateCookieValue,
  resolveGoogleOAuthConfig,
  resolveGoogleRedirectUri,
  setSessionCookieOnEvent
} from '../../../utils/googleAuth'
import { getTiDbPool, isTiDbConfigured } from '../../../utils/tidb'

interface GoogleTokenResponse {
  access_token?: string
  id_token?: string
  error?: string
}

interface GoogleUserInfo {
  sub?: string
  email?: string
  name?: string
  picture?: string
}

function redirectWithAuthError(event: Parameters<typeof sendRedirect>[0], target: string, code: string) {
  const sep = target.includes('?') ? '&' : '?'
  return sendRedirect(event, `${target}${sep}auth_error=${encodeURIComponent(code)}`, 302)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawStateCookie = getCookie(event, OAUTH_STATE_COOKIE_NAME)
  deleteCookie(event, OAUTH_STATE_COOKIE_NAME, { path: '/' })

  const parsedState = parseOAuthStateCookieValue(rawStateCookie)
  const returnTo = parsedState?.returnTo ?? '/dashboard'

  if (!isGoogleOAuthConfigured()) {
    return redirectWithAuthError(event, returnTo, 'not_configured')
  }

  if (typeof query.error === 'string' && query.error) {
    return redirectWithAuthError(event, returnTo, 'cancelled')
  }

  const code = typeof query.code === 'string' ? query.code.trim() : ''
  const incomingState = typeof query.state === 'string' ? query.state.trim() : ''

  if (!code || !incomingState || !parsedState) {
    return redirectWithAuthError(event, returnTo, 'invalid_state')
  }

  const a = Buffer.from(incomingState)
  const b = Buffer.from(parsedState.state)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return redirectWithAuthError(event, returnTo, 'state_mismatch')
  }

  const cfg = resolveGoogleOAuthConfig()
  const redirectUri = resolveGoogleRedirectUri(event)

  // Step 1: Exchange authorization code for access token
  let accessToken = ''
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenRes.ok) {
      return redirectWithAuthError(event, returnTo, 'token_exchange_failed')
    }
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse
    accessToken = tokenData.access_token ?? ''
    if (!accessToken) {
      return redirectWithAuthError(event, returnTo, 'token_missing')
    }
  } catch {
    return redirectWithAuthError(event, returnTo, 'token_network_error')
  }

  // Step 2: Fetch verified Google OpenID Connect user profile
  let profile: GoogleUserInfo
  try {
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` }
    })
    if (!userRes.ok) {
      return redirectWithAuthError(event, returnTo, 'userinfo_failed')
    }
    profile = (await userRes.json()) as GoogleUserInfo
  } catch {
    return redirectWithAuthError(event, returnTo, 'userinfo_network_error')
  }

  const googleSub = String(profile.sub ?? '').trim()
  const email = String(profile.email ?? '').trim()
  const name = String(profile.name ?? email.split('@')[0] ?? 'Pemain Atelier').trim().slice(0, 180)
  const avatarUrl = typeof profile.picture === 'string' && profile.picture.trim() ? profile.picture.trim() : null

  if (!googleSub || !email) {
    return redirectWithAuthError(event, returnTo, 'incomplete_profile')
  }

  const profileId = buildGoogleProfileId(googleSub)

  // Step 3: Upsert user record into TiDB Cloud (non-blocking if DB temporarily unreachable)
  if (isTiDbConfigured()) {
    try {
      const pool = await getTiDbPool()
      await pool.execute(
        `INSERT INTO atelier_users (google_sub, profile_id, email, name, avatar_url)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           email = VALUES(email),
           name = VALUES(name),
           avatar_url = VALUES(avatar_url),
           last_login_at = CURRENT_TIMESTAMP`,
        [googleSub.slice(0, 64), profileId, email.slice(0, 255), name, avatarUrl]
      )
    } catch {
      // Tetap izinkan login via cookie sesi bertanda tangan jika TiDB sedang offline
    }
  }

  // Step 4: Set HMAC-signed HttpOnly session cookie
  setSessionCookieOnEvent(event, {
    sub: googleSub,
    profileId,
    email,
    name,
    avatarUrl
  })

  const sep = returnTo.includes('?') ? '&' : '?'
  return sendRedirect(event, `${returnTo}${sep}auth=google_ok`, 302)
})
