import {
  getSessionUserFromEvent,
  isGoogleOAuthConfigured,
  resolveGoogleRedirectUri
} from '../../utils/googleAuth'

export default defineEventHandler((event) => {
  const configured = isGoogleOAuthConfigured()
  const redirectUri = resolveGoogleRedirectUri(event)
  const session = getSessionUserFromEvent(event)

  if (!session) {
    return {
      ok: true,
      configured,
      authenticated: false,
      redirectUri,
      user: null
    }
  }

  return {
    ok: true,
    configured,
    authenticated: true,
    redirectUri,
    user: {
      profileId: session.profileId,
      email: session.email,
      name: session.name,
      avatarUrl: session.avatarUrl
    }
  }
})
