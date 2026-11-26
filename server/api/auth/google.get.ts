import { getQuery, getRequestURL, sendRedirect, setCookie } from 'h3'
import {
  createOAuthStateCookieValue,
  isGoogleOAuthConfigured,
  OAUTH_STATE_COOKIE_NAME,
  resolveGoogleOAuthConfig,
  resolveGoogleRedirectUri,
  sanitizeReturnPath
} from '../../utils/googleAuth'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const returnTo = sanitizeReturnPath(query.returnTo)

  if (!isGoogleOAuthConfigured()) {
    const sep = returnTo.includes('?') ? '&' : '?'
    return sendRedirect(event, `${returnTo}${sep}auth_error=not_configured`, 302)
  }

  const cfg = resolveGoogleOAuthConfig()
  const redirectUri = resolveGoogleRedirectUri(event)
  const { state, cookieValue } = createOAuthStateCookieValue(returnTo)
  const isSecure = getRequestURL(event).protocol === 'https:'

  setCookie(event, OAUTH_STATE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 60 * 10 // 10 menit
  })

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', cfg.clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', 'online')
  authUrl.searchParams.set('prompt', 'select_account')

  return sendRedirect(event, authUrl.toString(), 302)
})
