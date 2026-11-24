<script setup lang="ts">
import type { Color } from 'chess.js'
import {
  AlertTriangle,
  Award,
  Compass,
  Download,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-vue-next'
import { exportAchievementCardPng } from '~/utils/matchCardCanvas'

export interface MatchEvalPoint {
  ply: number
  san: string
  fen: string
  beforeFen: string
  score: number // clamped -8..+8 from White's perspective
  color: Color
}

const props = defineProps<{
  open: boolean
  resultTitle: string
  resultSubtitle: string
  botName: string
  botElo: number
  humanSide: Color
  finalFen: string
  evalHistory: MatchEvalPoint[]
}>()

const emit = defineEmits<{
  close: []
  rematch: []
}>()

const { progress } = useChessProgress()
const { currentBoardPalette, pieceSet, isDark } = useTheme()

const exportedNotice = ref(false)

const points = computed(() => {
  const list = props.evalHistory
  if (list.length === 0) {
    return [{ ply: 0, san: 'Awal', fen: props.finalFen, beforeFen: props.finalFen, score: 0, color: 'w' as Color }]
  }
  return list
})

// Pure SVG Advantage Graph geometry (viewBox 0 0 600 180)
const SVG_W = 600
const SVG_H = 180
const PAD_X = 16
const PAD_Y = 14
const MID_Y = SVG_H / 2

function scoreToY(score: number): number {
  const clamped = Math.max(-8, Math.min(8, score))
  const usable = SVG_H / 2 - PAD_Y
  return MID_Y - (clamped / 8) * usable
}

const chartCoords = computed(() => {
  const arr = points.value
  const denom = Math.max(1, arr.length - 1)
  return arr.map((pt, idx) => ({
    ...pt,
    x: PAD_X + (idx / denom) * (SVG_W - PAD_X * 2),
    y: scoreToY(pt.score)
  }))
})

const linePath = computed(() => {
  if (chartCoords.value.length === 0) return ''
  return chartCoords.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
})

const areaPath = computed(() => {
  const coords = chartCoords.value
  if (coords.length < 2) return ''
  const first = coords[0]!
  const last = coords[coords.length - 1]!
  return `${linePath.value} L ${last.x.toFixed(1)} ${MID_Y} L ${first.x.toFixed(1)} ${MID_Y} Z`
})

interface CriticalMoment {
  kind: 'best' | 'blunder'
  label: string
  ply: number
  san: string
  swing: number
  fen: string
  summary: string
}

// Identify up to 2 player-side critical moments (Best Move + Critical Blunder)
const criticalMoments = computed<CriticalMoment[]>(() => {
  const arr = props.evalHistory
  if (arr.length < 2) return []

  const playerMoves: Array<{ pt: MatchEvalPoint; delta: number }> = []
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1]!
    const cur = arr[i]!
    if (cur.color !== props.humanSide) continue
    const prevPerspective = props.humanSide === 'w' ? prev.score : -prev.score
    const curPerspective = props.humanSide === 'w' ? cur.score : -cur.score
    playerMoves.push({
      pt: cur,
      delta: Math.round((curPerspective - prevPerspective) * 10) / 10
    })
  }

  if (playerMoves.length === 0) return []

  const moments: CriticalMoment[] = []

  // Best move (highest positive swing or highest stability)
  const sortedBest = [...playerMoves].sort((a, b) => b.delta - a.delta)
  const best = sortedBest[0]
  if (best) {
    moments.push({
      kind: 'best',
      label: 'Langkah Terbaik',
      ply: best.pt.ply,
      san: best.pt.san,
      swing: best.delta,
      fen: best.pt.fen,
      summary:
        best.delta >= 0.8
          ? `Membalikkan atau memperbesar keunggulan sebesar ${best.delta > 0 ? `+${best.delta.toFixed(1)}` : best.delta.toFixed(1)} pion.`
          : 'Menjaga kendali posisi dengan akurasi stabil di momen penting.'
    })
  }

  // Critical blunder (steepest negative drop, distinct from best)
  const sortedWorst = [...playerMoves].sort((a, b) => a.delta - b.delta)
  const worst = sortedWorst.find((m) => m.pt.ply !== best?.pt.ply && m.delta <= -0.6)
  if (worst) {
    moments.push({
      kind: 'blunder',
      label: 'Kesalahan Kritis',
      ply: worst.pt.ply,
      san: worst.pt.san,
      swing: worst.delta,
      fen: worst.pt.beforeFen,
      summary: `Evaluasi turun ${Math.abs(worst.delta).toFixed(1)} pion. Buka posisi sebelum langkah ini di Sandbox untuk mencari alternatif terbaik.`
    })
  }

  return moments
})

const estimatedAccuracy = computed<number>(() => {
  const arr = props.evalHistory
  if (arr.length < 2) return 85
  let penaltySum = 0
  let count = 0
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1]!
    const cur = arr[i]!
    if (cur.color !== props.humanSide) continue
    const prevP = props.humanSide === 'w' ? prev.score : -prev.score
    const curP = props.humanSide === 'w' ? cur.score : -cur.score
    const drop = Math.max(0, prevP - curP)
    penaltySum += Math.min(4.5, drop)
    count += 1
  }
  if (count === 0) return 88
  const avgDrop = penaltySum / count
  return Math.max(28, Math.min(99, Math.round(100 - avgDrop * 18)))
})

function handleDownloadCard() {
  const ok = exportAchievementCardPng({
    title: props.resultTitle,
    subtitle: `Lawan ${props.botName} (${props.botElo} ELO) · ${props.resultSubtitle}`,
    badgeLabel: 'Laporan Pertandingan',
    fen: props.finalFen,
    orientation: props.humanSide,
    accuracyPercent: estimatedAccuracy.value,
    streakDays: progress.value.streakDays,
    extraMetricLabel: 'Rating Bot',
    extraMetricValue: `${props.botElo} ELO`,
    palette: currentBoardPalette.value,
    pieceSet: pieceSet.value,
    theme: isDark.value ? 'cosmic' : 'cream'
  })
  if (ok) {
    exportedNotice.value = true
    setTimeout(() => {
      exportedNotice.value = false
    }, 2600)
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition name="report-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-[#1E1B38]/65 dark:bg-black/75 backdrop-blur-[3px] flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Laporan Analisis Pasca-Pertandingan"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-2xl rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-2xl overflow-hidden my-auto"
        >
          <!-- Editorial Charcoal Header -->
          <div class="bg-[#1B1E1C] dark:bg-[#121214] px-6 py-5 text-[#F7F5F0] border-b border-white/10 flex items-start justify-between gap-4">
            <div class="space-y-1">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 font-mono text-[10px] uppercase tracking-[0.14em] font-semibold">
                <Award class="w-3.5 h-3.5 text-[#D4B064]" />
                <span>Laporan Pasca-Pertandingan</span>
              </div>
              <h2 class="font-serif text-2xl font-semibold leading-tight">
                {{ resultTitle }}
              </h2>
              <p class="text-xs text-zinc-300">
                {{ resultSubtitle }} · {{ botName }} ({{ botElo }} ELO)
              </p>
            </div>

            <button
              type="button"
              class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              aria-label="Tutup Laporan Pertandingan"
              @click="emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-6">
            <!-- Accuracy & Quick Summary Strip -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-3.5">
                <span class="block font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                  Akurasi Partai
                </span>
                <span class="font-serif text-2xl font-semibold text-[#202321] dark:text-zinc-100 mt-1 block">
                  {{ estimatedAccuracy }}%
                </span>
              </div>
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-3.5">
                <span class="block font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                  Total Langkah
                </span>
                <span class="font-serif text-2xl font-semibold text-[#202321] dark:text-zinc-100 mt-1 block">
                  {{ Math.max(0, evalHistory.length - 1) }} ply
                </span>
              </div>
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-3.5">
                <span class="block font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                  Rating Lawan
                </span>
                <span class="font-serif text-2xl font-semibold text-[#526857] dark:text-[#A4CBB3] mt-1 block">
                  {{ botElo }}
                </span>
              </div>
            </div>

            <!-- Pure SVG Advantage Graph -->
            <div class="rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900/80 p-4 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#202321] dark:text-zinc-100">
                  <TrendingUp class="w-4 h-4 text-[#526857] dark:text-[#9DB5A1]" />
                  <span>Grafik Keunggulan (Advantage Graph)</span>
                </span>
                <div class="flex items-center gap-3 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span class="inline-flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-[#718675]" />
                    Putih (+)
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-[#B85D43]" />
                    Hitam (-)
                  </span>
                </div>
              </div>

              <div class="w-full overflow-hidden rounded-xl bg-white dark:bg-[#19191D] border border-[#E4DFD5] dark:border-zinc-800">
                <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full h-40 block" role="img" aria-label="Grafik keunggulan evaluasi langkah demi langkah">
                  <defs>
                    <clipPath id="adv-clip-pos">
                      <rect x="0" y="0" :width="SVG_W" :height="MID_Y" />
                    </clipPath>
                    <clipPath id="adv-clip-neg">
                      <rect x="0" :y="MID_Y" :width="SVG_W" :height="SVG_H - MID_Y" />
                    </clipPath>
                  </defs>

                  <line x1="0" :y1="MID_Y" :x2="SVG_W" :y2="MID_Y" stroke="currentColor" stroke-dasharray="4 4" class="text-zinc-300 dark:text-zinc-700" stroke-width="1" />
                  <text x="6" :y="MID_Y - 4" class="fill-zinc-500 dark:fill-zinc-400" font-size="9" font-family="JetBrains Mono, monospace">
                    0.0
                  </text>

                  <path
                    v-if="areaPath"
                    :d="areaPath"
                    clip-path="url(#adv-clip-pos)"
                    fill="#718675"
                    fill-opacity="0.34"
                  />
                  <path
                    v-if="areaPath"
                    :d="areaPath"
                    clip-path="url(#adv-clip-neg)"
                    fill="#B85D43"
                    fill-opacity="0.34"
                  />

                  <path
                    v-if="linePath"
                    :d="linePath"
                    fill="none"
                    stroke="#526857"
                    stroke-width="2.2"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />

                  <circle
                    v-for="m in criticalMoments"
                    :key="m.ply"
                    :cx="chartCoords[m.ply]?.x ?? PAD_X"
                    :cy="chartCoords[m.ply]?.y ?? MID_Y"
                    r="4.5"
                    :fill="m.kind === 'best' ? '#526857' : '#B85D43'"
                    stroke="#FFFFFF"
                    stroke-width="1.8"
                  />
                </svg>
              </div>
            </div>

            <!-- Critical Moments -->
            <div v-if="criticalMoments.length > 0" class="space-y-2.5">
              <h3 class="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 dark:text-zinc-400">
                Momen Kritis Sisi Anda
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  v-for="moment in criticalMoments"
                  :key="moment.kind"
                  class="rounded-xl border p-4 flex flex-col justify-between gap-3"
                  :class="
                    moment.kind === 'best'
                      ? 'bg-[#718675]/10 border-[#718675]/35'
                      : 'bg-[#B85D43]/10 border-[#B85D43]/35'
                  "
                >
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <span
                        class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-bold"
                        :class="
                          moment.kind === 'best'
                            ? 'text-[#3B4E3F] dark:text-[#A4CBB3]'
                            : 'text-[#9E4931] dark:text-[#F0B39E]'
                        "
                      >
                        <Sparkles v-if="moment.kind === 'best'" class="w-3.5 h-3.5" />
                        <AlertTriangle v-else class="w-3.5 h-3.5" />
                        <span>{{ moment.label }}</span>
                      </span>
                      <span class="font-mono text-xs font-bold text-[#202321] dark:text-zinc-100">
                        #{{ Math.ceil(moment.ply / 2) }} {{ moment.san }}
                      </span>
                    </div>

                    <p class="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {{ moment.summary }}
                    </p>
                  </div>

                  <NuxtLink
                    :to="`/sandbox?fen=${encodeURIComponent(moment.fen)}`"
                    class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-white dark:bg-zinc-900 text-[#202321] dark:text-zinc-100 border border-[#E4DFD5] dark:border-zinc-700 hover:border-[#718675] transition"
                    @click="emit('close')"
                  >
                    <Compass class="w-3.5 h-3.5 text-[#526857] dark:text-[#9DB5A1]" />
                    <span>Tinjau di Sandbox</span>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div
            class="px-6 py-4 border-t border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900/70 flex flex-wrap items-center justify-between gap-2.5"
          >
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#526857] text-white hover:bg-[#435648] active:scale-[0.98] transition cursor-pointer shadow-sm"
              @click="handleDownloadCard"
            >
              <Download class="w-4 h-4" />
              <span>{{ exportedNotice ? 'Kartu PNG Diunduh!' : 'Unduh Kartu Prestasi (PNG)' }}</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:opacity-92 transition cursor-pointer"
                @click="
                  () => {
                    emit('close')
                    emit('rematch')
                  }
                "
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Tanding Ulang</span>
              </button>
              <button
                type="button"
                class="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E4DFD5] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#202321] dark:text-zinc-200 hover:border-[#718675] transition cursor-pointer"
                @click="emit('close')"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.report-fade-enter-active,
.report-fade-leave-active {
  transition: opacity 0.18s ease;
}
.report-fade-enter-from,
.report-fade-leave-to {
  opacity: 0;
}
</style>
