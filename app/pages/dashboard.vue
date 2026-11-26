<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  CheckCircle2,
  Compass,
  Crosshair,
  Flame,
  Layers,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  Swords,
  Target,
  X
} from 'lucide-vue-next'
import InteractiveHoverButton from '~/components/ui/InteractiveHoverButton.vue'
import type { ChessSide, ModuleCategory, RepertoireModule } from '~/utils/chessData'
import { markDailyRoutineTaskComplete } from '~/utils/dailyRoutine'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

const {
  progress,
  isHydrated,
  allModules,
  totalAvailableLines,
  totalMasteredLines,
  overallAccuracy,
  mistakeCount,
  getModuleProgress,
  getQuickDrillRoute,
  deleteCustomOpening,
  recordMoveResult,
  recordMistake
} = useChessProgress()

const { isMuted } = useTheme()

// --- Daily Tactical Snippet (Interactive Hero Mini-Puzzle) ---
interface DailyPuzzle {
  id: string
  title: string
  badge: string
  fen: string
  side: Color
  solutionSan: string
  prompt: string
  successExplanation: string
  mistakeHint: string
}

const DAILY_PUZZLES: DailyPuzzle[] = [
  {
    id: 'daily-opera-mate',
    title: 'Skakmat Opera (Paul Morphy, 1858)',
    badge: 'Tantangan Kilat · Putih',
    fen: '1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 1',
    side: 'w',
    solutionSan: 'Rd8#',
    prompt: 'Temukan skakmat 1 langkah memanfaatkan pin gajah di g5!',
    successExplanation:
      '17. Rd8#! Gajah di g5 menutup petak pelarian e7 sehingga Benteng menutup partai dengan indah.',
    mistakeHint: 'Perhatikan lajur d yang terbuka lebar dan gajah g5 yang mengawal petak e7!'
  },
  {
    id: 'daily-royal-fork',
    title: 'Garpu Kuda Klasik (Royal Fork)',
    badge: 'Tantangan Kilat · Putih',
    fen: 'r3k3/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQq - 0 1',
    side: 'w',
    solutionSan: 'Nxc7+',
    prompt: 'Cari langkah kuda yang langsung menyerang Raja dan Benteng sekaligus!',
    successExplanation:
      'Nxc7+! Garpu ganda mematikan yang memaksa Raja berpindah dan memenangkan Benteng a8 secara bersih.',
    mistakeHint: 'Cari petak c7 yang tidak terjaga oleh perwira Hitam untuk melakukan garpu ganda.'
  },
  {
    id: 'daily-back-rank',
    title: 'Skakmat Baris Belakang',
    badge: 'Tantangan Kilat · Putih',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    side: 'w',
    solutionSan: 'Rd8#',
    prompt: 'Raja Hitam terkurung di balik benteng pionnya sendiri. Tuntaskan dalam 1 langkah!',
    successExplanation:
      'Rd8#! Skakmat baris belakang klasik karena pion f7-g7-h7 menghalangi pelarian Raja Hitam.',
    mistakeHint: 'Manfaatkan kelemahan baris ke-8 saat ketiga pion Hitam mengurung rajanya sendiri.'
  }
]

const activePuzzleIdx = ref(0)
const activePuzzle = computed(() => DAILY_PUZZLES[activePuzzleIdx.value] ?? DAILY_PUZZLES[0]!)

const puzzleFen = ref(activePuzzle.value.fen)
const puzzleLastMove = ref<{ from: string; to: string } | null>(null)
const puzzleSolved = ref(false)
const puzzleCorrectSquare = ref<string | null>(null)
const puzzleErrorSquare = ref<string | null>(null)
const puzzleHintFrom = ref<string | null>(null)
const puzzleHintTo = ref<string | null>(null)
const puzzleShake = ref(false)
const puzzleFeedback = ref(activePuzzle.value.prompt)
const showAccuracyToast = ref(false)
const mistakeModalOpen = ref(false)

let toastTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function loadPuzzle(idx: number) {
  activePuzzleIdx.value = idx % DAILY_PUZZLES.length
  const p = activePuzzle.value
  puzzleFen.value = p.fen
  puzzleLastMove.value = null
  puzzleSolved.value = false
  puzzleCorrectSquare.value = null
  puzzleErrorSquare.value = null
  puzzleHintFrom.value = null
  puzzleHintTo.value = null
  puzzleShake.value = false
  puzzleFeedback.value = p.prompt
}

function nextDailyPuzzle() {
  loadPuzzle(activePuzzleIdx.value + 1)
}

function showDailyPuzzleHint() {
  if (puzzleSolved.value) return
  try {
    const g = new Chess(activePuzzle.value.fen)
    const m = g.move(activePuzzle.value.solutionSan)
    puzzleHintFrom.value = m.from
    puzzleHintTo.value = m.to
  } catch {
    // Ignore
  }
}

function handleDailyPuzzleMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (puzzleSolved.value) return
  const p = activePuzzle.value
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
    puzzleFen.value = g.fen()
    puzzleLastMove.value = { from: played.from, to: played.to }
    puzzleSolved.value = true
    puzzleCorrectSquare.value = played.to
    puzzleErrorSquare.value = null
    puzzleHintFrom.value = null
    puzzleHintTo.value = null
    puzzleFeedback.value = p.successExplanation

    recordMoveResult(`daily-${p.id}`, true)
    markDailyRoutineTaskComplete('daily-puzzle')
    if (played.san.includes('#') || played.san.includes('+')) {
      playCheckSound(isMuted.value)
    } else if (played.captured) {
      playWoodenCapture(isMuted.value)
    } else {
      playWoodenMove(isMuted.value)
    }
    setTimeout(() => playSuccessChime(isMuted.value), 160)

    showAccuracyToast.value = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      showAccuracyToast.value = false
    }, 3200)
  } else {
    recordMoveResult(`daily-${p.id}`, false)
    recordMistake({
      source: 'daily',
      title: p.title,
      fen: p.fen,
      expectedSan: p.solutionSan,
      side: p.side
    })
    playErrorSound(isMuted.value)
    puzzleErrorSquare.value = payload.to
    puzzleFeedback.value = p.mistakeHint
    puzzleShake.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      puzzleShake.value = false
    }, 380)
  }
}

// --- Library Filters, Debounced Search & Detail Drawer State ---
const selectedCategory = ref<'all' | ModuleCategory>('all')
const selectedSide = ref<'all' | ChessSide>('all')
const searchInput = ref('')
const debouncedSearch = ref('')
const isDebouncing = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

const selectedModuleId = ref<string | null>(null)
const selectedModule = computed<RepertoireModule | null>(() => {
  if (!selectedModuleId.value) return null
  return allModules.value.find((m) => m.id === selectedModuleId.value) ?? null
})

const selectedModuleProgress = computed(() => {
  if (!selectedModule.value) return { mastered: 0, total: 0, percent: 0 }
  return getModuleProgress(selectedModule.value)
})

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (val) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  if (val.trim() === '') {
    debouncedSearch.value = ''
    isDebouncing.value = false
    return
  }
  isDebouncing.value = true
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = val.trim().toLowerCase()
    isDebouncing.value = false
  }, 200)
})

const hasActiveFilters = computed(
  () =>
    selectedCategory.value !== 'all' ||
    selectedSide.value !== 'all' ||
    debouncedSearch.value.length > 0
)

const filteredModules = computed(() => {
  const q = debouncedSearch.value
  return allModules.value.filter((mod) => {
    if (selectedCategory.value !== 'all' && mod.category !== selectedCategory.value) {
      return false
    }
    if (selectedSide.value !== 'all' && mod.side !== selectedSide.value) {
      return false
    }
    if (q) {
      const haystack = [
        mod.title,
        mod.subtitle,
        mod.summary,
        mod.difficulty,
        ...mod.keyThemes,
        mod.category === 'opening' ? mod.eco : 'babak akhir endgame'
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
})

const quickDrillPath = computed(() => getQuickDrillRoute())

function handleSelectModule(mod: RepertoireModule) {
  selectedModuleId.value = mod.id
}

function closeDetailDrawer() {
  selectedModuleId.value = null
}

function handleDeleteCustom(id: string) {
  if (selectedModuleId.value === id) {
    selectedModuleId.value = null
  }
  deleteCustomOpening(id)
}

function resetAllFilters() {
  searchInput.value = ''
  debouncedSearch.value = ''
  selectedCategory.value = 'all'
  selectedSide.value = 'all'
}

function handleGlobalSlashShortcut(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    e.preventDefault()
    searchInputRef.value?.focus()
  } else if (e.key === 'Escape' && document.activeElement === searchInputRef.value) {
    searchInput.value = ''
    debouncedSearch.value = ''
    searchInputRef.value?.blur()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalSlashShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalSlashShortcut)
  if (toastTimer) clearTimeout(toastTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})
</script>

<template>
  <div class="space-y-12">
    <!-- 2-Column Interactive Split Hero Card -->
    <section
      class="surface-tactile-hero rounded-3xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-6 sm:p-8 lg:p-10 relative overflow-hidden"
    >
      <!-- Subtle geometric board watermark -->
      <div
        class="pointer-events-none absolute -left-16 -bottom-16 w-72 h-72 opacity-[0.028] dark:opacity-[0.045] grid grid-cols-4 grid-rows-4 -rotate-12"
        aria-hidden="true"
      >
        <div
          v-for="n in 16"
          :key="n"
          :class="(Math.floor((n - 1) / 4) + ((n - 1) % 4)) % 2 === 0 ? 'bg-[#202321] dark:bg-white' : ''"
        />
      </div>

      <div class="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <!-- Left Column (7 cols): Editorial Copy + CTAs + Integrated Compact KPI Strip -->
        <div class="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div>
            <div class="flex items-center gap-2.5 mb-4">
              <span class="w-5 h-px bg-[#718675]" aria-hidden="true" />
              <span
                class="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#495C4D] dark:text-[#A4CBB3]"
              >
                Ruang Latihan Harian
              </span>
            </div>

            <h1
              class="font-serif text-[32px] sm:text-[42px] lg:text-[48px] font-semibold tracking-[-0.025em] text-[#202321] dark:text-zinc-50 leading-[1.08]"
            >
              Kuasai Pembukaan &amp; Babak Akhir dengan Disiplin Grandmaster.
            </h1>
            <p class="mt-4 text-[15px] sm:text-base text-zinc-600 dark:text-zinc-300/90 leading-[1.65] max-w-xl">
              Latih jalur repertoar klasik melalui pengulangan terarah, eksplorasi bebas di Mode
              Analisis, dan uji ketajaman Anda melawan lawan latih Minimax serta bot 250–3200 ELO.
            </p>

            <!-- Primary CTA Row -->
            <div class="flex flex-wrap items-center gap-3 mt-7">
              <InteractiveHoverButton
                :to="quickDrillPath"
                text="Latihan Cepat (Quick Drill)"
              />

              <NuxtLink
                to="/play"
                class="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-[#718675]/45 bg-[#718675]/10 dark:bg-[#718675]/20 text-[#3B4E3F] dark:text-[#B8CEBC] hover:border-[#526857] hover:bg-[#718675]/16 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2"
              >
                <Swords class="w-4 h-4" />
                <span>Main vs Bot / 2P</span>
              </NuxtLink>

              <NuxtLink
                to="/sandbox"
                class="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-[#E4DFD5] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-900 text-[#202321] dark:text-zinc-200 hover:border-[#718675] hover:bg-[#EFECE4] dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2"
              >
                <Compass class="w-4 h-4 text-[#495C4D] dark:text-[#9DB5A1]" />
                <span>Impor PGN / FEN</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Integrated Compact 3-Item Horizontal KPI Strip -->
          <div class="grid grid-cols-3 gap-3 pt-6 border-t border-[#E8E4DC]/90 dark:border-zinc-800/90">
            <div
              class="rounded-2xl bg-[#F7F5F0]/90 dark:bg-zinc-900/75 border border-[#E8E4DC] dark:border-zinc-800 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div class="flex items-center justify-between gap-1 text-zinc-600 dark:text-zinc-400">
                <span class="font-mono text-[10px] uppercase tracking-[0.12em] truncate">Jalur Dikuasai</span>
                <Layers class="w-3.5 h-3.5 text-[#526857] dark:text-[#9DB5A1] shrink-0" />
              </div>
              <div class="mt-1.5 flex items-baseline gap-1.5">
                <span class="font-serif text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums text-[#202321] dark:text-zinc-100">
                  {{ totalMasteredLines }}
                </span>
                <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  / {{ totalAvailableLines }}
                </span>
              </div>
              <div class="mt-2 h-1 rounded-full bg-[#E4DFD5] dark:bg-zinc-800 overflow-hidden">
                <div
                  class="h-full bg-[#526857] dark:bg-[#718675] rounded-full transition-all duration-500 motion-reduce:transition-none"
                  :style="{
                    width: `${totalAvailableLines > 0 ? Math.min(100, Math.round((totalMasteredLines / totalAvailableLines) * 100)) : 0}%`
                  }"
                />
              </div>
            </div>

            <div
              class="rounded-2xl bg-[#F7F5F0]/90 dark:bg-zinc-900/75 border border-[#E8E4DC] dark:border-zinc-800 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div class="flex items-center justify-between gap-1 text-zinc-600 dark:text-zinc-400">
                <span class="font-mono text-[10px] uppercase tracking-[0.12em] truncate">Akurasi Langkah</span>
                <Target class="w-3.5 h-3.5 text-[#526857] dark:text-[#9DB5A1] shrink-0" />
              </div>
              <div class="mt-1.5 flex items-baseline gap-1.5">
                <span class="font-serif text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums text-[#202321] dark:text-zinc-100">
                  {{ progress.totalAttempts > 0 ? `${overallAccuracy}%` : '0%' }}
                </span>
                <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                  {{ progress.totalAttempts }}×
                </span>
              </div>
              <p class="mt-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                {{ progress.totalAttempts > 0 ? `${progress.correctMoves} tepat` : 'Belum tercatat' }}
              </p>
            </div>

            <div
              class="rounded-2xl bg-[#F7F5F0]/90 dark:bg-zinc-900/75 border border-[#E8E4DC] dark:border-zinc-800 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div class="flex items-center justify-between gap-1 text-zinc-600 dark:text-zinc-400">
                <span class="font-mono text-[10px] uppercase tracking-[0.12em] truncate">Rangkaian Harian</span>
                <Flame class="w-3.5 h-3.5 text-[#B85D43] dark:text-[#E89B82] shrink-0" />
              </div>
              <div class="mt-1.5 flex items-baseline gap-1.5">
                <span class="font-serif text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums text-[#202321] dark:text-zinc-100">
                  {{ progress.streakDays }}
                </span>
                <span class="text-[11px] text-zinc-600 dark:text-zinc-400">hari</span>
              </div>
              <p class="mt-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                {{ progress.streakDays > 0 ? 'Konsisten aktif' : 'Mulai hari ini' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Right Column (5 cols): Contrasting Obsidian-Charcoal Focal Stage for Daily Tactical Puzzle -->
        <div class="lg:col-span-5">
          <div
            class="relative rounded-2xl border p-4 sm:p-5 transition-all duration-300 motion-reduce:transition-none text-[#F4F3EE]"
            :class="
              puzzleSolved
                ? 'bg-[#17231C] dark:bg-[#101B15] border-[#718675]/75 ring-2 ring-[#718675]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_42px_-16px_rgba(20,36,26,0.52)]'
                : 'bg-[#1B1E1C] dark:bg-[#111214] border-[#2E3330] dark:border-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_20px_42px_-16px_rgba(24,27,25,0.46)]'
            "
          >
            <!-- Floating "+1 Akurasi" Toast -->
            <Transition name="toast-pop">
              <div
                v-if="showAccuracyToast"
                class="absolute -top-3.5 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#526857] text-white text-xs font-semibold shadow-lg ring-1 ring-white/20"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>+1 Akurasi · Tepat!</span>
              </div>
            </Transition>

            <!-- Puzzle Header -->
            <div class="flex items-center justify-between gap-2 mb-3.5 min-w-0">
              <span
                class="min-w-0 max-w-full inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-[0.08em] font-semibold"
                :class="
                  puzzleSolved
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                    : 'bg-[#C26D53]/22 text-[#F3B9A6] border border-[#C26D53]/35'
                "
              >
                <CheckCircle2 v-if="puzzleSolved" class="w-3.5 h-3.5 shrink-0" />
                <Crosshair v-else class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate">{{ puzzleSolved ? 'Terpecahkan!' : activePuzzle.badge }}</span>
              </span>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  v-if="!puzzleSolved"
                  type="button"
                  class="p-1.5 rounded-lg text-zinc-300 hover:text-[#F3B9A6] hover:bg-white/10 active:scale-[0.95] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9DB5A1]"
                  title="Tampilkan Petunjuk"
                  aria-label="Tampilkan Petunjuk"
                  @click="showDailyPuzzleHint"
                >
                  <Lightbulb class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 active:scale-[0.97] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9DB5A1]"
                  title="Ganti Teka-Teki Kilat"
                  @click="nextDailyPuzzle"
                >
                  <RefreshCw class="w-3 h-3 shrink-0" />
                  <span>Soal Lain</span>
                </button>
              </div>
            </div>

            <!-- Live Playable Mini Chessboard -->
            <div class="max-w-[310px] mx-auto">
              <ChessBoard
                :fen="puzzleFen"
                :orientation="activePuzzle.side"
                :interactive="!puzzleSolved"
                :allowed-color="activePuzzle.side"
                :last-move="puzzleLastMove"
                :correct-square="puzzleCorrectSquare"
                :error-square="puzzleErrorSquare"
                :hint-from="puzzleHintFrom"
                :hint-to="puzzleHintTo"
                :shake="puzzleShake"
                surface-tone="dark"
                @move="handleDailyPuzzleMove"
              />
            </div>

            <!-- Puzzle Footer Caption / Feedback -->
            <div class="mt-3.5 pt-3 border-t border-white/10">
              <div class="flex items-center justify-between gap-2">
                <p class="font-serif text-sm font-semibold text-[#F7F5F0] tracking-tight">
                  {{ activePuzzle.title }}
                </p>
                <span
                  v-if="puzzleSolved"
                  class="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#526857] text-white"
                >
                  {{ activePuzzle.solutionSan }}
                </span>
              </div>
              <p
                class="text-xs mt-1 leading-relaxed"
                :class="puzzleSolved ? 'text-emerald-200' : 'text-[#C8CFCB]'"
              >
                {{ puzzleFeedback }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Compact 2-Tab Card: 5-Minute Daily Routine & Player DNA Radar -->
    <DailyRoutineCard />

    <!-- Curated Library Section -->
    <section class="space-y-6">
      <!-- Sticky Frosted-Glass Filter & Debounced Search Bar -->
      <div
        class="sticky top-[68px] z-20 rounded-2xl border border-[#E4DFD5] dark:border-zinc-800/90 bg-[#F7F5F0]/86 dark:bg-[#121214]/86 backdrop-blur-md px-4 sm:px-5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_28px_-18px_rgba(32,35,33,0.16)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_-16px_rgba(0,0,0,0.65)] space-y-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <!-- Left: Editorial Kicker + Title + Live Count & Mistake Queue Pill -->
          <div class="flex flex-wrap items-center gap-2.5">
            <div>
              <span class="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#495C4D] dark:text-[#9DB5A1]">
                Katalog Kurasi
              </span>
              <h2 class="font-serif text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-[#202321] dark:text-zinc-50 leading-tight">
                Pustaka Repertoar &amp; Babak Akhir
              </h2>
            </div>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-white dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-none"
            >
              {{ filteredModules.length }} Modul
            </span>
            <button
              v-if="mistakeCount > 0"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B85D43]/12 text-[#9E4931] dark:bg-[#B85D43]/25 dark:text-[#F0B39E] border border-[#B85D43]/35 hover:bg-[#B85D43] hover:text-white active:scale-[0.97] transition cursor-pointer"
              @click="mistakeModalOpen = true"
            >
              <RotateCcw class="w-3 h-3" />
              <span>Perlu Diulang ({{ mistakeCount }})</span>
            </button>
          </div>

          <!-- Right: Debounced Search with '/' Hint + Segmented Category & Side Pills -->
          <div class="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            <div class="relative flex-1 sm:flex-initial min-w-[210px] sm:min-w-[245px]">
              <Search
                class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                ref="searchInputRef"
                v-model="searchInput"
                type="text"
                placeholder="Cari repertoar, ECO, tag..."
                aria-label="Cari repertoar berdasarkan nama, kode ECO, deskripsi, atau tag strategi"
                class="w-full pl-8 pr-8 py-1.5 rounded-xl text-xs border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] text-[#202321] dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:border-[#718675] focus:ring-2 focus:ring-[#718675]/30 transition shadow-[inset_0_1px_2px_rgba(32,35,33,0.03)]"
              />
              <button
                v-if="searchInput"
                type="button"
                class="p-1 rounded-md text-zinc-500 hover:text-[#202321] dark:hover:text-white absolute right-1.5 top-1/2 -translate-y-1/2 active:scale-90 transition cursor-pointer"
                aria-label="Hapus pencarian"
                @click="
                  () => {
                    searchInput = ''
                    debouncedSearch = ''
                  }
                "
              >
                <X class="w-3.5 h-3.5" />
              </button>
              <kbd
                v-else
                class="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded-md border border-[#E4DFD5] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                /
              </kbd>
            </div>

            <!-- Category Segmented Pills -->
            <div
              class="inline-flex items-center p-1 rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D]"
              role="group"
              aria-label="Filter kategori"
            >
              <button
                v-for="cat in [
                  { key: 'all', label: 'Semua' },
                  { key: 'opening', label: 'Pembukaan' },
                  { key: 'endgame', label: 'Babak Akhir' }
                ]"
                :key="cat.key"
                type="button"
                :aria-pressed="selectedCategory === cat.key"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
                :class="
                  selectedCategory === cat.key
                    ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100 hover:bg-[#F7F5F0] dark:hover:bg-zinc-800/70'
                "
                @click="selectedCategory = cat.key as 'all' | ModuleCategory"
              >
                {{ cat.label }}
              </button>
            </div>

            <!-- Side Segmented Pills -->
            <div
              class="inline-flex items-center p-1 rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D]"
              role="group"
              aria-label="Filter sisi bidak"
            >
              <button
                v-for="s in [
                  { key: 'all', label: 'Semua Sisi' },
                  { key: 'w', label: 'Putih' },
                  { key: 'b', label: 'Hitam' }
                ]"
                :key="s.key"
                type="button"
                :aria-pressed="selectedSide === s.key"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
                :class="
                  selectedSide === s.key
                    ? 'bg-[#526857] text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100 hover:bg-[#F7F5F0] dark:hover:bg-zinc-800/70'
                "
                @click="selectedSide = s.key as 'all' | ChessSide"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Active Filter Indicator Strip -->
        <div
          v-if="hasActiveFilters || isDebouncing"
          class="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#E4DFD5]/80 dark:border-zinc-800 text-xs"
        >
          <span class="font-mono uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400 text-[10px] font-medium">
            {{ isDebouncing ? 'Mencari...' : 'Filter aktif:' }}
          </span>

          <button
            v-if="selectedCategory !== 'all'"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#202321]/8 dark:bg-zinc-800 text-[#202321] dark:text-zinc-200 border border-[#E4DFD5] dark:border-zinc-700 hover:border-[#718675] active:scale-[0.97] transition cursor-pointer"
            @click="selectedCategory = 'all'"
          >
            <span>Kategori: {{ selectedCategory === 'opening' ? 'Pembukaan' : 'Babak Akhir' }}</span>
            <X class="w-3 h-3" />
          </button>

          <button
            v-if="selectedSide !== 'all'"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#718675]/12 text-[#3B4E3F] dark:text-[#B8CEBC] border border-[#718675]/35 hover:border-[#718675] active:scale-[0.97] transition cursor-pointer"
            @click="selectedSide = 'all'"
          >
            <span>Sisi: {{ selectedSide === 'w' ? 'Putih' : 'Hitam' }}</span>
            <X class="w-3 h-3" />
          </button>

          <button
            v-if="debouncedSearch"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-[#E4DFD5] dark:border-zinc-700 hover:border-[#718675] active:scale-[0.97] transition cursor-pointer"
            @click="
              () => {
                searchInput = ''
                debouncedSearch = ''
              }
            "
          >
            <span>Kata kunci: "{{ debouncedSearch }}"</span>
            <X class="w-3 h-3" />
          </button>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="ml-auto text-[11px] font-semibold text-[#495C4D] dark:text-[#9DB5A1] hover:underline active:scale-[0.98] cursor-pointer"
            @click="resetAllFilters"
          >
            Reset Semua
          </button>
        </div>
      </div>

      <!-- Loading State: Skeleton Cards -->
      <div
        v-if="!isHydrated"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        aria-label="Memuat pustaka repertoar"
      >
        <RepertoireCardSkeleton v-for="n in 6" :key="n" />
      </div>

      <!-- Fluid Animated Cards Grid -->
      <TransitionGroup
        v-else-if="filteredModules.length > 0"
        name="repertoire-grid"
        tag="div"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative"
      >
        <RepertoireCard
          v-for="mod in filteredModules"
          :key="mod.id"
          :module="mod"
          :selected="selectedModuleId === mod.id"
          v-bind="getModuleProgress(mod)"
          @select="handleSelectModule"
          @delete-custom="handleDeleteCustom"
        />
      </TransitionGroup>

      <!-- Empty State -->
      <div
        v-else
        class="rounded-2xl border border-dashed border-[#DCD6CA] dark:border-zinc-700 bg-white/80 dark:bg-[#19191D]/80 p-12 text-center flex flex-col items-center justify-center space-y-3"
      >
        <div
          class="w-12 h-12 rounded-2xl bg-[#F7F5F0] dark:bg-zinc-800 border border-[#E4DFD5] dark:border-zinc-700 flex items-center justify-center text-[#526857] dark:text-[#9DB5A1]"
        >
          <SearchX class="w-5 h-5" />
        </div>
        <div class="space-y-1 max-w-md">
          <h3 class="font-serif text-lg font-semibold text-[#202321] dark:text-zinc-100">
            Repertoar Tidak Ditemukan
          </h3>
          <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Tidak ada modul yang cocok dengan kombinasi filter atau pencarian
            <span v-if="debouncedSearch" class="font-mono font-semibold text-[#202321] dark:text-zinc-200">
              "{{ debouncedSearch }}"
            </span>
            saat ini.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:opacity-90 active:scale-[0.98] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
          @click="resetAllFilters"
        >
          <span>Tampilkan Semua Repertoar</span>
        </button>
      </div>
    </section>

    <!-- Repertoire Detail Side Drawer -->
    <RepertoireDetailDrawer
      :module="selectedModule"
      :mastered="selectedModuleProgress.mastered"
      :total="selectedModuleProgress.total"
      :percent="selectedModuleProgress.percent"
      @close="closeDetailDrawer"
    />

    <!-- Mistake Queue Drill Modal -->
    <MistakeDrillModal :open="mistakeModalOpen" @close="mistakeModalOpen = false" />
  </div>
</template>

<style scoped>
.repertoire-grid-move,
.repertoire-grid-enter-active,
.repertoire-grid-leave-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.repertoire-grid-enter-from,
.repertoire-grid-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.repertoire-grid-leave-active {
  position: absolute;
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .repertoire-grid-move,
  .repertoire-grid-enter-active,
  .repertoire-grid-leave-active,
  .toast-pop-enter-active,
  .toast-pop-leave-active {
    transition: none;
  }
}
</style>
