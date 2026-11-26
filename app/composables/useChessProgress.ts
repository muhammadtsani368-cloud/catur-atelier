import {
  ALL_CURATED_MODULES,
  CURATED_ENDGAMES,
  CURATED_OPENINGS,
  type OpeningModule,
  type RepertoireModule
} from '~/utils/chessData'
import { markDailyRoutineTaskComplete } from '~/utils/dailyRoutine'
import { getAtelierProfileHeaders } from '~/utils/profileId'

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

let progressSyncTimer: ReturnType<typeof setTimeout> | null = null

export interface LineStat {
  attempts: number
  correct: number
  completions: number
  lastPracticed: string
}

export type MistakeSource = 'opening' | 'endgame' | 'daily'

export interface MistakeQueueItem {
  id: string
  source: MistakeSource
  title: string
  fen: string
  expectedSan: string
  side: 'w' | 'b'
  createdAt: string
}

export interface ChessProgressState {
  totalAttempts: number
  correctMoves: number
  streakDays: number
  lastPracticeDate: string | null
  masteredLineIds: string[]
  lineStats: Record<string, LineStat>
  customOpenings: OpeningModule[]
  mistakeQueue: MistakeQueueItem[]
}

const STORAGE_KEY = 'grandmaster_atelier_progress_v1'
const MAX_MISTAKE_QUEUE = 30

function getTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getYesterdayIso(): string {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function createInitialState(): ChessProgressState {
  return {
    totalAttempts: 0,
    correctMoves: 0,
    streakDays: 0,
    lastPracticeDate: null,
    masteredLineIds: [],
    lineStats: {},
    customOpenings: [],
    mistakeQueue: []
  }
}

export function useChessProgress() {
  const state = useState<ChessProgressState>('atelier-chess-progress', createInitialState)
  const hydrated = useState<boolean>('atelier-progress-hydrated', () => false)
  const cloudSyncStatus = useState<CloudSyncStatus>('atelier-cloud-sync', () => 'idle')

  function saveToLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      // Ignore storage quota issues
    }
  }

  async function pushProgressToCloud() {
    if (typeof window === 'undefined') return
    cloudSyncStatus.value = 'syncing'
    try {
      await $fetch('/api/progress', {
        method: 'PUT',
        headers: getAtelierProfileHeaders(),
        body: state.value
      })
      cloudSyncStatus.value = 'synced'
    } catch {
      cloudSyncStatus.value = 'offline'
    }
  }

  function scheduleCloudSync() {
    if (typeof window === 'undefined') return
    if (progressSyncTimer) clearTimeout(progressSyncTimer)
    cloudSyncStatus.value = 'syncing'
    progressSyncTimer = setTimeout(() => {
      progressSyncTimer = null
      void pushProgressToCloud()
    }, 450)
  }

  function persist() {
    saveToLocalStorage()
    scheduleCloudSync()
  }

  function mergeWithCloud(remote: Partial<ChessProgressState>) {
    const local = state.value
    const remoteMastered = Array.isArray(remote.masteredLineIds) ? remote.masteredLineIds : []
    const mergedMastered = Array.from(new Set([...local.masteredLineIds, ...remoteMastered]))

    const remoteStats =
      remote.lineStats && typeof remote.lineStats === 'object' ? remote.lineStats : {}
    const mergedStats: Record<string, LineStat> = { ...remoteStats }
    for (const [lineId, lStat] of Object.entries(local.lineStats)) {
      const rStat = mergedStats[lineId]
      if (!rStat || lStat.attempts >= rStat.attempts) {
        mergedStats[lineId] = lStat
      }
    }

    const remoteCustom = Array.isArray(remote.customOpenings) ? remote.customOpenings : []
    const customMap = new Map<string, OpeningModule>()
    for (const op of remoteCustom) customMap.set(op.id, op)
    for (const op of local.customOpenings) customMap.set(op.id, op)

    const remoteMistakes = Array.isArray(remote.mistakeQueue) ? remote.mistakeQueue : []
    const mistakeSeen = new Set<string>()
    const mergedMistakes: MistakeQueueItem[] = []
    for (const item of [...local.mistakeQueue, ...remoteMistakes]) {
      const key = `${item.fen}::${item.expectedSan}`
      if (mistakeSeen.has(key)) continue
      mistakeSeen.add(key)
      mergedMistakes.push(item)
      if (mergedMistakes.length >= MAX_MISTAKE_QUEUE) break
    }

    const useRemoteCounters = (remote.totalAttempts ?? 0) > local.totalAttempts
    state.value = {
      totalAttempts: useRemoteCounters ? remote.totalAttempts ?? 0 : local.totalAttempts,
      correctMoves: useRemoteCounters ? remote.correctMoves ?? 0 : local.correctMoves,
      streakDays: Math.max(local.streakDays, remote.streakDays ?? 0),
      lastPracticeDate: local.lastPracticeDate || remote.lastPracticeDate || null,
      masteredLineIds: mergedMastered,
      lineStats: mergedStats,
      customOpenings: Array.from(customMap.values()),
      mistakeQueue: mergedMistakes
    }
    saveToLocalStorage()
  }

  async function hydrateFromCloud() {
    if (typeof window === 'undefined') return
    cloudSyncStatus.value = 'syncing'
    try {
      const res = await $fetch<{
        ok: boolean
        exists: boolean
        progress: Partial<ChessProgressState> | null
      }>('/api/progress', {
        headers: getAtelierProfileHeaders()
      })

      if (!res?.ok) {
        cloudSyncStatus.value = 'offline'
        return
      }

      if (res.exists && res.progress) {
        const localHasMore =
          state.value.totalAttempts > (res.progress.totalAttempts ?? 0) ||
          state.value.customOpenings.length > (res.progress.customOpenings?.length ?? 0)
        mergeWithCloud(res.progress)
        if (localHasMore) {
          void pushProgressToCloud()
        } else {
          cloudSyncStatus.value = 'synced'
        }
      } else {
        const hasLocalData =
          state.value.totalAttempts > 0 ||
          state.value.masteredLineIds.length > 0 ||
          state.value.customOpenings.length > 0 ||
          state.value.mistakeQueue.length > 0
        if (hasLocalData) {
          void pushProgressToCloud()
        } else {
          cloudSyncStatus.value = 'synced'
        }
      }
    } catch {
      cloudSyncStatus.value = 'offline'
    }
  }

  function hydrateProgress() {
    if (hydrated.value || typeof window === 'undefined') return
    hydrated.value = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ChessProgressState>
        state.value = {
          totalAttempts: parsed.totalAttempts ?? 0,
          correctMoves: parsed.correctMoves ?? 0,
          streakDays: parsed.streakDays ?? 0,
          lastPracticeDate: parsed.lastPracticeDate ?? null,
          masteredLineIds: Array.isArray(parsed.masteredLineIds) ? parsed.masteredLineIds : [],
          lineStats: parsed.lineStats && typeof parsed.lineStats === 'object' ? parsed.lineStats : {},
          customOpenings: Array.isArray(parsed.customOpenings) ? parsed.customOpenings : [],
          mistakeQueue: Array.isArray(parsed.mistakeQueue)
            ? parsed.mistakeQueue.slice(0, MAX_MISTAKE_QUEUE)
            : []
        }
      }
    } catch {
      // Keep clean default state
    }
    void hydrateFromCloud()
  }

  function touchDailyStreak() {
    const today = getTodayIso()
    if (state.value.lastPracticeDate === today) return
    if (state.value.lastPracticeDate === getYesterdayIso()) {
      state.value.streakDays += 1
    } else {
      state.value.streakDays = 1
    }
    state.value.lastPracticeDate = today
  }

  function recordMoveResult(lineId: string, isCorrect: boolean) {
    touchDailyStreak()
    state.value.totalAttempts += 1
    if (isCorrect) state.value.correctMoves += 1

    const existing = state.value.lineStats[lineId] ?? {
      attempts: 0,
      correct: 0,
      completions: 0,
      lastPracticed: getTodayIso()
    }
    existing.attempts += 1
    if (isCorrect) existing.correct += 1
    existing.lastPracticed = getTodayIso()
    state.value.lineStats[lineId] = existing
    if (!lineId.startsWith('daily-') && !lineId.startsWith('puz-')) {
      markDailyRoutineTaskComplete('repertoire-drill')
    }
    persist()
  }

  function recordMistake(item: Omit<MistakeQueueItem, 'id' | 'createdAt'>) {
    const cleanFen = item.fen.trim()
    const cleanSan = item.expectedSan.trim()
    if (!cleanFen || !cleanSan) return

    // Deduplicate by fen + expectedSan, moving latest mistake to front
    const filtered = state.value.mistakeQueue.filter(
      (m) => !(m.fen === cleanFen && m.expectedSan === cleanSan)
    )

    const nextEntry: MistakeQueueItem = {
      id: `mst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: item.source,
      title: item.title,
      fen: cleanFen,
      expectedSan: cleanSan,
      side: item.side,
      createdAt: new Date().toISOString()
    }

    state.value.mistakeQueue = [nextEntry, ...filtered].slice(0, MAX_MISTAKE_QUEUE)
    persist()
  }

  function resolveMistake(id: string) {
    const before = state.value.mistakeQueue.length
    state.value.mistakeQueue = state.value.mistakeQueue.filter((m) => m.id !== id)
    if (state.value.mistakeQueue.length !== before) {
      persist()
    }
  }

  function markLineMastered(lineId: string) {
    touchDailyStreak()
    if (!state.value.masteredLineIds.includes(lineId)) {
      state.value.masteredLineIds = [...state.value.masteredLineIds, lineId]
    }
    const existing = state.value.lineStats[lineId] ?? {
      attempts: 0,
      correct: 0,
      completions: 0,
      lastPracticed: getTodayIso()
    }
    existing.completions += 1
    existing.lastPracticed = getTodayIso()
    state.value.lineStats[lineId] = existing
    persist()
  }

  function addCustomOpening(opening: OpeningModule) {
    state.value.customOpenings = [opening, ...state.value.customOpenings]
    persist()
  }

  function deleteCustomOpening(id: string) {
    state.value.customOpenings = state.value.customOpenings.filter((o) => o.id !== id)
    persist()
  }

  function resetAllProgress() {
    const custom = state.value.customOpenings
    state.value = {
      ...createInitialState(),
      customOpenings: custom
    }
    persist()
  }

  const allModules = computed<RepertoireModule[]>(() => [
    ...ALL_CURATED_MODULES,
    ...state.value.customOpenings
  ])

  const allOpenings = computed<OpeningModule[]>(() => [
    ...CURATED_OPENINGS,
    ...state.value.customOpenings
  ])

  const totalAvailableLines = computed<number>(() => {
    let count = 0
    for (const mod of allModules.value) {
      if (mod.category === 'opening') {
        count += mod.lines.length
      } else {
        count += mod.scenarios.length
      }
    }
    return count
  })

  const totalMasteredLines = computed<number>(() => state.value.masteredLineIds.length)

  const mistakeQueue = computed<MistakeQueueItem[]>(() => state.value.mistakeQueue)
  const mistakeCount = computed<number>(() => state.value.mistakeQueue.length)

  const overallAccuracy = computed<number>(() => {
    if (state.value.totalAttempts === 0) return 0
    return Math.round((state.value.correctMoves / state.value.totalAttempts) * 100)
  })

  function isLineMastered(lineId: string): boolean {
    return state.value.masteredLineIds.includes(lineId)
  }

  function getModuleProgress(mod: RepertoireModule): { mastered: number; total: number; percent: number } {
    const ids =
      mod.category === 'opening' ? mod.lines.map((l) => l.id) : mod.scenarios.map((s) => s.id)
    const mastered = ids.filter((id) => state.value.masteredLineIds.includes(id)).length
    const total = ids.length
    const percent = total > 0 ? Math.round((mastered / total) * 100) : 0
    return { mastered, total, percent }
  }

  function getQuickDrillRoute(): string {
    for (const op of allOpenings.value) {
      const hasUnmastered = op.lines.some((l) => !state.value.masteredLineIds.includes(l.id))
      if (hasUnmastered) return `/trainer/opening/${op.id}`
    }
    for (const eg of CURATED_ENDGAMES) {
      const hasUnmastered = eg.scenarios.some((s) => !state.value.masteredLineIds.includes(s.id))
      if (hasUnmastered) return `/trainer/endgame/${eg.id}`
    }
    return `/trainer/opening/${CURATED_OPENINGS[0]!.id}`
  }

  return {
    progress: state,
    isHydrated: hydrated,
    cloudSyncStatus,
    allModules,
    allOpenings,
    totalAvailableLines,
    totalMasteredLines,
    overallAccuracy,
    mistakeQueue,
    mistakeCount,
    hydrateProgress,
    recordMoveResult,
    recordMistake,
    resolveMistake,
    markLineMastered,
    addCustomOpening,
    deleteCustomOpening,
    resetAllProgress,
    isLineMastered,
    getModuleProgress,
    getQuickDrillRoute
  }
}
