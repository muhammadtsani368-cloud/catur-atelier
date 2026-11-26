import { getAtelierProfileHeaders } from '~/utils/profileId'

export type BoardThemeKey = 'sage' | 'walnut' | 'stone'
export type PieceSetKey = 'classic' | 'animal'

let themeSyncTimer: ReturnType<typeof setTimeout> | null = null

export interface BoardPalette {
  key: BoardThemeKey
  label: string
  light: string
  dark: string
  coordOnLight: string
  coordOnDark: string
}

export const BOARD_PALETTES: Record<BoardThemeKey, BoardPalette> = {
  sage: {
    key: 'sage',
    label: 'Sage Atelier',
    light: '#EDEAE0',
    dark: '#647669',
    coordOnLight: '#3F5044',
    coordOnDark: '#FAF8F4'
  },
  walnut: {
    key: 'walnut',
    label: 'Walnut Klasik',
    light: '#F0EBE1',
    dark: '#7A6049',
    coordOnLight: '#523E2D',
    coordOnDark: '#FAF6EE'
  },
  stone: {
    key: 'stone',
    label: 'Slate Mineral',
    light: '#EAEAE6',
    dark: '#62686F',
    coordOnLight: '#3F444A',
    coordOnDark: '#F7F7F5'
  }
}

const STORAGE_THEME_KEY = 'grandmaster_atelier_theme_v1'

export function useTheme() {
  const isDark = useState<boolean>('atelier-is-dark', () => false)
  const boardTheme = useState<BoardThemeKey>('atelier-board-theme', () => 'sage')
  const pieceSet = useState<PieceSetKey>('atelier-piece-set', () => 'classic')
  const isMuted = useState<boolean>('atelier-is-muted', () => false)
  const cinematicEffects = useState<boolean>('atelier-cinematic-effects', () => true)
  const initialized = useState<boolean>('atelier-theme-init', () => false)

  const currentBoardPalette = computed<BoardPalette>(() => BOARD_PALETTES[boardTheme.value])

  function applyDomTheme(dark: boolean) {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', dark)
  }

  function saveLocalTheme() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_THEME_KEY,
        JSON.stringify({
          isDark: isDark.value,
          boardTheme: boardTheme.value,
          pieceSet: pieceSet.value,
          isMuted: isMuted.value,
          cinematicEffects: cinematicEffects.value
        })
      )
    } catch {
      // Ignore storage quota errors
    }
  }

  function scheduleThemeCloudSync() {
    if (typeof window === 'undefined') return
    if (themeSyncTimer) clearTimeout(themeSyncTimer)
    themeSyncTimer = setTimeout(() => {
      themeSyncTimer = null
      void $fetch('/api/preferences', {
        method: 'PUT',
        headers: getAtelierProfileHeaders(),
        body: {
          isDark: isDark.value,
          boardTheme: boardTheme.value,
          pieceSet: pieceSet.value,
          isMuted: isMuted.value,
          cinematicEffects: cinematicEffects.value
        }
      }).catch(() => {
        // Offline-safe: tetap tersimpan di localStorage
      })
    }, 350)
  }

  function persist() {
    saveLocalTheme()
    scheduleThemeCloudSync()
  }

  function initTheme() {
    if (initialized.value || typeof window === 'undefined') return
    initialized.value = true
    let hadLocalTheme = false
    try {
      const raw = localStorage.getItem(STORAGE_THEME_KEY)
      if (raw) {
        hadLocalTheme = true
        const parsed = JSON.parse(raw) as {
          isDark?: boolean
          boardTheme?: BoardThemeKey
          pieceSet?: PieceSetKey
          isMuted?: boolean
          cinematicEffects?: boolean
        }
        if (typeof parsed.isDark === 'boolean') isDark.value = parsed.isDark
        if (parsed.boardTheme && parsed.boardTheme in BOARD_PALETTES) {
          boardTheme.value = parsed.boardTheme
        }
        if (parsed.pieceSet === 'classic' || parsed.pieceSet === 'animal') {
          pieceSet.value = parsed.pieceSet
        }
        if (typeof parsed.isMuted === 'boolean') isMuted.value = parsed.isMuted
        if (typeof parsed.cinematicEffects === 'boolean') {
          cinematicEffects.value = parsed.cinematicEffects
        }
      }
    } catch {
      // Fallback to light alabaster default
    }
    applyDomTheme(isDark.value)

    // Sinkronkan preferensi tema dengan TiDB Cloud di latar belakang
    void $fetch<{
      ok: boolean
      exists: boolean
      preferences: {
        isDark: boolean
        boardTheme: BoardThemeKey
        pieceSet: PieceSetKey
        isMuted: boolean
        cinematicEffects: boolean
      } | null
    }>('/api/preferences', {
      headers: getAtelierProfileHeaders()
    })
      .then((res) => {
        if (!res?.ok) return
        if (res.exists && res.preferences && !hadLocalTheme) {
          isDark.value = res.preferences.isDark
          if (res.preferences.boardTheme in BOARD_PALETTES) {
            boardTheme.value = res.preferences.boardTheme
          }
          pieceSet.value = res.preferences.pieceSet
          isMuted.value = res.preferences.isMuted
          cinematicEffects.value = res.preferences.cinematicEffects
          applyDomTheme(isDark.value)
          saveLocalTheme()
        } else if (!res.exists && hadLocalTheme) {
          scheduleThemeCloudSync()
        }
      })
      .catch(() => {
        // Offline-safe
      })
  }

  function toggleDark() {
    isDark.value = !isDark.value
    applyDomTheme(isDark.value)
    persist()
  }

  function setBoardTheme(theme: BoardThemeKey) {
    boardTheme.value = theme
    persist()
  }

  function setPieceSet(set: PieceSetKey) {
    pieceSet.value = set
    persist()
  }

  function togglePieceSet() {
    pieceSet.value = pieceSet.value === 'classic' ? 'animal' : 'classic'
    persist()
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    persist()
  }

  function toggleCinematicEffects() {
    cinematicEffects.value = !cinematicEffects.value
    persist()
  }

  function setCinematicEffects(enabled: boolean) {
    cinematicEffects.value = enabled
    persist()
  }

  return {
    isDark,
    boardTheme,
    pieceSet,
    isMuted,
    cinematicEffects,
    currentBoardPalette,
    initTheme,
    toggleDark,
    setBoardTheme,
    setPieceSet,
    togglePieceSet,
    toggleMute,
    toggleCinematicEffects,
    setCinematicEffects
  }
}
