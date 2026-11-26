import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { H3Event } from 'h3'
import { deleteCookie, getCookie, getRequestURL, setCookie } from 'h3'

export const SESSION_COOKIE_NAME = 'atelier_session'
export const OAUTH_STATE_COOKIE_NAME = 'atelier_oauth_state'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 hari

export interface AtelierSessionUser {
  sub: string
  profileId: string
  email: string
  name: string
  avatarUrl: string | null
  iat: number
  exp: number
}

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  sessionSecret: string
  appOrigin: string
}

let cachedEnvFallback: Record<string, string> | null = null

function readEnvFallback(): Record<string, string> {
  if (cachedEnvFallback) return cachedEnvFallback
  const parsed: Record<string, string> = {}
  try {
    const envFile = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8')
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eqIdx = line.indexOf('=')
        if (eqIdx <= 0) continue
        const key = line.slice(0, eqIdx).trim()
        let val = line.slice(eqIdx + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        parsed[key] = val
      }
    }
  } catch {
    // Ignore fallback errors in serverless runtimes
  }
  cachedEnvFallback = parsed
  return parsed
}

export function resolveGoogleOAuthConfig(): GoogleOAuthConfig {
  const rc = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : ({} as Record<string, unknown>)
  const fallback = readEnvFallback()

  const clientId = String(
    process.env.GOOGLE_CLIENT_ID || rc.googleClientId || fallback.GOOGLE_CLIENT_ID || ''
  ).trim()
  const clientSecret = String(
    process.env.GOOGLE_CLIENT_SECRET || rc.googleClientSecret || fallback.GOOGLE_CLIENT_SECRET || ''
  ).trim()
  const sessionSecret = String(
    process.env.AUTH_SESSION_SECRET ||
      rc.authSessionSecret ||
      fallback.AUTH_SESSION_SECRET ||
      (clientSecret ? `atelier_hmac_${clientSecret}` : 'atelier_dev_ephemeral_secret_change_me')
  ).trim()
  const appOrigin = String(
    process.env.APP_ORIGIN || rc.appOrigin || fallback.APP_ORIGIN || ''
  )
    .trim()
    .replace(/\/+$/, '')

  return {
    clientId,
    clientSecret,
    sessionSecret,
    appOrigin
  }
}

export function isGoogleOAuthConfigured(): boolean {
  const cfg = resolveGoogleOAuthConfig()
  return Boolean(cfg.clientId && cfg.clientSecret)
}

export function buildGoogleProfileId(googleSub: string): string {
  const hash = crypto.createHash('sha256').update(`google:${googleSub}`).digest('hex').slice(0, 24)
  return `g_${hash}`
}

export function resolveGoogleRedirectUri(event: H3Event): string {
  const cfg = resolveGoogleOAuthConfig()
  if (cfg.appOrigin) {
    return `${cfg.appOrigin}/api/auth/google/callback`
  }
  const reqUrl = getRequestURL(event)
  return `${reqUrl.origin}/api/auth/google/callback`
}

export function sanitizeReturnPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/dashboard'
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/dashboard'
  }
  return trimmed
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + pad, 'base64').toString('utf8')
}

export function signSessionToken(
  payload: Omit<AtelierSessionUser, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const nowSec = Math.floor(Date.now() / 1000)
  const fullPayload: AtelierSessionUser = {
    ...payload,
    iat: nowSec,
    exp: nowSec + ttlSeconds
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const sig = crypto.createHmac('sha256', secret).update(encodedPayload).digest()
  return `${encodedPayload}.${base64UrlEncode(sig)}`
}

export function verifySessionToken(
  token: string | undefined | null,
  secret: string
): AtelierSessionUser | null {
  if (!token || typeof token !== 'string') return null
  const dotIdx = token.indexOf('.')
  if (dotIdx <= 0) return null

  const encodedPayload = token.slice(0, dotIdx)
  const encodedSig = token.slice(dotIdx + 1)
  if (!encodedPayload || !encodedSig) return null

  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(encodedPayload).digest()
  )

  const a = Buffer.from(encodedSig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AtelierSessionUser>
    const nowSec = Math.floor(Date.now() / 1000)
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.profileId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= nowSec
    ) {
      return null
    }
    return {
      sub: parsed.sub,
      profileId: parsed.profileId,
      email: parsed.email,
      name: parsed.name,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
      iat: typeof parsed.iat === 'number' ? parsed.iat : nowSec,
      exp: parsed.exp
    }
  } catch {
    return null
  }
}

export function getSessionUserFromEvent(event: H3Event): AtelierSessionUser | null {
  const rawToken = getCookie(event, SESSION_COOKIE_NAME)
  if (!rawToken) return null
  const cfg = resolveGoogleOAuthConfig()
  return verifySessionToken(rawToken, cfg.sessionSecret)
}

export function setSessionCookieOnEvent(
  event: H3Event,
  user: Omit<AtelierSessionUser, 'iat' | 'exp'>
): void {
  const cfg = resolveGoogleOAuthConfig()
  const token = signSessionToken(user, cfg.sessionSecret, SESSION_TTL_SECONDS)
  const isSecure = getRequestURL(event).protocol === 'https:'
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  })
}

export function clearSessionCookiesOnEvent(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
  deleteCookie(event, OAUTH_STATE_COOKIE_NAME, { path: '/' })
}

export function createOAuthStateCookieValue(returnTo: string): { state: string; cookieValue: string } {
  const state = crypto.randomBytes(24).toString('hex')
  const safeReturn = sanitizeReturnPath(returnTo)
  const payload = base64UrlEncode(JSON.stringify({ state, returnTo: safeReturn }))
  return { state, cookieValue: payload }
}

export function parseOAuthStateCookieValue(
  cookieValue: string | undefined | null
): { state: string; returnTo: string } | null {
  if (!cookieValue) return null
  try {
    const parsed = JSON.parse(base64UrlDecode(cookieValue)) as {
      state?: unknown
      returnTo?: unknown
    }
    if (typeof parsed.state !== 'string' || !parsed.state) return null
    return {
      state: parsed.state,
      returnTo: sanitizeReturnPath(parsed.returnTo)
    }
  } catch {
    return null
  }
}
