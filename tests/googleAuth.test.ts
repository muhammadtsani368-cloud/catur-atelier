import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGoogleProfileId,
  createOAuthStateCookieValue,
  parseOAuthStateCookieValue,
  sanitizeReturnPath,
  signSessionToken,
  verifySessionToken
} from '../server/utils/googleAuth'

test('Google OAuth session token signs and verifies with HMAC-SHA256 and rejects tampering or expiry', () => {
  const secret = 'test_super_secret_key_for_grandmaster_atelier_2026'
  const token = signSessionToken(
    {
      sub: '112233445566778899',
      profileId: buildGoogleProfileId('112233445566778899'),
      email: 'pemain@example.com',
      name: 'Budi Grandmaster',
      avatarUrl: 'https://lh3.googleusercontent.com/example'
    },
    secret,
    3600
  )

  const verified = verifySessionToken(token, secret)
  assert.ok(verified)
  assert.equal(verified.email, 'pemain@example.com')
  assert.equal(verified.name, 'Budi Grandmaster')
  assert.ok(verified.profileId.startsWith('g_'))

  // Wrong secret rejected
  assert.equal(verifySessionToken(token, 'wrong_secret'), null)

  // Tampered payload rejected
  const [payloadPart, sigPart] = token.split('.')
  const tampered = `${payloadPart}x.${sigPart}`
  assert.equal(verifySessionToken(tampered, secret), null)

  // Expired token rejected
  const expired = signSessionToken(
    {
      sub: '112233',
      profileId: buildGoogleProfileId('112233'),
      email: 'a@b.com',
      name: 'Expired User',
      avatarUrl: null
    },
    secret,
    -10
  )
  assert.equal(verifySessionToken(expired, secret), null)
})

test('Google OAuth state cookie & returnTo sanitization prevent open redirects', () => {
  assert.equal(sanitizeReturnPath('/play?persona=trickster'), '/play?persona=trickster')
  assert.equal(sanitizeReturnPath('https://evil.example.com'), '/dashboard')
  assert.equal(sanitizeReturnPath('//evil.example.com'), '/dashboard')
  assert.equal(sanitizeReturnPath('/\\evil'), '/dashboard')

  const { state, cookieValue } = createOAuthStateCookieValue('/puzzles?mode=daily')
  assert.equal(state.length, 48)
  const parsed = parseOAuthStateCookieValue(cookieValue)
  assert.ok(parsed)
  assert.equal(parsed.state, state)
  assert.equal(parsed.returnTo, '/puzzles?mode=daily')
})
