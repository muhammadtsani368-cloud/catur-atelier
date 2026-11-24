<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  CheckCircle2,
  Compass,
  Lightbulb,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Target
} from 'lucide-vue-next'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

interface TacticalPuzzleItem {
  id: string
  title: string
  theme: 'Skakmat' | 'Garpu' | 'Pin' | 'Pengorbanan'
  rating: number
  side: Color
  fen: string
  solutionSan: string
  prompt: string
  explanation: string
  hint: string
}

const ALL_PUZZLES: TacticalPuzzleItem[] = [
  {
    id: 'pz-opera-mate',
    title: 'Skakmat Opera Paul Morphy',
    theme: 'Skakmat',
    rating: 1100,
    side: 'w',
    fen: '1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 1',
    solutionSan: 'Rd8#',
    prompt: 'Manfaatkan gajah g5 yang memaku jalur pelarian Raja Hitam!',
    explanation: 'Rd8#! Skakmat klasik karena gajah g5 menjaga petak e7 sementara Benteng mengunci baris ke-8.',
    hint: 'Gunakan lajur d yang terbuka untuk langsung menyerang Raja di e8.'
  },
  {
    id: 'pz-carlsen-qh6',
    title: 'Pengorbanan Menteri Carlsen',
    theme: 'Pengorbanan',
    rating: 1750,
    side: 'w',
    fen: '2R5/2R2ppk/4p3/p2pPP2/3P1Q1P/q5P1/r7/7K w - - 0 50',
    solutionSan: 'Qh6+',
    prompt: 'Temukan pengorbanan menteri penentu gelar juara dunia 2016!',
    explanation: '50. Qh6+!! Memaksa 50... Kxh6 51. Rh8# atau 50... gxh6 51. Rxf7# tanpa jalan keluar.',
    hint: 'Tawarkan Menteri Anda tepat di samping Raja Hitam untuk membuka lajur h dan petak f7.'
  },
  {
    id: 'pz-royal-fork',
    title: 'Garpu Kerajaan (Royal Fork)',
    theme: 'Garpu',
    rating: 950,
    side: 'w',
    fen: 'r3k3/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQq - 0 1',
    solutionSan: 'Nxc7+',
    prompt: 'Serang Raja dan Benteng Hitam dalam satu lompatan kuda!',
    explanation: 'Nxc7+! Garpu ganda yang langsung memaksa Raja berpindah dan memenangkan Benteng a8.',
    hint: 'Lompatkan Kuda d5 ke petak c7 yang tidak terjaga.'
  },
  {
    id: 'pz-back-rank',
    title: 'Skakmat Baris Belakang',
    theme: 'Skakmat',
    rating: 850,
    side: 'w',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionSan: 'Rd8#',
    prompt: 'Raja Hitam terkurung oleh tiga pionnya sendiri. Tuntaskan sekarang!',
    explanation: 'Rd8#! Pola fundamental baris belakang saat benteng pion f7-g7-h7 belum memiliki lubang napas.',
    hint: 'Dorong Benteng d1 ke baris ke-8.'
  },
  {
    id: 'pz-pin-queen',
    title: 'Paku Benteng Memenangkan Menteri',
    theme: 'Pin',
    rating: 1250,
    side: 'w',
    fen: '3k4/ppp2ppp/8/3q4/8/2P5/PP3PPP/4RBK1 w - - 0 1',
    solutionSan: 'Rd1',
    prompt: 'Menteri dan Raja Hitam berada pada lajur yang sama. Kunci posisinya!',
    explanation: 'Rd1! Paku absolut di lajur d membuat Menteri d5 tidak bisa melarikan diri dari ancaman Benteng.',
    hint: 'Tempatkan Benteng pada lajur d untuk memaku Menteri ke Raja di d8.'
  },
  {
    id: 'pz-smothered-mate',
    title: 'Skakmat Tercekik (Smothered Mate)',
    theme: 'Skakmat',
    rating: 1450,
    side: 'w',
    fen: '5r1k/6pp/7N/8/8/8/5PPP/6K1 w - - 0 1',
    solutionSan: 'Nf7+',
    prompt: 'Berikan skak kuda untuk memulai jaring skakmat klasik di sudut papan!',
    explanation: 'Nf7+! Memaksa Raja kembali ke g8 dan menguasai petak kritis di sekitar Benteng f8.',
    hint: 'Lompatkan Kuda h6 ke f7 dengan skak.'
  },
  {
    id: 'pz-kasparov-rxd4',
    title: 'Pengorbanan Benteng Kasparov 24. Rxd4!!',
    theme: 'Pengorbanan',
    rating: 2100,
    side: 'w',
    fen: 'b2r3r/k4p1p/p2q1np1/NppP4/3p1Q2/P4PPB/1PP4P/1K1RR3 w - - 1 24',
    solutionSan: 'Rxd4',
    prompt: 'Temukan pengorbanan benteng legendaris Garry Kasparov melawan Topalov!',
    explanation: '24. Rxd4!! Membongkar pusat secara paksa dan memicu perburuan raja paling ikonik dalam sejarah catur.',
    hint: 'Hancurkan pion d4 langsung dengan Benteng d1.'
  }
]

const { recordMoveResult, recordMistake, mistakeCount } = useChessProgress()
const { isMuted } = useTheme()

const activeTheme = ref<'Semua' | TacticalPuzzleItem['theme']>('Semua')
const activeIndex = ref(0)
const solvedIds = ref<string[]>([])

const filteredPuzzles = computed(() =>
  activeTheme.value === 'Semua'
    ? ALL_PUZZLES
    : ALL_PUZZLES.filter((p) => p.theme === activeTheme.value)
)

const currentPuzzle = computed<TacticalPuzzleItem>(
  () => filteredPuzzles.value[activeIndex.value] ?? filteredPuzzles.value[0] ?? ALL_PUZZLES[0]!
)

const boardFen = ref(currentPuzzle.value.fen)
const lastMove = ref<{ from: string; to: string } | null>(null)
const solved = ref(false)
const correctSquare = ref<string | null>(null)
const errorSquare = ref<string | null>(null)
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)
const shake = ref(false)
const feedbackText = ref(currentPuzzle.value.prompt)

let shakeTimer: ReturnType<typeof setTimeout> | null = null

function loadCurrentPuzzle() {
  const p = currentPuzzle.value
  boardFen.value = p.fen
  lastMove.value = null
  solved.value = false
  correctSquare.value = null
  errorSquare.value = null
  hintFrom.value = null
  hintTo.value = null
  shake.value = false
  feedbackText.value = p.prompt
}

watch([activeTheme, activeIndex], () => {
  if (activeIndex.value >= filteredPuzzles.value.length) {
    activeIndex.value = 0
  }
  loadCurrentPuzzle()
})

function nextPuzzle() {
  activeIndex.value = (activeIndex.value + 1) % filteredPuzzles.value.length
}

function showHint() {
  if (solved.value) return
  try {
    const g = new Chess(currentPuzzle.value.fen)
    const m = g.move(currentPuzzle.value.solutionSan)
    hintFrom.value = m.from
    hintTo.value = m.to
    feedbackText.value = currentPuzzle.value.hint
  } catch {
    // Ignore
  }
}

function handlePuzzleMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (solved.value) return
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
    feedbackText.value = p.explanation
    if (!solvedIds.value.includes(p.id)) {
      solvedIds.value = [...solvedIds.value, p.id]
    }

    recordMoveResult(p.id, true)
    if (played.san.includes('#') || played.san.includes('+')) playCheckSound(isMuted.value)
    else if (played.captured) playWoodenCapture(isMuted.value)
    else playWoodenMove(isMuted.value)
    setTimeout(() => playSuccessChime(isMuted.value), 160)
  } else {
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
    feedbackText.value = `${played.san} belum tepat. ${p.hint} (Dicatat ke Antrean Kesalahan)`
    shake.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shake.value = false
    }, 360)
  }
}

onBeforeUnmount(() => {
  if (shakeTimer) clearTimeout(shakeTimer)
})
</script>

<template>
  <div class="space-y-8">
    <!-- Cosmic Header -->
    <section
      class="surface-tactile-hero rounded-3xl border border-[#3B3561]/12 dark:border-white/10 bg-white dark:bg-[#2A264A] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div class="space-y-2 max-w-2xl">
        <div class="flex items-center gap-2">
          <Puzzle class="w-4 h-4 text-[#9D8DF1]" />
          <span class="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[#3B3561] dark:text-[#9D8DF1]">
            Arena Teka-Teki Taktik
          </span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#1E1B38] dark:text-[#FAF8F5]">
          Tajamkan Insting Taktis Satu Langkah Kunci.
        </h1>
        <p class="text-sm text-[#5A5673] dark:text-[#C8C3E4]">
          Selesaikan teka-teki klasik pilihan. Setiap langkah keliru otomatis masuk ke Buku Catatan Kesalahan
          agar bisa Anda ulang hingga dikuasai penuh.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <span
          class="px-3.5 py-2 rounded-full font-mono text-xs font-semibold bg-[#4ECDC4]/18 text-[#1E5C57] dark:text-[#86EFE7] border border-[#4ECDC4]/40"
        >
          Terselesaikan: {{ solvedIds.length }} / {{ ALL_PUZZLES.length }}
        </span>
        <NuxtLink
          v-if="mistakeCount > 0"
          to="/dashboard"
          class="px-3.5 py-2 rounded-full text-xs font-semibold bg-[#F26B5B]/15 text-[#B63A2C] dark:text-[#FFA89D] border border-[#F26B5B]/35 hover:bg-[#F26B5B] hover:text-white transition"
        >
          Perlu Diulang ({{ mistakeCount }})
        </NuxtLink>
      </div>
    </section>

    <!-- Theme Filter Pills -->
    <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filter tema teka-teki">
      <button
        v-for="theme in (['Semua', 'Skakmat', 'Garpu', 'Pin', 'Pengorbanan'] as const)"
        :key="theme"
        type="button"
        :aria-pressed="activeTheme === theme"
        class="px-4 py-2 rounded-full text-xs font-semibold border transition active:scale-[0.97] cursor-pointer"
        :class="
          activeTheme === theme
            ? 'bg-[#3B3561] text-[#FAF8F5] border-[#3B3561] dark:bg-[#9D8DF1] dark:text-[#1E1B38] dark:border-[#9D8DF1]'
            : 'bg-white dark:bg-[#2A264A] text-[#5A5673] dark:text-[#D5D0F0] border-[#3B3561]/12 dark:border-white/10 hover:border-[#9D8DF1]'
        "
        @click="
          () => {
            activeTheme = theme
            activeIndex = 0
          }
        "
      >
        {{ theme }}
      </button>
    </div>

    <!-- Main Interactive Puzzle Stage -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <div class="lg:col-span-7">
        <ChessBoard
          :fen="boardFen"
          :orientation="currentPuzzle.side"
          :interactive="!solved"
          :allowed-color="currentPuzzle.side"
          :last-move="lastMove"
          :correct-square="correctSquare"
          :error-square="errorSquare"
          :hint-from="hintFrom"
          :hint-to="hintTo"
          :shake="shake"
          @move="handlePuzzleMove"
        />
      </div>

      <div class="lg:col-span-5 space-y-4">
        <div
          class="floating-control-sheet rounded-3xl border border-[#3B3561]/12 dark:border-white/10 bg-white dark:bg-[#2A264A] p-6 space-y-5"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.12em] font-semibold"
              :class="
                solved
                  ? 'bg-[#4ECDC4]/20 text-[#1D5E59] dark:text-[#86EFE7]'
                  : 'bg-[#F26B5B]/15 text-[#B63A2C] dark:text-[#FFA89D]'
              "
            >
              <CheckCircle2 v-if="solved" class="w-3.5 h-3.5" />
              <Target v-else class="w-3.5 h-3.5" />
              <span>{{ currentPuzzle.theme }} · {{ currentPuzzle.rating }} ELO</span>
            </span>

            <span class="font-mono text-xs text-[#5A5673] dark:text-[#B5B0D4]">
              #{{ activeIndex + 1 }} / {{ filteredPuzzles.length }}
            </span>
          </div>

          <div>
            <h2 class="font-serif text-2xl font-semibold text-[#1E1B38] dark:text-[#FAF8F5]">
              {{ currentPuzzle.title }}
            </h2>
            <p class="text-xs font-mono uppercase tracking-[0.12em] text-[#9D8DF1] mt-1">
              Giliran {{ currentPuzzle.side === 'w' ? 'Putih' : 'Hitam' }} Melangkah
            </p>
          </div>

          <div
            class="rounded-2xl p-4 text-sm leading-relaxed border"
            :class="
              solved
                ? 'bg-[#4ECDC4]/14 border-[#4ECDC4]/40 text-[#174A46] dark:text-[#C5FAF5]'
                : 'bg-[#FAF8F5] dark:bg-[#1E1B38] border-[#3B3561]/10 dark:border-white/10 text-[#3B3561] dark:text-[#DDD8F5]'
            "
          >
            {{ feedbackText }}
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <button
              v-if="!solved"
              type="button"
              class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold border border-[#F26B5B]/40 bg-[#F26B5B]/10 text-[#B63A2C] dark:text-[#FFA89D] hover:bg-[#F26B5B] hover:text-white transition cursor-pointer"
              @click="showHint"
            >
              <Lightbulb class="w-4 h-4" />
              <span>Petunjuk</span>
            </button>
            <button
              v-else
              type="button"
              class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#F26B5B] text-white hover:bg-[#DF5949] transition cursor-pointer"
              @click="nextPuzzle"
            >
              <RefreshCw class="w-4 h-4" />
              <span>Soal Berikutnya</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold border border-[#3B3561]/15 dark:border-white/15 bg-[#FAF8F5] dark:bg-[#1E1B38] text-[#1E1B38] dark:text-[#FAF8F5] hover:border-[#9D8DF1] transition cursor-pointer"
              @click="solved ? loadCurrentPuzzle() : nextPuzzle()"
            >
              <RotateCcw v-if="solved" class="w-4 h-4" />
              <RefreshCw v-else class="w-4 h-4" />
              <span>{{ solved ? 'Ulangi' : 'Lewati' }}</span>
            </button>
          </div>

          <NuxtLink
            :to="`/sandbox?fen=${encodeURIComponent(currentPuzzle.fen)}`"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#3B3561] text-[#FAF8F5] dark:bg-[#9D8DF1] dark:text-[#1E1B38] hover:opacity-92 transition"
          >
            <Compass class="w-4 h-4" />
            <span>Analisis Posisi di Sandbox</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
