<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  FlipVertical2,
  Lightbulb,
  RotateCcw,
  Target,
  Undo2
} from 'lucide-vue-next'
import type { HistoryMoveItem } from '~/components/MoveHistoryPanel.vue'
import type { FeedbackState } from '~/components/TrainerFeedbackBanner.vue'
import { findEndgameById, type EndgameScenario } from '~/utils/chessData'
import { computeBestEndgameMove, evaluateEndgamePosition, formatEvalLabel } from '~/utils/endgameEngine'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

const route = useRoute()
const { markLineMastered, recordMoveResult, recordMistake, isLineMastered } = useChessProgress()
const { isMuted } = useTheme()

const endgameId = computed(() => String(route.params.id ?? ''))
const endgameModule = computed(() => findEndgameById(endgameId.value))

const selectedScenarioIdx = ref(0)
const activeScenario = computed<EndgameScenario | undefined>(() => {
  const list = endgameModule.value?.scenarios ?? []
  return list[selectedScenarioIdx.value] ?? list[0]
})

interface EndgameSnapshot {
  fen: string
  lastMove: { from: string; to: string } | null
  san: string
  color: Color
  moveNumber: number
}

const snapshots = ref<EndgameSnapshot[]>([])
const viewingPly = ref<number | null>(null)
const orientation = ref<Color>('w')
const isEngineThinking = ref(false)
const liveEvalPawns = ref(0)
const scenarioResolved = ref(false)

// Feedback & Hint state
const feedbackState = ref<FeedbackState>('idle')
const feedbackTitle = ref('Siap Berlatih Babak Akhir')
const feedbackMessage = ref('')
const feedbackMoveSan = ref('')
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)

let engineTimer: ReturnType<typeof setTimeout> | null = null

function clearEngineTimer() {
  if (engineTimer) {
    clearTimeout(engineTimer)
    engineTimer = null
  }
}

const latestPly = computed(() => Math.max(0, snapshots.value.length - 1))
const displayedPly = computed(() => (viewingPly.value !== null ? viewingPly.value : latestPly.value))
const isInspectingHistory = computed(
  () => viewingPly.value !== null && viewingPly.value !== latestPly.value
)

const displayedSnapshot = computed<EndgameSnapshot>(() => {
  return (
    snapshots.value[displayedPly.value] ?? {
      fen: new Chess().fen(),
      lastMove: null,
      san: '',
      color: 'w',
      moveNumber: 0
    }
  )
})

const historyItems = computed<HistoryMoveItem[]>(() => {
  return snapshots.value.slice(1).map((snap, idx) => ({
    ply: idx + 1,
    san: snap.san,
    color: snap.color,
    moveNumber: snap.moveNumber
  }))
})

const isUserTurnNow = computed(() => {
  if (!activeScenario.value || isEngineThinking.value || isInspectingHistory.value) return false
  const g = new Chess(displayedSnapshot.value.fen)
  if (g.isGameOver()) return false
  return g.turn() === activeScenario.value.side
})

const canUndo = computed(() => snapshots.value.length > 1 && !isEngineThinking.value)

function evalColorBarWidth(): number {
  // Clamp -8..+8 pawns to 8%..92%
  const clamped = Math.max(-8, Math.min(8, liveEvalPawns.value))
  return Math.round(((clamped + 8) / 16) * 100)
}

function initScenario(idx = selectedScenarioIdx.value) {
  clearEngineTimer()
  selectedScenarioIdx.value = idx
  const sc = activeScenario.value
  if (!sc) return

  const g = new Chess(sc.fen)
  snapshots.value = [
    {
      fen: g.fen(),
      lastMove: null,
      san: '',
      color: g.turn(),
      moveNumber: 0
    }
  ]
  viewingPly.value = null
  orientation.value = sc.side
  isEngineThinking.value = false
  scenarioResolved.value = false
  hintFrom.value = null
  hintTo.value = null
  liveEvalPawns.value = Math.round((evaluateEndgamePosition(g) / 100) * 10) / 10

  feedbackState.value = 'idle'
  feedbackTitle.value = 'Target Posisi Aktif'
  feedbackMoveSan.value = ''
  feedbackMessage.value = sc.coachingHint
}

function checkOutcome(game: Chess, promotedByUser = false): boolean {
  const sc = activeScenario.value
  if (!sc) return false

  const rawEval = evaluateEndgamePosition(game) / 100
  liveEvalPawns.value = Math.round(rawEval * 10) / 10

  // 1. Checkmate
  if (game.isCheckmate()) {
    const winner: Color = game.turn() === 'w' ? 'b' : 'w'
    if (winner === sc.side) {
      scenarioResolved.value = true
      markLineMastered(sc.id)
      playSuccessChime(isMuted.value)
      feedbackState.value = 'completed'
      feedbackTitle.value = 'Skakmat! Skenario Dikuasai'
      feedbackMessage.value =
        'Eksekusi babak akhir yang presisi! Anda berhasil menuntaskan posisi hingga skakmat.'
    } else {
      playErrorSound(isMuted.value)
      feedbackState.value = 'mistake'
      feedbackTitle.value = 'Anda Terkena Skakmat'
      feedbackMessage.value =
        'Jangan khawatir: gunakan "Mundur 1 Langkah" atau "Ulangi Posisi" untuk memperbaiki manuver raja dan perwira Anda.'
    }
    return true
  }

  // 2. Official Draw (stalemate, insufficient material, repetition, 50-move)
  if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) {
    if (sc.goalType === 'draw') {
      scenarioResolved.value = true
      markLineMastered(sc.id)
      playSuccessChime(isMuted.value)
      feedbackState.value = 'completed'
      feedbackTitle.value = 'Remis Berhasil Dipertahankan!'
      feedbackMessage.value =
        'Pertahanan babak akhir yang sangat kokoh. Lawan tidak memiliki jalan untuk menembus posisi Anda.'
    } else {
      playErrorSound(isMuted.value)
      feedbackState.value = 'mistake'
      feedbackTitle.value = game.isStalemate() ? 'Posisi Berakhir Pat (Stalemate)' : 'Permainan Berakhir Remis'
      feedbackMessage.value =
        'Target skenario ini adalah menang. Perhatikan jebakan pat atau petak kunci sebelum memajukan pion terlalu dini.'
    }
    return true
  }

  // 3. Draw goal held solidly for target plies without conceding decisive material (e.g. promotion)
  if (
    sc.goalType === 'draw' &&
    !scenarioResolved.value &&
    sc.targetDrawPlies &&
    latestPly.value >= sc.targetDrawPlies &&
    Math.abs(rawEval) <= 4.5
  ) {
    scenarioResolved.value = true
    markLineMastered(sc.id)
    playSuccessChime(isMuted.value)
    feedbackState.value = 'completed'
    feedbackTitle.value = 'Pertahanan Sempurna: Target Remis Tercapai!'
    feedbackMessage.value =
      'Anda berhasil menetralkan serangan lawan dengan teknik babak akhir yang tepat. Anda tetap dapat terus bermain atau beralih ke skenario lain.'
    return false
  }

  // 4. Win goal: decisive promotion achieved by user
  const userAdv = sc.side === 'w' ? rawEval : -rawEval
  if (sc.goalType === 'win' && !scenarioResolved.value && promotedByUser && userAdv >= 6.5) {
    scenarioResolved.value = true
    markLineMastered(sc.id)
    playSuccessChime(isMuted.value)
    feedbackState.value = 'completed'
    feedbackTitle.value = 'Promosi Sukses: Teknik Dikuasai!'
    feedbackMessage.value =
      'Luar biasa! Pion Anda berhasil promosi dengan keunggulan mutlak. Lanjutkan hingga skakmat atau latih skenario berikutnya.'
    return false
  }

  return false
}

function triggerEngineReply() {
  clearEngineTimer()
  const sc = activeScenario.value
  if (!sc) return
  const currentSnap = snapshots.value[latestPly.value]
  if (!currentSnap) return

  const g = new Chess(currentSnap.fen)
  if (g.isGameOver() || g.turn() === sc.side) return

  isEngineThinking.value = true
  engineTimer = setTimeout(() => {
    const result = computeBestEndgameMove(currentSnap.fen, 4)
    isEngineThinking.value = false

    if (!result.move) return

    const after = new Chess(currentSnap.fen)
    const played = after.move(result.move)
    const plyIdx = snapshots.value.length
    const moveNumber = Math.ceil(plyIdx / 2)

    snapshots.value = [
      ...snapshots.value,
      {
        fen: after.fen(),
        lastMove: { from: played.from, to: played.to },
        san: played.san,
        color: played.color,
        moveNumber
      }
    ]
    viewingPly.value = null
    liveEvalPawns.value = result.evaluation

    if (played.san.includes('+') || played.san.includes('#')) {
      playCheckSound(isMuted.value)
    } else if (played.captured) {
      playWoodenCapture(isMuted.value)
    } else {
      playWoodenMove(isMuted.value)
    }

    const ended = checkOutcome(after, false)
    if (!ended && !scenarioResolved.value) {
      feedbackTitle.value = `Lawan membalas ${played.san}`
      feedbackMoveSan.value = played.san
    }
  }, 380)
}

function handleUserMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  const sc = activeScenario.value
  if (!sc || !isUserTurnNow.value) return

  const currentSnap = snapshots.value[latestPly.value]
  if (!currentSnap) return

  const g = new Chess(currentSnap.fen)
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

  hintFrom.value = null
  hintTo.value = null

  const plyIdx = snapshots.value.length
  const moveNumber = Math.ceil(plyIdx / 2)

  snapshots.value = [
    ...snapshots.value,
    {
      fen: g.fen(),
      lastMove: { from: played.from, to: played.to },
      san: played.san,
      color: played.color,
      moveNumber
    }
  ]
  viewingPly.value = null

  if (played.san.includes('+') || played.san.includes('#')) {
    playCheckSound(isMuted.value)
  } else if (played.captured) {
    playWoodenCapture(isMuted.value)
  } else {
    playWoodenMove(isMuted.value)
  }

  // Record first-move accuracy against key textbook ideas & queue mistake if inaccurate
  if (plyIdx === 1) {
    const isRecommended = sc.recommendedFirstMoves.includes(played.san)
    recordMoveResult(sc.id, isRecommended)
    if (isRecommended) {
      feedbackState.value = 'correct'
      feedbackTitle.value = 'Langkah Pembuka Babak Akhir Sangat Tepat!'
      feedbackMoveSan.value = played.san
      feedbackMessage.value =
        'Langkah ini sesuai prinsip klasik teori babak akhir. Pertahankan presisi Anda terhadap respons lawan.'
    } else {
      const expectedFirst = sc.recommendedFirstMoves[0]
      if (expectedFirst) {
        recordMistake({
          source: 'endgame',
          title: `${endgameModule.value?.title ?? 'Babak Akhir'}: ${sc.title}`,
          fen: currentSnap.fen,
          expectedSan: expectedFirst,
          side: sc.side
        })
      }
      feedbackState.value = 'idle'
      feedbackTitle.value = `Anda memainkan ${played.san}`
      feedbackMoveSan.value = played.san
      feedbackMessage.value =
        'Lawan latih akan merespons secara aktif. Posisi ini juga dicatat di Buku Catatan Kesalahan untuk latihan ulang.'
    }
  } else if (!scenarioResolved.value) {
    feedbackState.value = 'idle'
    feedbackTitle.value = `Anda memainkan ${played.san}`
    feedbackMoveSan.value = played.san
    feedbackMessage.value = 'Lawan latih sedang menghitung respons terbaik...'
  }

  const ended = checkOutcome(g, Boolean(played.promotion))
  if (!ended) {
    triggerEngineReply()
  }
}

function undoOneStep() {
  if (!canUndo.value || !activeScenario.value) return
  clearEngineTimer()
  hintFrom.value = null
  hintTo.value = null

  // Undo back to user's turn (usually 2 plies if engine replied, or 1 ply if game ended right after user's move)
  let nextLen = snapshots.value.length - 1
  if (nextLen > 1) {
    const candidate = snapshots.value[nextLen - 1]
    if (candidate) {
      const g = new Chess(candidate.fen)
      if (g.turn() !== activeScenario.value.side) {
        nextLen -= 1
      }
    }
  }

  snapshots.value = snapshots.value.slice(0, Math.max(1, nextLen))
  viewingPly.value = null

  const cur = snapshots.value[snapshots.value.length - 1]
  if (cur) {
    const g = new Chess(cur.fen)
    liveEvalPawns.value = Math.round((evaluateEndgamePosition(g) / 100) * 10) / 10
  }

  feedbackState.value = 'idle'
  feedbackTitle.value = 'Langkah Dimundurkan'
  feedbackMoveSan.value = ''
  feedbackMessage.value = 'Silakan coba alternatif langkah lain dari posisi ini.'
}

function requestEngineHint() {
  if (!isUserTurnNow.value) return
  const res = computeBestEndgameMove(displayedSnapshot.value.fen, 4)
  if (!res.move) return
  hintFrom.value = res.move.from
  hintTo.value = res.move.to
  feedbackState.value = 'idle'
  feedbackTitle.value = `Saran Engine: ${res.move.san}`
  feedbackMoveSan.value = res.move.san
  feedbackMessage.value = `Engine menyarankan memindahkan perwira dari ${res.move.from} ke ${res.move.to} (${formatEvalLabel(res.evaluation)}).`
}

function handleSelectPly(ply: number) {
  viewingPly.value = ply
}

watch(
  () => endgameModule.value?.id,
  () => {
    if (endgameModule.value) {
      initScenario(0)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearEngineTimer()
})
</script>

<template>
  <div v-if="!endgameModule || !activeScenario" class="py-16 text-center space-y-4">
    <h1 class="font-serif text-2xl font-semibold">Modul Babak Akhir Tidak Ditemukan</h1>
    <NuxtLink
      to="/dashboard"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#18181B] text-white"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Beranda
    </NuxtLink>
  </div>

  <div v-else class="space-y-6">
    <!-- Header -->
    <div>
      <NuxtLink
        to="/dashboard"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition mb-2"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span>Kembali ke Pustaka Repertoar</span>
      </NuxtLink>

      <div class="flex flex-wrap items-center gap-2.5">
        <h1 class="font-serif text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {{ endgameModule.title }}
        </h1>
        <span
          class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#B85D43]/15 text-[#9A4831] dark:bg-[#B85D43]/25 dark:text-[#E8A592]"
        >
          Lab Babak Akhir · Minimax AI
        </span>
      </div>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
        {{ endgameModule.subtitle }}
      </p>
    </div>

    <!-- Scenario Switcher Tabs -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="(sc, idx) in endgameModule.scenarios"
        :key="sc.id"
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer"
        :class="
          selectedScenarioIdx === idx
            ? 'bg-[#18181B] text-white border-[#18181B] dark:bg-[#EDEAE0] dark:text-[#18181B] dark:border-[#EDEAE0]'
            : 'bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-800 hover:border-[#738578]'
        "
        @click="initScenario(idx)"
      >
        <CheckCircle2
          v-if="isLineMastered(sc.id)"
          class="w-3.5 h-3.5"
          :class="selectedScenarioIdx === idx ? 'text-emerald-400 dark:text-emerald-700' : 'text-emerald-600'"
        />
        <span>{{ sc.title }}</span>
      </button>
    </div>

    <!-- Clear Objective Banner -->
    <div
      class="rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      :class="
        activeScenario.goalType === 'win'
          ? 'bg-[#F1F5F2] dark:bg-[#1B241E] border-[#C5D5CA] dark:border-[#334A3B]'
          : 'bg-[#FBF5F1] dark:bg-[#261D19] border-[#E6CFC3] dark:border-[#5C3A2C]'
      "
    >
      <div class="flex items-start gap-3">
        <Target
          class="w-5 h-5 mt-0.5 shrink-0"
          :class="
            activeScenario.goalType === 'win'
              ? 'text-[#47604E] dark:text-[#9FC0A8]'
              : 'text-[#B85D43] dark:text-[#E59880]'
          "
        />
        <div>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Misi Skenario ({{ activeScenario.side === 'w' ? 'Anda: Putih' : 'Anda: Hitam' }})
          </span>
          <p class="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {{ activeScenario.objective }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span
          class="inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
        >
          <Cpu class="w-3.5 h-3.5 text-[#5D7463]" />
          <span>{{ isEngineThinking ? 'Menghitung...' : formatEvalLabel(liveEvalPawns) }}</span>
        </span>
      </div>
    </div>

    <!-- Main Two-Column Lab Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <!-- Board Column -->
      <div class="lg:col-span-7 space-y-4">
        <ChessBoard
          :fen="displayedSnapshot.fen"
          :orientation="orientation"
          :interactive="isUserTurnNow"
          :allowed-color="activeScenario.side"
          :last-move="displayedSnapshot.lastMove"
          :hint-from="isInspectingHistory ? null : hintFrom"
          :hint-to="isInspectingHistory ? null : hintTo"
          @move="handleUserMove"
        />

        <!-- Return to live play banner if inspecting history -->
        <div
          v-if="isInspectingHistory"
          class="max-w-[560px] mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
        >
          <span class="text-amber-900 dark:text-amber-200 font-medium">
            Meninjau ply ke-{{ displayedPly }} dari {{ latestPly }}.
          </span>
          <button
            type="button"
            class="px-3 py-1 rounded-lg font-semibold bg-amber-900 text-white dark:bg-amber-200 dark:text-amber-950 cursor-pointer"
            @click="viewingPly = null"
          >
            Kembali ke Posisi Aktif
          </button>
        </div>

        <!-- Lab Controls -->
        <div class="max-w-[560px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 transition cursor-pointer"
            :disabled="!canUndo"
            @click="undoOneStep"
          >
            <Undo2 class="w-4 h-4" />
            <span>Mundur 1 Langkah</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#B85D43] disabled:opacity-40 transition cursor-pointer"
            :disabled="!isUserTurnNow"
            @click="requestEngineHint"
          >
            <Lightbulb class="w-4 h-4 text-[#B85D43]" />
            <span>Saran Engine</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="initScenario(selectedScenarioIdx)"
          >
            <RotateCcw class="w-4 h-4" />
            <span>Ulangi Posisi</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="orientation = orientation === 'w' ? 'b' : 'w'"
          >
            <FlipVertical2 class="w-4 h-4" />
            <span>Putar Papan</span>
          </button>
        </div>
      </div>

      <!-- Right Sidebar -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Evaluation Meter -->
        <div
          class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4"
        >
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-medium text-zinc-500 dark:text-zinc-400">Evaluasi Posisi (Engine)</span>
            <span class="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
              {{ formatEvalLabel(liveEvalPawns) }}
            </span>
          </div>
          <div class="h-2.5 rounded-full bg-zinc-800 dark:bg-zinc-950 overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-700">
            <div
              class="h-full bg-[#EDEAE0] transition-all duration-500"
              :style="{ width: `${evalColorBarWidth()}%` }"
            />
          </div>
          <div class="flex justify-between text-[10px] font-mono text-zinc-400 mt-1.5">
            <span>Putih</span>
            <span>Seimbang</span>
            <span>Hitam</span>
          </div>
        </div>

        <!-- Feedback Banner -->
        <TrainerFeedbackBanner
          :state="feedbackState"
          :title="feedbackTitle"
          :message="feedbackMessage"
          :move-san="feedbackMoveSan"
        />

        <!-- Strategic Principles -->
        <div
          class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4"
        >
          <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
            Prinsip Kunci Babak Akhir
          </h3>
          <ol class="space-y-2.5">
            <li
              v-for="(principle, pIdx) in activeScenario.principles"
              :key="pIdx"
              class="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
            >
              <span
                class="w-5 h-5 rounded-full bg-[#F8F7F4] dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5 text-[#5D7463] dark:text-[#98B39F]"
              >
                {{ pIdx + 1 }}
              </span>
              <span>{{ principle }}</span>
            </li>
          </ol>
        </div>

        <!-- Move History -->
        <MoveHistoryPanel
          :moves="historyItems"
          :active-ply="displayedPly"
          empty-message="Mainkan langkah pertama Anda. Lawan latih Minimax akan merespons secara dinamis."
          @select-ply="handleSelectPly"
        />
      </div>
    </div>
  </div>
</template>
