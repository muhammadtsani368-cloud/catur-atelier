<script setup lang="ts">
import type { Color, PieceSymbol } from 'chess.js'
import {
  BookmarkPlus,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  ListChecks,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X
} from 'lucide-vue-next'
import {
  CLASSIFICATION_MAP,
  MOVE_CLASSIFICATIONS,
  type AnalyzedMove,
  type GameReviewReport,
  type MoveClassification
} from '~/utils/gameReviewEngine'
import { exportAchievementCardPng } from '~/utils/matchCardCanvas'

const props = defineProps<{
  report: GameReviewReport | null
  isAnalyzing: boolean
  analysisProgress: number
  activePly: number
  totalPlies: number
  whiteName: string
  blackName: string
  whiteIsBot: boolean
  blackIsBot: boolean
  whiteAvatarPiece?: { type: PieceSymbol; color: Color } | null
  blackAvatarPiece?: { type: PieceSymbol; color: Color } | null
  resultTitle: string
  resultSubtitle: string
  humanSide: Color
  opponentElo: number
  finalFen: string
}>()

const emit = defineEmits<{
  selectPly: [ply: number]
  close: []
  rematch: []
}>()

const { isMuted, toggleMute, currentBoardPalette, pieceSet, isDark } = useTheme()
const { progress, recordMistake } = useChessProgress()

const activeTab = ref<'summary' | 'moves'>('summary')
const moveFilter = ref<'all' | 'w' | 'b' | 'errors'>('all')
const savedMistakePly = ref<number | null>(null)
const exportedNotice = ref(false)
const categoryJumpIndex = ref<Record<string, number>>({})

const activeMove = computed<AnalyzedMove | null>(() => {
  if (!props.report || props.activePly <= 0) return null
  return props.report.moves[props.activePly - 1] ?? null
})

const filteredMoves = computed<AnalyzedMove[]>(() => {
  if (!props.report) return []
  const list = props.report.moves
  if (moveFilter.value === 'w') return list.filter((m) => m.color === 'w')
  if (moveFilter.value === 'b') return list.filter((m) => m.color === 'b')
  if (moveFilter.value === 'errors') {
    return list.filter(
      (m) =>
        m.classification === 'inaccuracy' ||
        m.classification === 'mistake' ||
        m.classification === 'miss' ||
        m.classification === 'blunder'
    )
  }
  return list
})

const canSaveCurrentMistake = computed(() => {
  const m = activeMove.value
  if (!m) return false
  return (
    (m.classification === 'inaccuracy' ||
      m.classification === 'mistake' ||
      m.classification === 'miss' ||
      m.classification === 'blunder') &&
    Boolean(m.bestMoveSan)
  )
})

function saveMoveToMistakeQueue() {
  const m = activeMove.value
  if (!m) return
  recordMistake({
    source: 'daily',
    title: `Ulasan #${m.moveNumber} (${m.color === 'w' ? props.whiteName : props.blackName})`,
    fen: m.beforeFen,
    expectedSan: m.bestMoveSan,
    side: m.color
  })
  savedMistakePly.value = m.ply
  setTimeout(() => {
    if (savedMistakePly.value === m.ply) savedMistakePly.value = null
  }, 2400)
}

// Advantage Graph SVG Geometry (viewBox 0 0 360 88)
const SVG_W = 360
const SVG_H = 88
const MID_Y = SVG_H / 2

function scoreToY(score: number): number {
  const clamped = Math.max(-7, Math.min(7, score))
  const usable = SVG_H / 2 - 6
  return MID_Y - (clamped / 7) * usable
}

const graphPoints = computed(() => {
  const curve = props.report?.evalCurve ?? []
  if (curve.length === 0) return []
  const denom = Math.max(1, curve.length - 1)
  return curve.map((pt, idx) => ({
    ...pt,
    x: (idx / denom) * SVG_W,
    y: scoreToY(pt.score)
  }))
})

const whiteAreaPath = computed(() => {
  const pts = graphPoints.value
  if (pts.length < 2) return ''
  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  return `${line} L ${SVG_W} ${SVG_H} L 0 ${SVG_H} Z`
})

const notableDots = computed(() => {
  return graphPoints.value.filter(
    (p) =>
      p.ply > 0 &&
      (p.classification === 'blunder' ||
        p.classification === 'miss' ||
        p.classification === 'mistake' ||
        p.classification === 'inaccuracy' ||
        p.classification === 'great' ||
        p.classification === 'brilliant')
  )
})

const activePlayheadX = computed(() => {
  const pts = graphPoints.value
  const hit = pts[props.activePly]
  if (hit) return hit.x
  return pts[pts.length - 1]?.x ?? 0
})

function onGraphClick(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement | null
  if (!svg || !props.report) return
  const rect = svg.getBoundingClientRect()
  if (rect.width <= 0) return
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const targetPly = Math.round(ratio * props.totalPlies)
  emit('selectPly', targetPly)
}

function jumpToCategoryMove(color: Color, classification: MoveClassification) {
  if (!props.report) return
  const matching = props.report.moves.filter(
    (m) => m.color === color && m.classification === classification
  )
  if (matching.length === 0) return
  const key = `${color}:${classification}`
  const idx = (categoryJumpIndex.value[key] ?? 0) % matching.length
  categoryJumpIndex.value[key] = idx + 1
  const chosen = matching[idx]!
  emit('selectPly', chosen.ply)
}

function stepPrev() {
  emit('selectPly', Math.max(0, props.activePly - 1))
}

function stepNext() {
  emit('selectPly', Math.min(props.totalPlies, props.activePly + 1))
}

function startWalkthrough() {
  activeTab.value = 'moves'
  emit('selectPly', props.totalPlies > 0 ? 1 : 0)
}

function formatEvalShort(score: number, isMate?: boolean): string {
  if (isMate) return '#'
  if (Math.abs(score) < 0.05) return '0.0'
  return `${score > 0 ? '+' : ''}${score.toFixed(1)}`
}

function handleDownloadCard() {
  const acc =
    props.humanSide === 'w'
      ? Math.round(props.report?.whiteAccuracy ?? 80)
      : Math.round(props.report?.blackAccuracy ?? 80)
  const rating =
    props.humanSide === 'w'
      ? props.report?.whiteGameRating ?? 1000
      : props.report?.blackGameRating ?? 1000

  const ok = exportAchievementCardPng({
    title: props.resultTitle,
    subtitle: `${props.whiteName} vs ${props.blackName} · ${props.resultSubtitle}`,
    badgeLabel: 'Ulasan Permainan',
    fen: props.finalFen,
    orientation: props.humanSide,
    accuracyPercent: acc,
    streakDays: progress.value.streakDays,
    extraMetricLabel: 'Rating Permainan',
    extraMetricValue: `${rating} ELO`,
    palette: currentBoardPalette.value,
    pieceSet: pieceSet.value,
    theme: isDark.value ? 'cosmic' : 'cream'
  })
  if (ok) {
    exportedNotice.value = true
    setTimeout(() => {
      exportedNotice.value = false
    }, 2400)
  }
}

function handleKeyboardNav(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    stepPrev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    stepNext()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeyboardNav))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboardNav))
</script>

<template>
  <section
    class="rounded-2xl border border-[#2E312E] bg-[#212321] text-[#F2F0EA] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
    aria-label="Panel Ulasan Permainan"
  >
    <!-- Top Header (Matches Reference Screenshot) -->
    <div class="px-4 py-3 bg-[#1B1D1B] border-b border-white/10 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="w-6 h-6 rounded-full bg-[#81B64C] text-white inline-flex items-center justify-center shrink-0 shadow-xs"
        >
          <Search class="w-3.5 h-3.5" :stroke-width="2.5" />
        </span>
        <h2 class="font-serif text-base font-semibold tracking-tight text-white truncate">
          Ulasan Permainan
        </h2>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <!-- View Mode Switcher -->
        <div class="inline-flex items-center p-0.5 rounded-lg bg-white/8 border border-white/10 mr-1">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer"
            :class="
              activeTab === 'summary'
                ? 'bg-[#81B64C] text-white shadow-xs'
                : 'text-zinc-300 hover:text-white'
            "
            @click="activeTab = 'summary'"
          >
            Ringkasan
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer"
            :class="
              activeTab === 'moves'
                ? 'bg-[#81B64C] text-white shadow-xs'
                : 'text-zinc-300 hover:text-white'
            "
            @click="activeTab = 'moves'"
          >
            Langkah
          </button>
        </div>

        <button
          type="button"
          class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          :title="isMuted ? 'Aktifkan Suara' : 'Bisukan Suara'"
          @click="toggleMute"
        >
          <VolumeX v-if="isMuted" class="w-4 h-4" />
          <Volume2 v-else class="w-4 h-4" />
        </button>

        <button
          type="button"
          class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Tutup Ulasan"
          aria-label="Tutup Ulasan Permainan"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Loading Progress State -->
    <div v-if="isAnalyzing || !report" class="p-6 space-y-4 text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 text-xs font-medium text-[#A4CBB3]">
        <Sparkles class="w-3.5 h-3.5 animate-pulse" />
        <span>Menganalisis setiap langkah Putih &amp; Hitam...</span>
      </div>
      <div class="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          class="h-full bg-[#81B64C] transition-all duration-150 rounded-full"
          :style="{ width: `${Math.max(8, analysisProgress)}%` }"
        />
      </div>
      <p class="font-mono text-xs text-zinc-400">
        {{ analysisProgress }}% selesai · Mengevaluasi taktik, blunder, dan langkah terbaik
      </p>
    </div>

    <!-- Full Loaded Review Body -->
    <div v-else class="p-4 space-y-3.5 max-h-[760px] overflow-y-auto">
      <!-- Coach Avatar + Crisp White Speech Bubble -->
      <div class="flex items-start gap-3">
        <!-- Editorial Coach Avatar -->
        <div
          class="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#3B4E3F] to-[#263229] border border-white/15 flex items-center justify-center shrink-0 overflow-hidden shadow-md"
          aria-hidden="true"
        >
          <svg viewBox="0 0 64 64" class="w-12 h-12">
            <!-- Jacket -->
            <path d="M10 62 C12 46 20 42 32 42 C44 42 52 46 54 62 Z" fill="#2E3F33" />
            <path d="M26 42 L32 52 L38 42 Z" fill="#EDEAE0" />
            <path d="M30 45 L32 54 L34 45 Z" fill="#B85D43" />
            <!-- Neck & Head -->
            <rect x="27" y="34" width="10" height="10" rx="4" fill="#E6B89C" />
            <ellipse cx="32" cy="26" rx="12" ry="13" fill="#E6B89C" />
            <!-- Hair & Beard -->
            <path d="M20 23 C20 12 44 12 44 23 C42 18 37 16 32 16 C27 16 22 18 20 23 Z" fill="#2A2421" />
            <path d="M21 28 C21 37 26 40 32 40 C38 40 43 37 43 28 C40 32 36 33 32 33 C28 33 24 32 21 28 Z" fill="#2A2421" opacity="0.92" />
            <!-- Eyes & Smile -->
            <circle cx="27.5" cy="25.5" r="1.5" fill="#1F1D1B" />
            <circle cx="36.5" cy="25.5" r="1.5" fill="#1F1D1B" />
            <path d="M28.5 31 Q32 33.5 35.5 31" stroke="#F7F5F0" stroke-width="1.6" stroke-linecap="round" fill="none" />
          </svg>
        </div>

        <!-- Speech Bubble -->
        <div class="relative flex-1 rounded-xl bg-white text-[#1E201E] px-3.5 py-2.5 shadow-sm">
          <!-- Speech pointer -->
          <span
            class="absolute top-4 -left-1.5 w-3 h-3 bg-white rotate-45 rounded-[2px]"
            aria-hidden="true"
          />

          <div v-if="activeMove" class="relative space-y-1.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5">
                <MoveClassificationBadge :classification="activeMove.classification" size="sm" />
                <span class="font-bold text-xs text-[#1E201E]">
                  {{ activeMove.moveNumber }}{{ activeMove.color === 'w' ? '.' : '...' }}
                  {{ activeMove.san }}
                </span>
                <span
                  class="text-[11px] font-semibold"
                  :style="{ color: CLASSIFICATION_MAP[activeMove.classification].color }"
                >
                  {{ CLASSIFICATION_MAP[activeMove.classification].labelId }}
                </span>
              </div>
              <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800">
                {{ formatEvalShort(activeMove.evalAfter, activeMove.isMate) }}
              </span>
            </div>

            <p class="text-xs leading-relaxed text-zinc-700">
              {{ activeMove.commentId }}
            </p>

            <!-- Best Move Suggestion & Save to Mistake Queue -->
            <div
              v-if="canSaveCurrentMistake"
              class="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80"
            >
              <span class="font-mono text-[11px] font-semibold text-[#3B5240]">
                Terbaik: {{ activeMove.bestMoveSan }}
              </span>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-[#202321] text-white hover:bg-[#3A4D3E] transition cursor-pointer"
                @click="saveMoveToMistakeQueue"
              >
                <BookmarkPlus class="w-3 h-3" />
                <span>
                  {{
                    savedMistakePly === activeMove.ply
                      ? 'Tersimpan di Latihan Ulang!'
                      : 'Simpan ke Latihan Ulang'
                  }}
                </span>
              </button>
            </div>
          </div>

          <div v-else class="relative space-y-0.5">
            <p class="text-xs font-bold text-[#1E201E]">{{ report.coachHeadline }}</p>
            <p class="text-xs leading-relaxed text-zinc-700">
              {{ report.coachSummary }}
            </p>
          </div>
        </div>
      </div>

      <!-- Interactive Advantage Graph with Colored Critical Dots -->
      <div class="space-y-1.5">
        <div
          class="rounded-xl overflow-hidden border border-white/10 bg-[#3B3A37] cursor-pointer relative"
          title="Klik titik mana pun untuk meninjau posisi langkah tersebut di papan"
        >
          <svg
            :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
            class="w-full h-[84px] block"
            role="img"
            aria-label="Grafik evaluasi keunggulan Putih dan Hitam"
            @click="onGraphClick"
          >
            <!-- White Advantage Area -->
            <path v-if="whiteAreaPath" :d="whiteAreaPath" fill="#F5F4F0" />

            <!-- Horizontal 0.0 Midline -->
            <line
              x1="0"
              :y1="MID_Y"
              :x2="SVG_W"
              :y2="MID_Y"
              stroke="#7A7874"
              stroke-width="1"
              stroke-opacity="0.7"
            />

            <!-- Active Ply Vertical Cursor -->
            <line
              :x1="activePlayheadX"
              y1="0"
              :x2="activePlayheadX"
              :y2="SVG_H"
              stroke="#81B64C"
              stroke-width="2"
              stroke-dasharray="3 2"
            />

            <!-- Colored Move Classification Dots -->
            <circle
              v-for="dot in notableDots"
              :key="dot.ply"
              :cx="dot.x"
              :cy="dot.y"
              :r="dot.ply === activePly ? 4.8 : 3.4"
              :fill="CLASSIFICATION_MAP[dot.classification!].color"
              :stroke="dot.ply === activePly ? '#FFFFFF' : '#212321'"
              stroke-width="1.3"
              class="cursor-pointer"
              @click.stop="emit('selectPly', dot.ply)"
            />
          </svg>
        </div>

        <!-- Step-by-Step Board Navigation Strip -->
        <div class="flex items-center justify-between gap-2 bg-[#1A1C1A] border border-white/8 rounded-xl px-2.5 py-1.5">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
              :disabled="activePly <= 0"
              title="Posisi Awal"
              @click="emit('selectPly', 0)"
            >
              <ChevronFirst class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
              :disabled="activePly <= 0"
              title="Langkah Sebelumnya (Panah Kiri)"
              @click="stepPrev"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
              :disabled="activePly >= totalPlies"
              title="Langkah Berikutnya (Panah Kanan)"
              @click="stepNext"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
              :disabled="activePly >= totalPlies"
              title="Posisi Akhir"
              @click="emit('selectPly', totalPlies)"
            >
              <ChevronLast class="w-4 h-4" />
            </button>
          </div>

          <span class="font-mono text-[11px] text-zinc-300 truncate">
            <template v-if="activeMove">
              {{ activeMove.color === 'w' ? 'Putih' : 'Hitam' }} ·
              {{ activeMove.moveNumber }}{{ activeMove.color === 'w' ? '.' : '...' }}{{ activeMove.san }}
            </template>
            <template v-else>
              Awal (0 / {{ totalPlies }} ply)
            </template>
          </span>
        </div>
      </div>

      <!-- TAB 1: RINGKASAN (Side-by-Side Putih vs Hitam matching Screenshot 1 & 2) -->
      <div v-if="activeTab === 'summary'" class="space-y-3">
        <!-- Players & Accuracy Grid -->
        <div class="grid grid-cols-[1fr_84px_34px_84px] items-center gap-x-2 gap-y-2.5 text-xs">
          <!-- Player Names Row -->
          <div />
          <div class="text-center text-[11px] font-semibold text-zinc-300 truncate px-1">
            {{ whiteName }}
          </div>
          <div />
          <div class="text-center text-[11px] font-semibold text-zinc-300 truncate px-1">
            {{ blackName }}
          </div>

          <!-- Pemain Avatars Row -->
          <div class="text-xs font-semibold text-zinc-200">Pemain</div>
          <div class="flex justify-center">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center border-2 p-1.5"
              :class="
                report.whiteAccuracy >= report.blackAccuracy
                  ? 'border-[#81B64C] bg-[#303330]'
                  : 'border-white/15 bg-[#2A2C2A]'
              "
            >
              <Cpu v-if="whiteIsBot" class="w-7 h-7 text-zinc-200" />
              <ChessPiece
                v-else-if="whiteAvatarPiece"
                :type="whiteAvatarPiece.type"
                :color="whiteAvatarPiece.color"
              />
              <ChessPiece v-else type="p" color="w" />
            </div>
          </div>
          <div />
          <div class="flex justify-center">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center border-2 p-1.5"
              :class="
                report.blackAccuracy > report.whiteAccuracy
                  ? 'border-[#81B64C] bg-[#303330]'
                  : 'border-white/15 bg-[#2A2C2A]'
              "
            >
              <Cpu v-if="blackIsBot" class="w-7 h-7 text-zinc-200" />
              <ChessPiece
                v-else-if="blackAvatarPiece"
                :type="blackAvatarPiece.type"
                :color="blackAvatarPiece.color"
              />
              <ChessPiece v-else type="p" color="b" />
            </div>
          </div>

          <!-- Akurasi Row -->
          <div class="text-xs font-semibold text-zinc-200">Akurasi</div>
          <div class="flex justify-center">
            <span class="w-full py-1.5 rounded-lg bg-white text-[#1B1D1B] font-mono text-sm font-extrabold text-center shadow-xs">
              {{ report.whiteAccuracy.toFixed(1) }}
            </span>
          </div>
          <div />
          <div class="flex justify-center">
            <span class="w-full py-1.5 rounded-lg bg-[#343734] text-white border border-white/12 font-mono text-sm font-extrabold text-center">
              {{ report.blackAccuracy.toFixed(1) }}
            </span>
          </div>
        </div>

        <!-- Keterampilan Row -->
        <div class="border-t border-b border-white/10 py-2.5 grid grid-cols-[1fr_84px_34px_84px] items-center gap-x-2 text-xs">
          <span class="font-semibold text-zinc-200">Keterampilan</span>
          <span class="text-center font-mono text-xs font-bold text-[#4EA4F5]">
            {{ report.skillLeader === 'w' ? `+${report.skillDelta}` : '' }}
          </span>
          <div class="flex justify-center">
            <span class="w-5 h-5 rounded-full bg-[#3897F0] text-white inline-flex items-center justify-center">
              <Star class="w-3 h-3" fill="currentColor" />
            </span>
          </div>
          <span class="text-center font-mono text-xs font-bold text-[#4EA4F5]">
            {{ report.skillLeader === 'b' ? `+${report.skillDelta}` : '' }}
          </span>
        </div>

        <!-- 10-Row Move Classification Breakdown -->
        <div class="space-y-1">
          <div
            v-for="cls in MOVE_CLASSIFICATIONS"
            :key="cls.key"
            class="grid grid-cols-[1fr_84px_34px_84px] items-center gap-x-2 py-1 rounded-lg hover:bg-white/[0.04] px-1 transition"
          >
            <span class="text-xs font-medium text-zinc-200">{{ cls.labelId }}</span>

            <!-- White Count (clickable if > 0) -->
            <button
              type="button"
              class="text-center font-mono text-xs font-bold py-0.5 rounded transition"
              :class="
                report.whiteCounts[cls.key] > 0
                  ? 'hover:bg-white/10 cursor-pointer underline-offset-2 hover:underline'
                  : 'opacity-45 cursor-default'
              "
              :style="{ color: cls.textColor }"
              :disabled="report.whiteCounts[cls.key] === 0"
              :title="
                report.whiteCounts[cls.key] > 0
                  ? `Klik untuk melompat ke langkah ${cls.labelId} milik ${whiteName}`
                  : ''
              "
              @click="jumpToCategoryMove('w', cls.key)"
            >
              {{ report.whiteCounts[cls.key] }}
            </button>

            <!-- Center Classification Badge -->
            <div class="flex justify-center">
              <MoveClassificationBadge :classification="cls.key" size="sm" />
            </div>

            <!-- Black Count (clickable if > 0) -->
            <button
              type="button"
              class="text-center font-mono text-xs font-bold py-0.5 rounded transition"
              :class="
                report.blackCounts[cls.key] > 0
                  ? 'hover:bg-white/10 cursor-pointer underline-offset-2 hover:underline'
                  : 'opacity-45 cursor-default'
              "
              :style="{ color: cls.textColor }"
              :disabled="report.blackCounts[cls.key] === 0"
              :title="
                report.blackCounts[cls.key] > 0
                  ? `Klik untuk melompat ke langkah ${cls.labelId} milik ${blackName}`
                  : ''
              "
              @click="jumpToCategoryMove('b', cls.key)"
            >
              {{ report.blackCounts[cls.key] }}
            </button>
          </div>
        </div>

        <!-- Rating Permainan Section (Matches Screenshot 2) -->
        <div class="border-t border-white/10 pt-3 grid grid-cols-[1fr_84px_34px_84px] items-center gap-x-2">
          <span class="text-xs font-semibold text-zinc-200">Rating Permainan</span>
          <div class="flex justify-center">
            <span class="w-full py-1.5 rounded-lg bg-white text-[#1B1D1B] font-mono text-sm font-extrabold text-center shadow-xs">
              {{ report.whiteGameRating }}
            </span>
          </div>
          <div />
          <div class="flex justify-center">
            <span class="w-full py-1.5 rounded-lg bg-[#343734] text-white border border-white/12 font-mono text-sm font-extrabold text-center">
              {{ report.blackGameRating }}
            </span>
          </div>
        </div>

        <!-- 4 Phase Grades: Pembukaan, Taktik, Strategi, Permainan Akhir (Matches Screenshot 2) -->
        <div class="border-t border-white/10 pt-3 space-y-2">
          <div
            v-for="row in report.phaseGrades"
            :key="row.key"
            class="grid grid-cols-[1fr_84px_34px_84px] items-center gap-x-2 py-0.5"
          >
            <span class="text-xs font-medium text-zinc-200">{{ row.labelId }}</span>
            <div class="flex justify-center">
              <MoveClassificationBadge
                v-if="row.whiteGrade"
                :classification="row.whiteGrade"
                size="md"
              />
              <span v-else class="font-mono text-xs text-zinc-500">—</span>
            </div>
            <div />
            <div class="flex justify-center">
              <MoveClassificationBadge
                v-if="row.blackGrade"
                :classification="row.blackGrade"
                size="md"
              />
              <span v-else class="font-mono text-xs text-zinc-500">—</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: ANALISIS LANGKAH (Step through White & Black moves with filters) -->
      <div v-else class="space-y-3">
        <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter langkah analisis">
          <button
            v-for="f in [
              { key: 'all', label: 'Semua' },
              { key: 'w', label: `Putih (${whiteName})` },
              { key: 'b', label: `Hitam (${blackName})` },
              { key: 'errors', label: 'Kesalahan & Blunder' }
            ]"
            :key="f.key"
            type="button"
            class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer"
            :class="
              moveFilter === f.key
                ? 'bg-[#81B64C] text-white border-[#81B64C]'
                : 'bg-white/[0.05] text-zinc-300 border-white/10 hover:bg-white/10'
            "
            @click="moveFilter = f.key as 'all' | 'w' | 'b' | 'errors'"
          >
            {{ f.label }}
          </button>
        </div>

        <div
          v-if="filteredMoves.length === 0"
          class="rounded-xl bg-white/[0.04] border border-white/8 p-4 text-center text-xs text-zinc-400"
        >
          Tidak ada langkah pada filter ini.
        </div>

        <div v-else class="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
          <button
            v-for="mv in filteredMoves"
            :key="mv.ply"
            type="button"
            class="w-full text-left px-3 py-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer"
            :class="
              activePly === mv.ply
                ? 'bg-white/14 border-[#81B64C] ring-1 ring-[#81B64C]/50'
                : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.08]'
            "
            @click="emit('selectPly', mv.ply)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <MoveClassificationBadge :classification="mv.classification" size="sm" />
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :class="mv.color === 'w' ? 'bg-white' : 'bg-zinc-600 ring-1 ring-zinc-400'"
              />
              <span class="font-mono text-xs font-bold text-white shrink-0">
                {{ mv.moveNumber }}{{ mv.color === 'w' ? '.' : '...' }} {{ mv.san }}
              </span>
              <span
                class="text-[11px] font-medium truncate"
                :style="{ color: CLASSIFICATION_MAP[mv.classification].textColor }"
              >
                {{ CLASSIFICATION_MAP[mv.classification].labelId }}
              </span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span
                v-if="
                  mv.classification === 'inaccuracy' ||
                  mv.classification === 'mistake' ||
                  mv.classification === 'miss' ||
                  mv.classification === 'blunder'
                "
                class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#81B64C]/20 text-[#B4DF86] border border-[#81B64C]/35"
              >
                Terbaik: {{ mv.bestMoveSan }}
              </span>
              <span class="font-mono text-[11px] text-zinc-300 w-10 text-right">
                {{ formatEvalShort(mv.evalAfter, mv.isMate) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Action Bar -->
    <div
      v-if="report && !isAnalyzing"
      class="px-4 py-3 bg-[#1B1D1B] border-t border-white/10 flex flex-wrap items-center gap-2"
    >
      <button
        type="button"
        class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#81B64C] text-white hover:bg-[#71A33F] active:scale-[0.98] transition cursor-pointer shadow-sm"
        @click="startWalkthrough"
      >
        <ListChecks class="w-4 h-4" />
        <span>Tinjau Langkah</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/16 border border-white/10 transition cursor-pointer"
        @click="handleDownloadCard"
      >
        <Download class="w-3.5 h-3.5" />
        <span>{{ exportedNotice ? 'PNG Diunduh!' : 'Kartu PNG' }}</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/16 border border-white/10 transition cursor-pointer"
        @click="emit('rematch')"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>Ulang</span>
      </button>
    </div>
  </section>
</template>
