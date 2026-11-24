const PROFILE_STORAGE_KEY = 'grandmaster_atelier_profile_id_v1'

export function getOrCreateAtelierProfileId(): string {
  if (typeof window === 'undefined') return 'default'
  try {
    const existing = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) {
      return existing
    }
    const rand =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const nextId = `gm_${rand}`
    localStorage.setItem(PROFILE_STORAGE_KEY, nextId)
    return nextId
  } catch {
    return 'default'
  }
}

export function getAtelierProfileHeaders(): Record<string, string> {
  return {
    'x-atelier-profile': getOrCreateAtelierProfileId()
  }
}
