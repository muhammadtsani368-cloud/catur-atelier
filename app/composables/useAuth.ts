export interface AuthUserProfile {
  profileId: string
  email: string
  name: string
  avatarUrl: string | null
}

interface AuthMeResponse {
  ok: boolean
  configured: boolean
  authenticated: boolean
  redirectUri: string
  user: AuthUserProfile | null
}

export function useAuth() {
  const user = useState<AuthUserProfile | null>('atelier-auth-user', () => null)
  const isGoogleConfigured = useState<boolean>('atelier-auth-google-configured', () => false)
  const oauthRedirectUri = useState<string>(
    'atelier-auth-redirect-uri',
    () => 'http://localhost:3000/api/auth/google/callback'
  )
  const authLoading = useState<boolean>('atelier-auth-loading', () => false)
  const authHydrated = useState<boolean>('atelier-auth-hydrated', () => false)

  const isAuthenticated = computed(() => Boolean(user.value))

  async function hydrateAuth(force = false): Promise<AuthUserProfile | null> {
    if (typeof window === 'undefined') return null
    if (authHydrated.value && !force) return user.value
    authLoading.value = true
    try {
      const res = await $fetch<AuthMeResponse>('/api/auth/me')
      if (res?.ok) {
        isGoogleConfigured.value = Boolean(res.configured)
        if (res.redirectUri) oauthRedirectUri.value = res.redirectUri
        user.value = res.authenticated && res.user ? res.user : null
      }
      authHydrated.value = true
    } catch {
      user.value = null
    } finally {
      authLoading.value = false
    }
    return user.value
  }

  function loginWithGoogle(returnTo?: string) {
    if (typeof window === 'undefined') return
    const targetPath =
      returnTo ||
      `${window.location.pathname}${window.location.search}`.replace(/[?&](auth|auth_error)=[^&]*/g, '') ||
      '/dashboard'
    const params = new URLSearchParams({ returnTo: targetPath })
    window.location.href = `/api/auth/google?${params.toString()}`
  }

  async function logout() {
    if (typeof window === 'undefined') return
    authLoading.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Tetap bersihkan state lokal meskipun jaringan bermasalah
    } finally {
      user.value = null
      authLoading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    isGoogleConfigured,
    oauthRedirectUri,
    authLoading,
    authHydrated,
    hydrateAuth,
    loginWithGoogle,
    logout
  }
}
