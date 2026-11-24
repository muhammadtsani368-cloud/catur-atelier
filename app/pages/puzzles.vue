<script setup lang="ts">
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import type { Component } from 'vue'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Heart,
  Infinity as InfinityIcon,
  Lightbulb,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Trophy,
  XCircle,
  Zap
} from 'lucide-vue-next'
import {
  BATTLE_RIVALS,
  PUZZLE_THEMES,
  type BattleRivalProfile,
  type PuzzleModeKey,
  type PuzzleThemeKey,
  type TacticalPuzzleItem
} from '~/utils/puzzleBank'
import {
  generateDailyAutoPuzzle,
  generateUniquePuzzle,
  loadSeenPuzzleKeys,
  normalizeFenKey,
  saveSeenPuzzleKeys
} from '~/utils/puzzleGenerator'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

const PUZZLE_STATS_KEY = 'grandmaster_atelier_puzzle_rating_v1'

interface StoredPuzzleStats {
  rating: number
  lastDelta: number
  bestRushScore: number
  dailyCompletedDate: string | null
  dailyStreak: number
  totalSolvedCount: number
  sequenceCounter: number
}

interface SessionPuzzleEntry {
  puzzle: TacticalPuzzleItem
  status: 'pending' | 'ok' | 'fail'
}

const { recordMoveResult, recordMistake, mistakeCount } = useChessProgress()
const { isMuted } = useTheme()

// Mode state (Default: "Tidak Terbatas")
const activeMode = ref<PuzzleModeKey>('unlimited')

const modeTabs: Array<{ key: PuzzleModeKey; label: string; icon: Component }> = [
  { key: 'daily', label: 'Teka-Teki Harian', icon: Calendar },
  { key: 'unlimited', label: 'Tidak Terbatas', icon: InfinityIcon },
  { key: 'rush', label: 'Teka-Teki Gegas', icon: Zap },
  { key: 'battle', label: 'Duel Teka-Teki', icon: Swords },
  { key: 'custom', label: 'Teka-Teki Custom', icon: SlidersHorizontal }
]

// Persistent Puzzle Rating, Sequence & Anti-Repeat Memory
const puzzleRating = ref(1420)
const lastRatingDelta = ref(14)
const bestRushScore = ref(0)
const dailyCompletedDate = ref<string | null>(null)
const dailyStreak = ref(0)
const totalSolvedCount = ref(0)
const sequenceCounter = ref(1)
const seenPuzzleKeys = new Set<string>()
const totalSeenCount = ref(0)

function getTodayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayFormattedId = computed(() => {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date())
  } catch {
    return getTodayIso()
  }
})

const isDailySolvedToday = computed(() => dailyCompletedDate.value === getTodayIso())

function persistPuzzleStats() {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredPuzzleStats = {
      rating: puzzleRating.value,
      lastDelta: lastRatingDelta.value,
      bestRushScore: bestRushScore.value,
      dailyCompletedDate: dailyCompletedDate.value,
      dailyStreak: dailyStreak.value,
      totalSolvedCount: totalSolvedCount.value,
      sequenceCounter: sequenceCounter.value
    }
    localStorage.setItem(PUZZLE_STATS_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota errors
  }
}

function hydratePuzzleStats() {
  if (typeof window === 'undefined') return
  const loadedSeen = loadSeenPuzzleKeys()
  for (const key of loadedSeen) seenPuzzleKeys.add(key)
  totalSeenCount.value = seenPuzzleKeys.size

  try {
    const raw = localStorage.getItem(PUZZLE_STATS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<StoredPuzzleStats>
    if (typeof parsed.rating === 'number' && Number.isFinite(parsed.rating)) {
      puzzleRating.value = parsed.rating
    }
    if (typeof parsed.lastDelta === 'number' && Number.isFinite(parsed.lastDelta)) {
      lastRatingDelta.value = parsed.lastDelta
    }
    if (typeof parsed.bestRushScore === 'number') bestRushScore.value = parsed.bestRushScore
    if (typeof parsed.dailyCompletedDate === 'string') {
      dailyCompletedDate.value = parsed.dailyCompletedDate
    }
    if (typeof parsed.dailyStreak === 'number') dailyStreak.value = parsed.dailyStreak
    if (typeof parsed.totalSolvedCount === 'number') {
      totalSolvedCount.value = parsed.totalSolvedCount
    }
    if (typeof parsed.sequenceCounter === 'number' && parsed.sequenceCounter >= 1) {
      sequenceCounter.value = parsed.sequenceCounter
    }
  } catch {
    // Keep clean defaults
  }
}

function markPuzzleAsSeen(puzzle: TacticalPuzzleItem) {
  const key = normalizeFenKey(puzzle.fen)
  if (!seenPuzzleKeys.has(key)) {
    seenPuzzleKeys.add(key)
    totalSeenCount.value = seenPuzzleKeys.size
    saveSeenPuzzleKeys(seenPuzzleKeys)
  }
}

// Custom Mode Filters
const customThemes = ref<PuzzleThemeKey[]>(['Skakmat', 'Garpu', 'Pin', 'Pengorbanan', 'Babak Akhir'])
const customMinElo = ref(850)
const customMaxElo = ref(2150)

function toggleCustomTheme(theme: PuzzleThemeKey) {
  if (customThemes.value.includes(theme)) {
    if (customThemes.value.length > 1) {
      customThemes.value = customThemes.value.filter((t) => t !== theme)
    }
  } else {
    customThemes.value = [...customThemes.value, theme]
  }
}

function resetCustomFilters() {
  customThemes.value = ['Skakmat', 'Garpu', 'Pin', 'Pengorbanan', 'Babak Akhir']
  customMinElo.value = 850
  customMaxElo.value = 2150
}

// Rush Mode State (Teka-Teki Gegas: 3 minutes, 3 lives)
const RUSH_DURATION_SEC = 180
const rushActive = ref(false)
const rushFinished = ref(false)
const rushTimeLeft = ref(RUSH_DURATION_SEC)
const rushLives = ref(3)
const rushScore = ref(0)
const rushHistory = ref<Array<'ok' | 'fail'>>([])

// Battle Mode State (Duel Teka-Teki: 3 minutes vs AI Rival)
const BATTLE_DURATION_SEC = 180
const selectedRivalId = ref<string>(BATTLE_RIVALS[1]!.id)
const selectedRival = computed<BattleRivalProfile>(
  () => BATTLE_RIVALS.find((r) => r.id === selectedRivalId.value) ?? BATTLE_RIVALS[1]!
)
const battleActive = ref(false)
const battleFinished = ref(false)
const battleTimeLeft = ref(BATTLE_DURATION_SEC)
const battleUserScore = ref(0)
const battleUserStrikes = ref(0)
const battleRivalScore = ref(0)

const battleOutcome = computed<'win' | 'draw' | 'lose'>(() => {
  if (battleUserScore.value > battleRivalScore.value) return 'win'
  if (battleUserScore.value < battleRivalScore.value) return 'lose'
  return 'draw'
})

let modeTimer: ReturnType<typeof setInterval> | null = null
let rivalProgressAccum = 0

function stopModeTimer() {
  if (modeTimer) {
    clearInterval(modeTimer)
    modeTimer = null
  }
}

// Session Stats & Auto-Generated Session Trail (Unlimited / Custom)
const sessionStreak = ref(0)
const sessionSolved = ref(0)
const sessionAttempts = ref(0)
const sessionTrail = ref<SessionPuzzleEntry[]>([])
const activeTrailIdx = ref(0)

const sessionAccuracy = computed(() => {
  if (sessionAttempts.value === 0) return 100
  return Math.round((sessionSolved.value / sessionAttempts.value) * 100)
})

// SSR-safe deterministic initial puzzle so hydration never mismatches
const initialSsrPuzzle = generateUniquePuzzle({
  seed: 20261124,
  themes: ['Garpu'],
  minElo: 1200,
  maxElo: 1550,
  sequenceNumber: 1
})

const currentPuzzle = ref<TacticalPuzzleItem>(initialSsrPuzzle)

// Live Board State
const boardFen = ref(currentPuzzle.value.fen)
const lastMove = ref<{ from: string; to: string } | null>(null)
const solved = ref(false)
const hadMistakeOnCurrent = ref(false)
const correctSquare = ref<string | null>(null)
const errorSquare = ref<string | null>(null)
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)
const shake = ref(false)
const feedbackTone = ref<'neutral' | 'success' | 'error'>('neutral')
const feedbackText = ref(currentPuzzle.value.prompt)

let shakeTimer: ReturnType<typeof setTimeout> | null = null
let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null

const isBoardLocked = computed(() => {
  if (solved.value) return true
  if (activeMode.value === 'rush' && (!rushActive.value || rushFinished.value)) return true
  if (activeMode.value === 'battle' && (!battleActive.value || battleFinished.value)) return true
  return false
})

function applyPuzzleToBoard(p: TacticalPuzzleItem) {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = null
  }
  currentPuzzle.value = p
  boardFen.value = p.fen
  lastMove.value = null
  solved.value = false
  hadMistakeOnCurrent.value = false
  correctSquare.value = null
  errorSquare.value = null
  hintFrom.value = null
  hintTo.value = null
  shake.value = false
  feedbackTone.value = 'neutral'
  feedbackText.value = p.prompt
}

function loadCurrentPuzzle() {
  applyPuzzleToBoard(currentPuzzle.value)
}

function spawnNextAutoPuzzle(mode: PuzzleModeKey = activeMode.value, recordInTrail = true) {
  let generated: TacticalPuzzleItem

  if (mode === 'daily') {
    generated = generateDailyAutoPuzzle()
  } else {
    const seq = sequenceCounter.value
    sequenceCounter.value += 1

    if (mode === 'custom') {
      generated = generateUniquePuzzle({
        themes: customThemes.value,
        minElo: customMinElo.value,
        maxElo: customMaxElo.value,
        seenKeys: seenPuzzleKeys,
        sequenceNumber: seq
      })
    } else if (mode === 'rush') {
      const targetMin = Math.min(1800, 850 + rushScore.value * 70)
      const targetMax = Math.min(2150, 1150 + rushScore.value * 95)
      generated = generateUniquePuzzle({
        minElo: targetMin,
        maxElo: targetMax,
        seenKeys: seenPuzzleKeys,
        sequenceNumber: seq
      })
    } else if (mode === 'battle') {
      const rivalElo = selectedRival.value.elo
      generated = generateUniquePuzzle({
        minElo: Math.max(850, rivalElo - 300),
        maxElo: Math.min(2150, rivalElo + 250),
        seenKeys: seenPuzzleKeys,
        sequenceNumber: seq
      })
    } else {
      // Adaptive Unlimited Mode calibrated to live puzzleRating
      generated = generateUniquePuzzle({
        minElo: Math.max(850, puzzleRating.value - 260),
        maxElo: Math.min(2150, puzzleRating.value + 260),
        seenKeys: seenPuzzleKeys,
        sequenceNumber: seq
      })
    }

    markPuzzleAsSeen(generated)
    persistPuzzleStats()
  }

  if (recordInTrail && (mode === 'unlimited' || mode === 'custom')) {
    const nextTrail = [...sessionTrail.value, { puzzle: generated, status: 'pending' as const }].slice(-18)
    sessionTrail.value = nextTrail
    activeTrailIdx.value = nextTrail.length - 1
  }

  applyPuzzleToBoard(generated)
}

function selectTrailEntry(idx: number) {
  const entry = sessionTrail.value[idx]
  if (!entry) return
  activeTrailIdx.value = idx
  applyPuzzleToBoard(entry.puzzle)
}

function updateActiveTrailStatus(status: 'ok' | 'fail') {
  const entry = sessionTrail.value[activeTrailIdx.value]
  if (!entry || entry.puzzle.id !== currentPuzzle.value.id) return
  if (entry.status === 'pending') {
    entry.status = status
  }
}

function switchMode(mode: PuzzleModeKey) {
  if (activeMode.value === mode) return
  stopModeTimer()
  rushActive.value = false
  rushFinished.value = false
  battleActive.value = false
  battleFinished.value = false
  activeMode.value = mode
  if (mode === 'unlimited' || mode === 'custom') {
    sessionTrail.value = []
    activeTrailIdx.value = 0
  }
  spawnNextAutoPuzzle(mode, mode === 'unlimited' || mode === 'custom')
}

function nextPuzzle() {
  if (activeMode.value === 'daily') {
    loadCurrentPuzzle()
    return
  }
  spawnNextAutoPuzzle(activeMode.value, activeMode.value === 'unlimited' || activeMode.value === 'custom')
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function startRushRun() {
  stopModeTimer()
  rushActive.value = true
  rushFinished.value = false
  rushTimeLeft.value = RUSH_DURATION_SEC
  rushLives.value = 3
  rushScore.value = 0
  rushHistory.value = []
  spawnNextAutoPuzzle('rush', false)

  modeTimer = setInterval(() => {
    rushTimeLeft.value = Math.max(0, rushTimeLeft.value - 1)
    if (rushTimeLeft.value === 0) {
      finishRushRun()
    }
  }, 1000)
}

function finishRushRun() {
  stopModeTimer()
  rushActive.value = false
  rushFinished.value = true
  if (rushScore.value > bestRushScore.value) {
    bestRushScore.value = rushScore.value
    persistPuzzleStats()
  }
  playSuccessChime(isMuted.value)
}

function startBattleRun() {
  stopModeTimer()
  battleActive.value = true
  battleFinished.value = false
  battleTimeLeft.value = BATTLE_DURATION_SEC
  battleUserScore.value = 0
  battleUserStrikes.value = 0
  battleRivalScore.value = 0
  rivalProgressAccum = 0
  spawnNextAutoPuzzle('battle', false)

  modeTimer = setInterval(() => {
    battleTimeLeft.value = Math.max(0, battleTimeLeft.value - 1)
    rivalProgressAccum += 1
    const pace = selectedRival.value.avgSecondsPerSolve
    if (rivalProgressAccum >= pace) {
      rivalProgressAccum = 0
      if (Math.random() < 0.85) {
        battleRivalScore.value += 1
      }
    }
    if (battleTimeLeft.value === 0) {
      finishBattleRun()
    }
  }, 1000)
}

function finishBattleRun() {
  stopModeTimer()
  battleActive.value = false
  battleFinished.value = true
  if (battleOutcome.value === 'win') {
    playSuccessChime(isMuted.value)
  } else {
    playErrorSound(isMuted.value)
  }
}

function showHint() {
  if (isBoardLocked.value) return
  try {
    const g = new Chess(currentPuzzle.value.fen)
    const m = g.move(currentPuzzle.value.solutionSan)
    hintFrom.value = m.from
    hintTo.value = m.to
    feedbackTone.value = 'neutral'
    feedbackText.value = `Petunjuk: ${currentPuzzle.value.hint}`
  } catch {
    // Ignore
  }
}

function updateRatedScore(isCorrect: boolean, puzzleElo: number) {
  const expected = 1 / (1 + Math.pow(10, (puzzleElo - puzzleRating.value) / 400))
  const k = 28
  const rawDelta = Math.round(k * ((isCorrect ? 1 : 0) - expected))
  const delta = isCorrect ? Math.max(6, rawDelta) : Math.min(-6, rawDelta)
  puzzleRating.value = Math.max(600, Math.min(2800, puzzleRating.value + delta))
  lastRatingDelta.value = delta
  persistPuzzleStats()
}

function handlePuzzleMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (isBoardLocked.value) return
  const p = currentPuzzle.value
  const g = new Chess(p.fen)
  let played
  try {
    played = g.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q'
    })
  } catch {
    return
  }

  if (played.san === p.solutionSan) {
    boardFen.value = g.fen()
    lastMove.value = { from: played.from, to: played.to }
    solved.value = true
    correctSquare.value = played.to
    errorSquare.value = null
    hintFrom.value = null
    hintTo.value = null
    feedbackTone.value = 'success'
    feedbackText.value = p.explanation

    totalSolvedCount.value += 1
    recordMoveResult(p.id, true)

    if (played.san.includes('#') || played.san.includes('+')) playCheckSound(isMuted.value)
    else if (played.captured) playWoodenCapture(isMuted.value)
    else playWoodenMove(isMuted.value)

    if (activeMode.value === 'daily') {
      const today = getTodayIso()
      if (dailyCompletedDate.value !== today) {
        dailyCompletedDate.value = today
        dailyStreak.value += 1
        if (!hadMistakeOnCurrent.value) updateRatedScore(true, p.rating)
      }
      persistPuzzleStats()
      setTimeout(() => playSuccessChime(isMuted.value), 160)
    } else if (activeMode.value === 'unlimited' || activeMode.value === 'custom') {
      sessionAttempts.value += 1
      sessionSolved.value += 1
      sessionStreak.value += 1
      updateActiveTrailStatus(hadMistakeOnCurrent.value ? 'fail' : 'ok')
      if (!hadMistakeOnCurrent.value && activeMode.value === 'unlimited') {
        updateRatedScore(true, p.rating)
      } else {
        persistPuzzleStats()
      }
      setTimeout(() => playSuccessChime(isMuted.value), 160)
    } else if (activeMode.value === 'rush') {
      rushScore.value += 1
      rushHistory.value = [...rushHistory.value, 'ok']
      autoAdvanceTimer = setTimeout(() => {
        if (rushActive.value) nextPuzzle()
      }, 520)
    } else if (activeMode.value === 'battle') {
      battleUserScore.value += 1
      autoAdvanceTimer = setTimeout(() => {
        if (battleActive.value) nextPuzzle()
      }, 520)
    }
  } else {
    hadMistakeOnCurrent.value = true
    recordMoveResult(p.id, false)
    recordMistake({
      source: 'daily',
      title: p.title,
      fen: p.fen,
      expectedSan: p.solutionSan,
      side: p.side
    })
    playErrorSound(isMuted.value)
    errorSquare.value = payload.to
    feedbackTone.value = 'error'
    feedbackText.value = `${played.san} belum tepat. ${p.hint}`
    shake.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shake.value = false
    }, 360)

    if (activeMode.value === 'unlimited') {
      sessionAttempts.value += 1
      sessionStreak.value = 0
      updateActiveTrailStatus('fail')
      updateRatedScore(false, p.rating)
    } else if (activeMode.value === 'custom') {
      sessionAttempts.value += 1
      sessionStreak.value = 0
      updateActiveTrailStatus('fail')
    } else if (activeMode.value === 'rush') {
      rushLives.value = Math.max(0, rushLives.value - 1)
      rushHistory.value = [...rushHistory.value, 'fail']
      if (rushLives.value === 0) {
        finishRushRun()
      } else {
        autoAdvanceTimer = setTimeout(() => {
          if (rushActive.value) nextPuzzle()
        }, 700)
      }
    } else if (activeMode.value === 'battle') {
      battleUserStrikes.value += 1
      if (battleUserStrikes.value >= 3) {
        finishBattleRun()
      } else {
        autoAdvanceTimer = setTimeout(() => {
          if (battleActive.value) nextPuzzle()
        }, 700)
      }
    }
  }
}

watch([customThemes, customMinElo, customMaxElo], () => {
  if (activeMode.value === 'custom') {
    spawnNextAutoPuzzle('custom', true)
  }
})

onMounted(() => {
  hydratePuzzleStats()
  // Always generate a fresh unseen puzzle on client mount so reloads never repeat!
  spawnNextAutoPuzzle(activeMode.value, true)
})

onBeforeUnmount(() => {
  stopModeTimer()
  if (shakeTimer) clearTimeout(shakeTimer)
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Editorial Header & Live Puzzle Rating Badge -->
    <section class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[#526857] dark:text-[#9DB5A1]"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#526857] dark:bg-[#9DB5A1]" aria-hidden="true" />
            <span>STUDIO TAKTIK &amp; KETAJAMAN</span>
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] uppercase tracking-[0.1em] font-semibold bg-[#526857]/12 text-[#3B5240] dark:text-[#A4CBB3] border border-[#526857]/25"
          >
            <Sparkles class="w-3 h-3" />
            <span>Auto-Generate · Anti-Ulang</span>
          </span>
        </div>
        <h1
          class="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#202321] dark:text-[#F4F3EE]"
        >
          Teka-Teki Catur
        </h1>
      </div>

      <!-- Live Puzzle Rating Pill -->
      <div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
        <div
          class="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_18px_-12px_rgba(32,35,33,0.16)] dark:shadow-none"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="lastRatingDelta >= 0 ? 'bg-[#526857] dark:bg-[#9DB5A1]' : 'bg-[#B85D43]'"
            aria-hidden="true"
          />
          <span class="font-mono text-xs font-semibold tracking-[0.04em] text-[#202321] dark:text-zinc-100">
            RATING TEKA-TEKI:
            <strong class="font-bold">{{ puzzleRating }}</strong>
            <span
              class="ml-1"
              :class="
                lastRatingDelta >= 0
                  ? 'text-[#526857] dark:text-[#9DB5A1]'
                  : 'text-[#B85D43] dark:text-[#E8987E]'
              "
            >
              ({{ lastRatingDelta >= 0 ? `+${lastRatingDelta}` : lastRatingDelta }})
            </span>
          </span>
        </div>

        <NuxtLink
          v-if="mistakeCount > 0"
          to="/dashboard"
          class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-[#B85D43]/35 bg-[#B85D43]/10 text-[#9B4830] dark:text-[#F2AE98] hover:bg-[#B85D43] hover:text-white transition active:scale-[0.98]"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Perlu Diulang ({{ mistakeCount }})</span>
        </NuxtLink>
      </div>
    </section>

    <!-- 5-Mode Horizontal Segmented Pill Switcher -->
    <div
      class="w-full overflow-x-auto pb-1"
      role="tablist"
      aria-label="Pilih mode teka-teki catur"
    >
      <div
        class="inline-flex min-w-full sm:min-w-0 items-center gap-1 p-1.5 rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-14px_rgba(32,35,33,0.14)] dark:shadow-none"
      >
        <button
          v-for="tab in modeTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeMode === tab.key"
          class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
          :class="
            activeMode === tab.key
              ? 'bg-[#141416] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#141416] shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100 hover:bg-[#F7F5F0] dark:hover:bg-zinc-800/70'
          "
          @click="switchMode(tab.key)"
        >
          <component
            :is="tab.icon"
            class="w-3.5 h-3.5 shrink-0"
            :class="tab.key === 'rush' && activeMode !== 'rush' ? 'text-[#C59B46]' : ''"
          />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Main 2-Column Workspace (62% Left / 38% Right -> 7 / 5 on 12-col grid) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <!-- LEFT COLUMN: Board-First Focus -->
      <div class="lg:col-span-7 space-y-3.5">
        <!-- Top Metadata Bar Above Board -->
        <div
          class="max-w-[560px] mx-auto flex flex-wrap items-center justify-between gap-2 px-1"
        >
          <div class="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold text-zinc-600 dark:text-zinc-400">
            <span class="text-[#202321] dark:text-zinc-100">SOAL #{{ currentPuzzle.number }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ currentPuzzle.theme.toUpperCase() }} ({{ currentPuzzle.themeSubtitle }})</span>
            <span aria-hidden="true">·</span>
            <span class="text-[#526857] dark:text-[#9DB5A1]">{{ currentPuzzle.rating }} ELO</span>
          </div>

          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] text-[11px] font-semibold text-[#202321] dark:text-zinc-200"
          >
            <span
              class="w-2.5 h-2.5 rounded-full border"
              :class="
                currentPuzzle.side === 'w'
                  ? 'bg-[#F7F5F0] border-zinc-400'
                  : 'bg-[#141416] border-zinc-600'
              "
              aria-hidden="true"
            />
            <span>Giliran {{ currentPuzzle.side === 'w' ? 'Putih' : 'Hitam' }} Melangkah</span>
          </div>
        </div>

        <!-- Museum-Framed ChessBoard with Timed Start Overlay for Rush / Battle -->
        <div class="relative max-w-[560px] mx-auto">
          <ChessBoard
            :fen="boardFen"
            :orientation="currentPuzzle.side"
            :interactive="!isBoardLocked"
            :allowed-color="currentPuzzle.side"
            :last-move="lastMove"
            :correct-square="correctSquare"
            :error-square="errorSquare"
            :hint-from="hintFrom"
            :hint-to="hintTo"
            :shake="shake"
            @move="handlePuzzleMove"
          />

          <!-- Timed Mode Ready/Result Overlay (Rush or Battle) -->
          <div
            v-if="
              (activeMode === 'rush' && !rushActive) ||
              (activeMode === 'battle' && !battleActive)
            "
            class="absolute inset-x-2 top-2 bottom-10 z-30 rounded-2xl bg-[#141416]/78 backdrop-blur-[3px] flex items-center justify-center p-6 text-center"
          >
            <div
              class="max-w-xs w-full rounded-2xl border border-white/15 bg-[#1B1D1B] text-[#F7F5F0] p-6 space-y-4 shadow-2xl"
            >
              <template v-if="activeMode === 'rush'">
                <div class="w-11 h-11 rounded-2xl bg-[#C59B46]/20 border border-[#C59B46]/40 text-[#E5C170] flex items-center justify-center mx-auto">
                  <Zap class="w-5 h-5" />
                </div>
                <div class="space-y-1">
                  <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#E5C170]">
                    {{ rushFinished ? 'SESI GEGAS SELESAI' : 'AUTO-GENERATE · 3 MENIT' }}
                  </span>
                  <h3 class="font-serif text-2xl font-semibold">
                    {{ rushFinished ? `Skor Anda: ${rushScore}` : 'Teka-Teki Gegas' }}
                  </h3>
                  <p class="text-xs text-zinc-300 leading-relaxed">
                    {{
                      rushFinished
                        ? `Rekor terbaik Anda saat ini ${bestRushScore} soal benar.`
                        : 'Soal baru dibuat otomatis tanpa pernah mengulang! Selesaikan sebanyak mungkin dalam 3 menit (maksimal 3 salah).'
                    }}
                  </p>
                </div>
                <button
                  type="button"
                  class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#F7F5F0] text-[#141416] hover:bg-white active:scale-[0.98] transition cursor-pointer"
                  @click="startRushRun"
                >
                  <Play class="w-3.5 h-3.5" />
                  <span>{{ rushFinished ? 'Main Gegas Lagi' : 'Mulai Teka-Teki Gegas' }}</span>
                </button>
              </template>

              <template v-else>
                <div class="w-11 h-11 rounded-2xl bg-[#526857]/30 border border-[#718675]/50 text-[#A4CBB3] flex items-center justify-center mx-auto">
                  <Swords class="w-5 h-5" />
                </div>
                <div class="space-y-1">
                  <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#A4CBB3]">
                    {{
                      battleFinished
                        ? battleOutcome === 'win'
                          ? 'KEMENANGAN DUEL'
                          : battleOutcome === 'draw'
                            ? 'DUEL IMBANG'
                            : 'DUEL BERAKHIR'
                        : `TANTANGAN 3 MENIT · ${selectedRival.elo} ELO`
                    }}
                  </span>
                  <h3 class="font-serif text-2xl font-semibold">
                    {{
                      battleFinished
                        ? `Anda ${battleUserScore} — ${battleRivalScore} ${selectedRival.name}`
                        : `Duel vs ${selectedRival.name}`
                    }}
                  </h3>
                  <p class="text-xs text-zinc-300 leading-relaxed">
                    {{
                      battleFinished
                        ? battleOutcome === 'win'
                          ? 'Insting taktis Anda lebih cepat dan tajam dari lawan!'
                          : 'Tanding ulang atau pilih rival lain di panel kanan.'
                        : 'Adu kecepatan memecahkan soal otomatis yang selalu baru selama 3 menit.'
                    }}
                  </p>
                </div>
                <button
                  type="button"
                  class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#F7F5F0] text-[#141416] hover:bg-white active:scale-[0.98] transition cursor-pointer"
                  @click="startBattleRun"
                >
                  <Play class="w-3.5 h-3.5" />
                  <span>{{ battleFinished ? 'Tanding Ulang' : 'Mulai Duel Sekarang' }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Bottom Action Bar Below Board -->
        <div
          class="max-w-[560px] mx-auto flex flex-wrap items-center justify-between gap-2.5 pt-1"
        >
          <div class="flex items-center gap-2">
            <!-- Petunjuk (Outline) -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold border border-[#E4DFD5] dark:border-zinc-700 bg-white dark:bg-[#19191D] text-[#202321] dark:text-zinc-200 hover:border-[#718675] disabled:opacity-45 active:scale-[0.98] transition cursor-pointer"
              :disabled="isBoardLocked || activeMode === 'rush' || activeMode === 'battle'"
              @click="showHint"
            >
              <Lightbulb class="w-3.5 h-3.5 text-[#C59B46]" />
              <span>Petunjuk</span>
            </button>

            <!-- Ulangi (Ghost) -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100 hover:bg-[#EDEAE0]/70 dark:hover:bg-zinc-800/70 disabled:opacity-40 active:scale-[0.98] transition cursor-pointer"
              :disabled="(activeMode === 'rush' && rushActive) || (activeMode === 'battle' && battleActive)"
              @click="loadCurrentPuzzle"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Ulangi</span>
            </button>
          </div>

          <!-- Soal Berikutnya -> (Primary Obsidian Pill: always auto-generates a new unseen puzzle!) -->
          <button
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#141416] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#141416] hover:opacity-92 disabled:opacity-45 active:scale-[0.98] transition shadow-sm cursor-pointer"
            :disabled="activeMode === 'daily' || (activeMode === 'rush' && !rushActive) || (activeMode === 'battle' && !battleActive)"
            @click="nextPuzzle"
          >
            <span>Soal Berikutnya</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- RIGHT COLUMN: Editorial Tactical Control Sheet & Mode Telemetry -->
      <div class="lg:col-span-5 space-y-4">
        <!-- 1. MODE-SPECIFIC TELEMETRY CARD -->

        <!-- A. Teka-Teki Harian -->
        <div
          v-if="activeMode === 'daily'"
          class="surface-tactile-card rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-4"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 block">
                EDISI HARIAN OTOMATIS
              </span>
              <p class="font-serif text-lg font-semibold text-[#202321] dark:text-zinc-100 capitalize">
                {{ todayFormattedId }}
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold"
              :class="
                isDailySolvedToday
                  ? 'bg-[#526857]/15 text-[#3B5240] dark:text-[#A4CBB3]'
                  : 'bg-[#C59B46]/15 text-[#8E6D28] dark:text-[#E8C678]'
              "
            >
              <CheckCircle2 v-if="isDailySolvedToday" class="w-3.5 h-3.5" />
              <Flame v-else class="w-3.5 h-3.5" />
              <span>{{ isDailySolvedToday ? 'Selesai' : 'Aktif' }}</span>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 p-3">
              <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 block">Streak Harian</span>
              <span class="font-serif text-xl font-semibold text-[#202321] dark:text-zinc-100">
                {{ dailyStreak }} Hari
              </span>
            </div>
            <div class="rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 p-3">
              <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 block">Tingkat Soal</span>
              <span class="font-serif text-xl font-semibold text-[#526857] dark:text-[#9DB5A1]">
                {{ currentPuzzle.rating }} ELO
              </span>
            </div>
          </div>

          <button
            v-if="solved"
            type="button"
            class="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#526857] text-white hover:bg-[#435648] transition cursor-pointer"
            @click="switchMode('unlimited')"
          >
            <span>Lanjut ke Mode Tidak Terbatas</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- B. Tidak Terbatas (Default) -->
        <div
          v-else-if="activeMode === 'unlimited'"
          class="surface-tactile-card rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 dark:text-zinc-400">
              TELEMETRI SESI TIDAK TERBATAS
            </span>
            <span class="font-mono text-[11px] font-semibold text-[#526857] dark:text-[#9DB5A1]">
              {{ totalSeenCount }} Soal Unik
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div class="rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 p-3">
              <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block">Beruntun</span>
              <span class="font-serif text-xl font-semibold text-[#202321] dark:text-zinc-100">
                {{ sessionStreak }}
              </span>
            </div>
            <div class="rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 p-3">
              <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block">Akurasi</span>
              <span class="font-serif text-xl font-semibold text-[#526857] dark:text-[#9DB5A1]">
                {{ sessionAccuracy }}%
              </span>
            </div>
            <div class="rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 p-3">
              <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block">Tuntas</span>
              <span class="font-serif text-xl font-semibold text-[#202321] dark:text-zinc-100">
                {{ totalSolvedCount }}
              </span>
            </div>
          </div>

          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Tingkat kesulitan otomatis menyesuaikan rating Anda ({{ Math.max(850, puzzleRating - 260) }}–{{ Math.min(2150, puzzleRating + 260) }} ELO) dan setiap posisi dijamin baru.
          </p>
        </div>

        <!-- C. Teka-Teki Gegas (Puzzle Rush) -->
        <div
          v-else-if="activeMode === 'rush'"
          class="rounded-2xl border border-[#2B2D2B] bg-[#141416] text-[#F7F5F0] p-5 space-y-4 shadow-lg"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <Zap class="w-4 h-4 text-[#C59B46]" />
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] font-semibold text-[#E5C170]">
                TEKA-TEKI GEGAS
              </span>
            </div>
            <span class="font-mono text-xs text-zinc-400">
              Rekor: <strong class="text-white">{{ bestRushScore }}</strong>
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2.5 text-center">
            <div class="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block">Waktu</span>
              <span
                class="font-mono text-xl font-bold tabular-nums"
                :class="rushTimeLeft <= 20 && rushActive ? 'text-[#E8856B] animate-pulse' : 'text-white'"
              >
                {{ formatClock(rushTimeLeft) }}
              </span>
            </div>
            <div class="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block">Skor</span>
              <span class="font-mono text-xl font-bold text-[#9DB5A1]">{{ rushScore }}</span>
            </div>
            <div class="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block">Nyawa</span>
              <div class="flex items-center justify-center gap-1 mt-1">
                <Heart
                  v-for="n in 3"
                  :key="n"
                  class="w-4 h-4 transition"
                  :class="n <= rushLives ? 'text-[#B85D43] fill-[#B85D43]' : 'text-zinc-700'"
                />
              </div>
            </div>
          </div>

          <div v-if="rushHistory.length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="(res, idx) in rushHistory"
              :key="idx"
              class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
              :class="res === 'ok' ? 'bg-[#526857] text-white' : 'bg-[#B85D43] text-white'"
            >
              {{ res === 'ok' ? '✓' : '✕' }}
            </span>
          </div>

          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#F7F5F0] text-[#141416] hover:bg-white transition cursor-pointer"
            @click="startRushRun"
          >
            <Play class="w-3.5 h-3.5" />
            <span>{{ rushActive ? 'Ulangi Sesi Gegas' : 'Mulai Sesi 3 Menit' }}</span>
          </button>
        </div>

        <!-- D. Duel Teka-Teki (Puzzle Battle) -->
        <div
          v-else-if="activeMode === 'battle'"
          class="surface-tactile-card rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-[#526857] dark:text-[#9DB5A1]">
              DUEL HEAD-TO-HEAD
            </span>
            <span class="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#141416] text-white dark:bg-[#EDEAE0] dark:text-[#141416]">
              <Clock class="w-3 h-3" />
              <span>{{ formatClock(battleTimeLeft) }}</span>
            </span>
          </div>

          <div v-if="!battleActive" class="space-y-1.5">
            <span class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
              Pilih Lawan Duel:
            </span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="r in BATTLE_RIVALS"
                :key="r.id"
                type="button"
                class="p-2 rounded-xl border text-left transition cursor-pointer"
                :class="
                  selectedRivalId === r.id
                    ? 'bg-[#141416] text-[#F7F5F0] border-[#141416] dark:bg-[#EDEAE0] dark:text-[#141416]'
                    : 'bg-[#F7F5F0] dark:bg-zinc-900 border-[#E4DFD5] dark:border-zinc-800 text-[#202321] dark:text-zinc-200 hover:border-[#718675]'
                "
                @click="selectedRivalId = r.id"
              >
                <span class="block text-[11px] font-bold truncate">{{ r.name.split(' ')[0] }}</span>
                <span class="block font-mono text-[10px] opacity-75">{{ r.elo }} ELO</span>
              </button>
            </div>
          </div>

          <div class="rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 p-3.5 space-y-2.5">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-[#526857] dark:text-[#9DB5A1]">Anda ({{ battleUserScore }})</span>
              <span class="font-mono text-[10px] text-zinc-500">
                Kesalahan: {{ battleUserStrikes }}/3
              </span>
              <span class="text-[#B85D43] dark:text-[#E8987E]">{{ selectedRival.name.split(' ')[0] }} ({{ battleRivalScore }})</span>
            </div>
            <div class="h-2.5 rounded-full bg-[#E4DFD5] dark:bg-zinc-800 overflow-hidden flex">
              <div
                class="bg-[#526857] transition-all duration-300"
                :style="{
                  width: `${
                    battleUserScore + battleRivalScore === 0
                      ? 50
                      : Math.round((battleUserScore / (battleUserScore + battleRivalScore)) * 100)
                  }%`
                }"
              />
              <div class="flex-1 bg-[#B85D43]" />
            </div>
          </div>

          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#141416] text-white dark:bg-[#EDEAE0] dark:text-[#141416] hover:opacity-92 transition cursor-pointer"
            @click="startBattleRun"
          >
            <Trophy class="w-3.5 h-3.5" />
            <span>{{ battleActive ? 'Mulai Ulang Duel' : 'Mulai Duel 3 Menit' }}</span>
          </button>
        </div>

        <!-- E. Teka-Teki Custom (Filter Studio with Infinite Auto-Generation) -->
        <div
          v-else
          class="surface-tactile-card rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 dark:text-zinc-400">
              STUDIO FILTER CUSTOM
            </span>
            <span class="font-mono text-[11px] font-semibold text-[#526857] dark:text-[#9DB5A1]">
              ∞ Auto-Generate
            </span>
          </div>

          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-[#202321] dark:text-zinc-200 block">Tema Taktik</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in PUZZLE_THEMES"
                :key="t.key"
                type="button"
                :aria-pressed="customThemes.includes(t.key)"
                class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer"
                :class="
                  customThemes.includes(t.key)
                    ? 'bg-[#526857] text-white border-[#526857]'
                    : 'bg-[#F7F5F0] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
                "
                @click="toggleCustomTheme(t.key)"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-[#202321] dark:text-zinc-200">Rentang Rating ELO</span>
              <span class="font-mono text-[11px] font-semibold text-[#526857] dark:text-[#9DB5A1]">
                {{ Math.min(customMinElo, customMaxElo) }} – {{ Math.max(customMinElo, customMaxElo) }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="font-mono text-[10px] text-zinc-500 block mb-1">Minimum</label>
                <input
                  v-model.number="customMinElo"
                  type="range"
                  min="850"
                  max="2100"
                  step="50"
                  class="w-full accent-[#526857] cursor-pointer"
                />
              </div>
              <div>
                <label class="font-mono text-[10px] text-zinc-500 block mb-1">Maksimum</label>
                <input
                  v-model.number="customMaxElo"
                  type="range"
                  min="900"
                  max="2150"
                  step="50"
                  class="w-full accent-[#526857] cursor-pointer"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            class="text-[11px] font-semibold text-zinc-500 hover:text-[#202321] dark:hover:text-zinc-200 underline cursor-pointer"
            @click="resetCustomFilters"
          >
            Reset Semua Filter
          </button>
        </div>

        <!-- 2. EDITORIAL TACTICAL BRIEF & FEEDBACK CARD -->
        <div
          class="surface-tactile-card rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-4"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-[0.12em] font-semibold"
              :class="
                feedbackTone === 'success'
                  ? 'bg-[#526857]/15 text-[#3B5240] dark:text-[#A4CBB3]'
                  : feedbackTone === 'error'
                    ? 'bg-[#B85D43]/15 text-[#9B4830] dark:text-[#F0AE98]'
                    : 'bg-[#F7F5F0] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-[#E4DFD5] dark:border-zinc-800'
              "
            >
              <CheckCircle2 v-if="feedbackTone === 'success'" class="w-3.5 h-3.5" />
              <XCircle v-else-if="feedbackTone === 'error'" class="w-3.5 h-3.5" />
              <Target v-else class="w-3.5 h-3.5" />
              <span>
                {{
                  feedbackTone === 'success'
                    ? 'Tepat Sekali!'
                    : feedbackTone === 'error'
                      ? 'Langkah Kurang Tepat'
                      : 'Temukan Langkah Terbaik'
                }}
              </span>
            </span>

            <span class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              Soal #{{ currentPuzzle.number }}
            </span>
          </div>

          <h2 class="font-serif text-2xl font-semibold leading-snug text-[#202321] dark:text-[#F4F3EE]">
            {{ currentPuzzle.title }}
          </h2>

          <div
            class="rounded-xl p-4 text-sm leading-relaxed border transition-colors"
            :class="
              feedbackTone === 'success'
                ? 'bg-[#526857]/10 border-[#526857]/35 text-[#27382B] dark:text-[#CBE3D1]'
                : feedbackTone === 'error'
                  ? 'bg-[#B85D43]/10 border-[#B85D43]/35 text-[#7A3521] dark:text-[#F5C0AF]'
                  : 'bg-[#F7F5F0] dark:bg-zinc-900/90 border-[#E4DFD5] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            "
          >
            {{ feedbackText }}
          </div>

          <NuxtLink
            :to="`/sandbox?fen=${encodeURIComponent(currentPuzzle.fen)}`"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E4DFD5] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-900 text-[#202321] dark:text-zinc-200 hover:border-[#718675] active:scale-[0.98] transition"
          >
            <Compass class="w-4 h-4 text-[#526857] dark:text-[#9DB5A1]" />
            <span>Analisis Posisi di Sandbox</span>
          </NuxtLink>
        </div>

        <!-- 3. DYNAMIC SESSION TRAIL (Generated Puzzles in Current Session) -->
        <div
          v-if="(activeMode === 'unlimited' || activeMode === 'custom') && sessionTrail.length > 0"
          class="rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4 space-y-2.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 dark:text-zinc-400">
              JEJAK SOAL SESI INI
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#526857] dark:text-[#9DB5A1] hover:underline cursor-pointer"
              @click="nextPuzzle"
            >
              <Sparkles class="w-3 h-3" />
              <span>Generate Soal Baru</span>
            </button>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(entry, idx) in sessionTrail"
              :key="entry.puzzle.id"
              type="button"
              class="px-2.5 h-8 rounded-lg font-mono text-[11px] font-semibold border transition cursor-pointer inline-flex items-center gap-1"
              :class="
                idx === activeTrailIdx
                  ? 'bg-[#141416] text-white border-[#141416] dark:bg-[#EDEAE0] dark:text-[#141416] ring-2 ring-[#C59B46]/60'
                  : entry.status === 'ok'
                    ? 'bg-[#526857]/15 text-[#3B5240] dark:text-[#A4CBB3] border-[#526857]/35'
                    : entry.status === 'fail'
                      ? 'bg-[#B85D43]/15 text-[#9B4830] dark:text-[#F0AE98] border-[#B85D43]/35'
                      : 'bg-[#F7F5F0] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
              "
              :title="`Soal #${entry.puzzle.number}: ${entry.puzzle.title} (${entry.puzzle.rating} ELO)`"
              @click="selectTrailEntry(idx)"
            >
              <span>#{{ entry.puzzle.number }}</span>
              <span v-if="entry.status === 'ok'">✓</span>
              <span v-else-if="entry.status === 'fail'">✕</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
