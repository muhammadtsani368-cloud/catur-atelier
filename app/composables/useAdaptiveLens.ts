import {
  ADAPTIVE_LENS_PRESETS,
  getLensPreset,
  type AdaptiveLensId,
  type AdaptiveLensPreset
} from '~/utils/adaptiveLensEngine'

const STORAGE_LENS_KEY = 'grandmaster_atelier_adaptive_lens_v1'

export function useAdaptiveLens() {
  const activeLens = useState<AdaptiveLensId>('atelier-adaptive-lens', () => 'apprentice')
  const lensHydrated = useState<boolean>('atelier-adaptive-lens-init', () => false)

  const currentLensPreset = computed<AdaptiveLensPreset>(() => getLensPreset(activeLens.value))

  function initLens() {
    if (lensHydrated.value || typeof window === 'undefined') return
    lensHydrated.value = true
    try {
      const saved = localStorage.getItem(STORAGE_LENS_KEY)
      if (saved === 'apprentice' || saved === 'club' || saved === 'master') {
        activeLens.value = saved
      }
    } catch {
      // Ignore storage access errors
    }
  }

  function setLens(next: AdaptiveLensId) {
    activeLens.value = next
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LENS_KEY, next)
      } catch {
        // Ignore storage quota errors
      }
    }
  }

  return {
    activeLens,
    presets: ADAPTIVE_LENS_PRESETS,
    currentLensPreset,
    initLens,
    setLens
  }
}
