<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Cpu,
  Download,
  FlipVertical2,
  GitBranch,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Undo2
} from 'lucide-vue-next'
import type { HistoryMoveItem } from '~/components/MoveHistoryPanel.vue'
import type { FeedbackState } from '~/components/TrainerFeedbackBanner.vue'
import { findOpeningById, type OpeningLine } from '~/utils/chessData'
import { computeBestEndgameMove, evaluateEndgamePosition, formatEvalLabel } from '~/utils/endgameEngine'
import { exportAchievementCardPng } from '~/utils/matchCardCanvas'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

const route = useRoute()
const { progress, recordMoveResult, recordMistake, markLineMastered, isLineMastered } = useChessProgress()
const { isMuted, currentBoardPalette, pieceSet, isDark } = useTheme()
const cardDownloaded = ref(false)

const openingId = computed(() => String(route.params.id ?? ''))
const opening = computed(() => findOpeningById(openingId.value, progress.value.customOpenings))

const selectedLineIndex = ref(0)
const trainerMode = ref<'drill' | 'study'>('drill')
const orientation = ref<Color>('w')

// Live drill state
const activeLine = computed<OpeningLine | undefined>(() => {
  const lines = opening.value?.lines ?? []
  return lines[selectedLineIndex.value] ?? lines[0]
})

const currentPly = ref(0) // How far the user has progressed in drill mode (0..line.moves.length)
const viewingPly = ref<number | null>(null) // When non-null, user is inspecting an earlier ply
const isOpponentThinking = ref(false)
const sessionAttempts = ref(0)
const sessionCorrect = ref(0)

// Free Analysis Branch state (for Chess.com-style exploration in Study Mode)
const analysisBranchStartPly = ref<number | null>(null)
const analysisSnapshots = ref<PlySnapshot[]>([])
const analysisPly = ref(0) // 0 = at or before branch point, 1..N = inside branch
const analysisEvalPawns = ref(0)
const isAnalyzingMove = ref(false)

// Visual feedback state
const feedbackState = ref<FeedbackState>('idle')
const feedbackTitle = ref('Siap Memulai Latihan')
const feedbackMessage = ref('Temukan langkah repertoar terbaik untuk warna Anda.')
const feedbackMoveSan = ref('')
const correctSquare = ref<string | null>(null)
const errorSquare = ref<string | null>(null)
const shakeBoard = ref(false)
const hintLevel = ref(0) // 0 = none, 1 = source square, 2 = source + dest
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)

let opponentTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (opponentTimer) {
    clearTimeout(opponentTimer)
    opponentTimer = null
  }
  if (shakeTimer) {
    clearTimeout(shakeTimer)
    shakeTimer = null
  }
}

// Precompute full snapshots for the active line so any ply can be inspected instantaneously
interface PlySnapshot {
  fen: string
  lastMove: { from: string; to: string } | null
  san: string
  color: Color
  moveNumber: number
  explanation: string
  mistakeHint?: string
}

const lineSnapshots = computed<PlySnapshot[]>(() => {
  const op = opening.value
  const line = activeLine.value
  if (!op || !line) return []

  const game = op.startingFen ? new Chess(op.startingFen) : new Chess()
  const list: PlySnapshot[] = [
    {
      fen: game.fen(),
      lastMove: null,
      san: '',
      color: game.turn(),
      moveNumber: 0,
      explanation: line.description
    }
  ]

  for (let i = 0; i < line.moves.length; i++) {
    const node = line.moves[i]!
    const moveNumber = Math.floor(i / 2) + 1
    try {
      const m = game.move(node.san)
      list.push({
        fen: game.fen(),
        lastMove: { from: m.from, to: m.to },
        san: m.san,
        color: m.color,
        moveNumber,
        explanation: node.explanation,
        mistakeHint: node.mistakeHint
      })
    } catch {
      break
    }
  }
  return list
})

const maxPly = computed(() => Math.max(0, lineSnapshots.value.length - 1))

const isInAnalysisBranch = computed(
  () =>
    trainerMode.value === 'study' &&
    analysisBranchStartPly.value !== null &&
    analysisSnapshots.value.length > 0
)

const displayedPly = computed(() => {
  if (trainerMode.value === 'study') {
    if (isInAnalysisBranch.value && analysisPly.value > 0) {
      return (analysisBranchStartPly.value ?? 0) + analysisPly.value
    }
    return viewingPly.value ?? currentPly.value
  }
  return viewingPly.value !== null ? viewingPly.value : currentPly.value
})

const isInspectingHistory = computed(
  () => trainerMode.value === 'drill' && viewingPly.value !== null && viewingPly.value !== currentPly.value
)

const displayedSnapshot = computed<PlySnapshot>(() => {
  if (isInAnalysisBranch.value && analysisPly.value > 0) {
    const branchSnap = analysisSnapshots.value[analysisPly.value - 1]
    if (branchSnap) return branchSnap
  }
  const bookIndex =
    trainerMode.value === 'study' ? (viewingPly.value ?? currentPly.value) : displayedPly.value
  return (
    lineSnapshots.value[bookIndex] ?? {
      fen: new Chess().fen(),
      lastMove: null,
      san: '',
      color: 'w',
      moveNumber: 0,
      explanation: ''
    }
  )
})

const visibleHistoryMoves = computed<HistoryMoveItem[]>(() => {
  if (trainerMode.value === 'study' && isInAnalysisBranch.value) {
    const startPly = analysisBranchStartPly.value ?? 0
    const items: HistoryMoveItem[] = []
    for (let ply = 1; ply <= startPly; ply++) {
      const snap = lineSnapshots.value[ply]
      if (!snap) continue
      items.push({
        ply,
        san: snap.san,
        color: snap.color,
        moveNumber: snap.moveNumber,
        isBook: true
      })
    }
    for (let i = 0; i < analysisSnapshots.value.length; i++) {
      const snap = analysisSnapshots.value[i]!
      items.push({
        ply: startPly + i + 1,
        san: snap.san,
        color: snap.color,
        moveNumber: snap.moveNumber,
        isBook: false
      })
    }
    return items
  }

  const limit = trainerMode.value === 'study' ? maxPly.value : currentPly.value
  const items: HistoryMoveItem[] = []
  for (let ply = 1; ply <= limit; ply++) {
    const snap = lineSnapshots.value[ply]
    if (!snap) continue
    items.push({
      ply,
      san: snap.san,
      color: snap.color,
      moveNumber: snap.moveNumber,
      isBook: true
    })
  }
  return items
})

const analysisBranchLineText = computed(() => {
  if (!isInAnalysisBranch.value) return ''
  return analysisSnapshots.value
    .map((s, idx) => {
      if (s.color === 'w') return `${s.moveNumber}. ${s.san}`
      return idx === 0 ? `${s.moveNumber}... ${s.san}` : s.san
    })
    .join(' ')
})

const nextExpectedNode = computed(() => {
  if (!activeLine.value || currentPly.value >= maxPly.value) return null
  return activeLine.value.moves[currentPly.value] ?? null
})

const isUserTurnNow = computed(() => {
  if (!opening.value || trainerMode.value !== 'drill' || isInspectingHistory.value) return false
  if (currentPly.value >= maxPly.value || isOpponentThinking.value) return false
  const g = new Chess(displayedSnapshot.value.fen)
  return g.turn() === opening.value.side
})

const isBoardInteractive = computed(() => {
  if (!opening.value) return false
  if (trainerMode.value === 'study') {
    const g = new Chess(displayedSnapshot.value.fen)
    return !g.isGameOver()
  }
  return isUserTurnNow.value
})

const boardAllowedColor = computed<Color | 'both'>(() => {
  if (trainerMode.value === 'study') return 'both'
  return opening.value?.side ?? 'w'
})

const studyEvalBarWidth = computed(() => {
  const clamped = Math.max(-8, Math.min(8, analysisEvalPawns.value))
  return Math.round(((clamped + 8) / 16) * 100)
})

const lineCompleted = computed(() => currentPly.value >= maxPly.value && maxPly.value > 0)

function updateStudyEval(fen: string) {
  try {
    const g = new Chess(fen)
    analysisEvalPawns.value = Math.round((evaluateEndgamePosition(g) / 100) * 10) / 10
  } catch {
    analysisEvalPawns.value = 0
  }
}

function clearAnalysisBranch(returnToBranchPoint = false) {
  const targetPly = returnToBranchPoint ? (analysisBranchStartPly.value ?? 0) : (viewingPly.value ?? 0)
  analysisBranchStartPly.value = null
  analysisSnapshots.value = []
  analysisPly.value = 0
  hintFrom.value = null
  hintTo.value = null
  correctSquare.value = null
  if (returnToBranchPoint) {
    handleSelectPly(targetPly)
  }
}

function clearHintsAndHighlights() {
  hintLevel.value = 0
  hintFrom.value = null
  hintTo.value = null
  errorSquare.value = null
}

function scheduleOpponentMoveIfNeeded() {
  clearTimers()
  if (!opening.value || trainerMode.value !== 'drill') return
  if (currentPly.value >= maxPly.value) return

  const snap = lineSnapshots.value[currentPly.value]
  if (!snap) return
  const g = new Chess(snap.fen)
  if (g.turn() === opening.value.side) return

  isOpponentThinking.value = true
  opponentTimer = setTimeout(() => {
    isOpponentThinking.value = false
    if (currentPly.value >= maxPly.value) return
    const nextSnap = lineSnapshots.value[currentPly.value + 1]
    if (!nextSnap) return

    currentPly.value += 1
    viewingPly.value = null
    clearHintsAndHighlights()

    // Play subtle wooden sound for opponent move
    if (nextSnap.san.includes('+') || nextSnap.san.includes('#')) {
      playCheckSound(isMuted.value)
    } else if (nextSnap.san.includes('x')) {
      playWoodenCapture(isMuted.value)
    } else {
      playWoodenMove(isMuted.value)
    }

    if (currentPly.value >= maxPly.value) {
      completeCurrentLine()
    } else {
      if (feedbackState.value === 'idle') {
        feedbackTitle.value = `Lawan memainkan ${nextSnap.san}`
        feedbackMessage.value = `${nextSnap.explanation} Kini giliran Anda: temukan balasan repertoar terbaik.`
      }
    }
  }, 420)
}

function completeCurrentLine() {
  if (!activeLine.value) return
  markLineMastered(activeLine.value.id)
  playSuccessChime(isMuted.value)
  const acc =
    sessionAttempts.value > 0
      ? Math.round((sessionCorrect.value / sessionAttempts.value) * 100)
      : 100
  feedbackState.value = 'completed'
  feedbackTitle.value = 'Variasi Berhasil Dikuasai!'
  feedbackMoveSan.value = ''
  feedbackMessage.value = `Luar biasa! Anda menyelesaikan jalur "${activeLine.value.name}" dengan akurasi sesi ${acc}%. Coba variasi lain atau ulangi untuk menguatkan memori jangka panjang.`
}

function startLine(index = selectedLineIndex.value) {
  clearTimers()
  selectedLineIndex.value = index
  currentPly.value = 0
  viewingPly.value = null
  isOpponentThinking.value = false
  sessionAttempts.value = 0
  sessionCorrect.value = 0
  correctSquare.value = null
  analysisBranchStartPly.value = null
  analysisSnapshots.value = []
  analysisPly.value = 0
  clearHintsAndHighlights()

  if (opening.value) {
    orientation.value = opening.value.side
  }

  if (trainerMode.value === 'study') {
    viewingPly.value = 0
    updateStudyEval(lineSnapshots.value[0]?.fen ?? new Chess().fen())
    feedbackState.value = 'idle'
    feedbackTitle.value = 'Mode Pelajari & Analisis Bebas'
    feedbackMoveSan.value = ''
    feedbackMessage.value =
      'Gerakkan bidak Putih atau Hitam langsung di papan untuk menganalisis variasi bebas, atau klik notasi untuk mengikuti jalur utama buku.'
  } else {
    feedbackState.value = 'idle'
    feedbackTitle.value = 'Giliran Latihan Repertoar'
    feedbackMoveSan.value = ''
    feedbackMessage.value =
      opening.value?.side === 'w'
        ? 'Anda bermain sebagai Putih. Mainkan langkah pembukaan pertama Anda di papan.'
        : 'Anda bermain sebagai Hitam. Tunggu langkah pembuka lawan, lalu temukan balasan terbaik.'
    scheduleOpponentMoveIfNeeded()
  }
}

function handleStudyMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  const g = new Chess(displayedSnapshot.value.fen)
  let playedMove
  try {
    playedMove = g.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q'
    })
  } catch {
    return
  }

  clearHintsAndHighlights()

  if (playedMove.san.includes('+') || playedMove.san.includes('#')) {
    playCheckSound(isMuted.value)
  } else if (playedMove.captured) {
    playWoodenCapture(isMuted.value)
  } else {
    playWoodenMove(isMuted.value)
  }

  // If currently on the main book line, check whether the user's move matches the next book move
  if (!isInAnalysisBranch.value || analysisPly.value === 0) {
    const curBookPly = viewingPly.value ?? 0
    const nextBookSnap = lineSnapshots.value[curBookPly + 1]
    if (nextBookSnap && nextBookSnap.san === playedMove.san) {
      analysisBranchStartPly.value = null
      analysisSnapshots.value = []
      analysisPly.value = 0
      viewingPly.value = curBookPly + 1
      correctSquare.value = playedMove.to
      updateStudyEval(nextBookSnap.fen)
      feedbackState.value = 'correct'
      feedbackTitle.value = `Jalur Buku: Langkah ke-${nextBookSnap.moveNumber}`
      feedbackMoveSan.value = nextBookSnap.san
      feedbackMessage.value = nextBookSnap.explanation
      return
    }

    // Diverged from the book line -> open a free analysis branch!
    const nextTotalPly = curBookPly + 1
    const branchSnap: PlySnapshot = {
      fen: g.fen(),
      lastMove: { from: playedMove.from, to: playedMove.to },
      san: playedMove.san,
      color: playedMove.color,
      moveNumber: Math.ceil(nextTotalPly / 2),
      explanation: `Eksplorasi analisis bebas di luar jalur utama (${playedMove.san}). Anda bisa terus mencoba langkah balasan Putih maupun Hitam.`
    }
    analysisBranchStartPly.value = curBookPly
    analysisSnapshots.value = [branchSnap]
    analysisPly.value = 1
    correctSquare.value = null
    updateStudyEval(g.fen())

    feedbackState.value = 'idle'
    feedbackTitle.value = g.isCheckmate()
      ? 'Skakmat dalam Analisis!'
      : g.isDraw()
        ? 'Posisi Remis dalam Analisis'
        : `Cabang Analisis: ${playedMove.san}`
    feedbackMoveSan.value = playedMove.san
    feedbackMessage.value =
      nextBookSnap
        ? `Anda keluar dari jalur utama (buku menyarankan ${nextBookSnap.san}). Lanjutkan eksplorasi bebas di papan atau klik "Kembali ke Jalur Utama".`
        : 'Anda melanjutkan analisis melampaui akhir jalur buku. Pindahkan bidak secara bebas untuk menguji kelanjutan posisi.'
    return
  }

  // Already inside an analysis branch -> append (truncating forward steps if user stepped back)
  const startPly = analysisBranchStartPly.value ?? 0
  const prefix = analysisSnapshots.value.slice(0, analysisPly.value)
  const nextTotalPly = startPly + prefix.length + 1
  const branchSnap: PlySnapshot = {
    fen: g.fen(),
    lastMove: { from: playedMove.from, to: playedMove.to },
    san: playedMove.san,
    color: playedMove.color,
    moveNumber: Math.ceil(nextTotalPly / 2),
    explanation: `Langkah analisis bebas (${playedMove.san}).`
  }

  analysisSnapshots.value = [...prefix, branchSnap]
  analysisPly.value = analysisSnapshots.value.length
  correctSquare.value = null
  updateStudyEval(g.fen())

  feedbackState.value = 'idle'
  feedbackTitle.value = g.isCheckmate()
    ? 'Skakmat dalam Analisis!'
    : g.isDraw()
      ? 'Posisi Remis dalam Analisis'
      : `Cabang Analisis: ${playedMove.san}`
  feedbackMoveSan.value = playedMove.san
  feedbackMessage.value = `Evaluasi posisi saat ini: ${formatEvalLabel(analysisEvalPawns.value)}. Terus uji variasi atau klik "Saran Engine" untuk melihat langkah terbaik.`
}

function handleUserMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (trainerMode.value === 'study') {
    handleStudyMove(payload)
    return
  }
  if (!opening.value || !activeLine.value || !isUserTurnNow.value) return
  const expected = nextExpectedNode.value
  if (!expected) return

  const g = new Chess(displayedSnapshot.value.fen)
  let playedMove
  try {
    playedMove = g.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q'
    })
  } catch {
    return
  }

  sessionAttempts.value += 1

  if (playedMove.san === expected.san) {
    // Correct repertoire move!
    sessionCorrect.value += 1
    recordMoveResult(activeLine.value.id, true)
    clearHintsAndHighlights()
    currentPly.value += 1
    viewingPly.value = null
    correctSquare.value = playedMove.to

    if (playedMove.san.includes('+') || playedMove.san.includes('#')) {
      playCheckSound(isMuted.value)
    } else if (playedMove.captured) {
      playWoodenCapture(isMuted.value)
    } else {
      playWoodenMove(isMuted.value)
    }

    feedbackState.value = 'correct'
    feedbackTitle.value = 'Mengapa langkah ini kuat?'
    feedbackMoveSan.value = playedMove.san
    feedbackMessage.value = expected.explanation

    if (currentPly.value >= maxPly.value) {
      completeCurrentLine()
    } else {
      scheduleOpponentMoveIfNeeded()
    }
  } else {
    // Inaccuracy / deviation from repertoire -> add to Mistake Queue automatically
    recordMoveResult(activeLine.value.id, false)
    recordMistake({
      source: 'opening',
      title: `${opening.value.title}: ${activeLine.value.name}`,
      fen: displayedSnapshot.value.fen,
      expectedSan: expected.san,
      side: opening.value.side
    })
    playErrorSound(isMuted.value)
    correctSquare.value = null
    errorSquare.value = payload.to
    shakeBoard.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shakeBoard.value = false
    }, 380)

    feedbackState.value = 'mistake'
    feedbackTitle.value = `${playedMove.san} bukan jalur utama repertoar`
    feedbackMoveSan.value = ''
    feedbackMessage.value =
      expected.mistakeHint ??
      'Langkah ini melepaskan inisiatif atau membiarkan lawan menguasai petak kunci di pusat. Coba cari pengembangan perwira yang lebih harmonis.'
  }
}

function requestStudyEngineHint() {
  if (trainerMode.value !== 'study' || isAnalyzingMove.value) return
  const fen = displayedSnapshot.value.fen
  const g = new Chess(fen)
  if (g.isGameOver()) return

  isAnalyzingMove.value = true
  setTimeout(() => {
    const res = computeBestEndgameMove(fen, 3, 220)
    isAnalyzingMove.value = false
    if (!res.move) return
    hintFrom.value = res.move.from
    hintTo.value = res.move.to
    analysisEvalPawns.value = res.evaluation
    feedbackState.value = 'idle'
    feedbackTitle.value = `Saran Analisis: ${res.move.san}`
    feedbackMoveSan.value = res.move.san
    feedbackMessage.value = `Engine menyarankan memindahkan perwira dari ${res.move.from} ke ${res.move.to} (${formatEvalLabel(res.evaluation)}).`
  }, 40)
}

function undoStudyStep() {
  if (trainerMode.value !== 'study') return
  if (isInAnalysisBranch.value && analysisPly.value > 0) {
    handleSelectPly(displayedPly.value - 1)
  } else if (displayedPly.value > 0) {
    handleSelectPly(displayedPly.value - 1)
  }
}

function requestHint() {
  const expected = nextExpectedNode.value
  if (!expected) return
  const g = new Chess(displayedSnapshot.value.fen)
  try {
    const moveObj = g.move(expected.san)
    hintLevel.value = 2
    hintFrom.value = moveObj.from
    hintTo.value = moveObj.to
  } catch {
    // Ignore
  }
}

function handleSelectPly(ply: number) {
  clearHintsAndHighlights()
  correctSquare.value = null

  if (trainerMode.value === 'study' && isInAnalysisBranch.value) {
    const startPly = analysisBranchStartPly.value ?? 0
    if (ply > startPly) {
      analysisPly.value = Math.min(analysisSnapshots.value.length, ply - startPly)
      const bSnap = analysisSnapshots.value[analysisPly.value - 1]
      if (bSnap) {
        updateStudyEval(bSnap.fen)
        feedbackState.value = 'idle'
        feedbackTitle.value = `Cabang Analisis: Langkah ke-${bSnap.moveNumber}`
        feedbackMoveSan.value = bSnap.san
        feedbackMessage.value = bSnap.explanation
      }
      return
    }
    analysisPly.value = 0
    viewingPly.value = ply
  } else {
    viewingPly.value = ply
  }

  const snap = lineSnapshots.value[ply]
  if (snap) {
    if (trainerMode.value === 'study') {
      updateStudyEval(snap.fen)
    }
    if (ply > 0) {
      feedbackState.value = trainerMode.value === 'study' ? 'correct' : 'idle'
      feedbackTitle.value =
        trainerMode.value === 'study'
          ? `Jalur Buku: Langkah ke-${snap.moveNumber}`
          : `Meninjau Langkah ke-${snap.moveNumber}`
      feedbackMoveSan.value = snap.san
      feedbackMessage.value = snap.explanation
    } else {
      feedbackState.value = 'idle'
      feedbackTitle.value = 'Posisi Awal'
      feedbackMoveSan.value = ''
      feedbackMessage.value =
        trainerMode.value === 'study'
          ? 'Gerakkan bidak Putih atau Hitam di papan untuk menganalisis, atau gunakan tombol panah untuk menelusuri teori.'
          : activeLine.value?.description ?? ''
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (trainerMode.value !== 'study') return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  const totalMax = isInAnalysisBranch.value
    ? (analysisBranchStartPly.value ?? 0) + analysisSnapshots.value.length
    : maxPly.value

  if (e.key === 'ArrowLeft' && displayedPly.value > 0) {
    e.preventDefault()
    handleSelectPly(displayedPly.value - 1)
  } else if (e.key === 'ArrowRight' && displayedPly.value < totalMax) {
    e.preventDefault()
    handleSelectPly(displayedPly.value + 1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function returnToLiveDrill() {
  viewingPly.value = null
  if (lineCompleted.value) {
    feedbackState.value = 'completed'
    feedbackTitle.value = 'Variasi Berhasil Dikuasai!'
  } else {
    feedbackState.value = 'idle'
    feedbackTitle.value = 'Kembali ke Latihan Aktif'
    feedbackMoveSan.value = ''
    feedbackMessage.value = 'Lanjutkan mencari langkah repertoar terbaik dari posisi ini.'
  }
}

function switchMode(mode: 'drill' | 'study') {
  if (trainerMode.value === mode) return
  trainerMode.value = mode
  startLine(selectedLineIndex.value)
}

function goToNextVariation() {
  const count = opening.value?.lines.length ?? 1
  const nextIdx = (selectedLineIndex.value + 1) % count
  startLine(nextIdx)
}

function downloadOpeningCard() {
  if (!opening.value || !activeLine.value) return
  const acc =
    sessionAttempts.value > 0
      ? Math.round((sessionCorrect.value / sessionAttempts.value) * 100)
      : 100
  const ok = exportAchievementCardPng({
    title: `${opening.value.title} Dikuasai!`,
    subtitle: `Variasi ${activeLine.value.name} (${opening.value.eco})`,
    badgeLabel: 'Variasi Dikuasai',
    fen: displayedSnapshot.value.fen,
    orientation: opening.value.side,
    accuracyPercent: acc,
    streakDays: progress.value.streakDays,
    extraMetricLabel: 'Kode ECO',
    extraMetricValue: opening.value.eco,
    palette: currentBoardPalette.value,
    pieceSet: pieceSet.value,
    theme: isDark.value ? 'cosmic' : 'cream'
  })
  if (ok) {
    cardDownloaded.value = true
    setTimeout(() => {
      cardDownloaded.value = false
    }, 2600)
  }
}

watch(
  () => opening.value?.id,
  () => {
    if (opening.value) {
      startLine(0)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <div v-if="!opening" class="py-16 text-center space-y-4">
    <h1 class="font-serif text-2xl font-semibold">Modul Pembukaan Tidak Ditemukan</h1>
    <p class="text-sm text-zinc-500">
      Repertoar yang Anda cari tidak tersedia atau telah dihapus dari penyimpanan lokal.
    </p>
    <NuxtLink
      to="/dashboard"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#18181B] text-white dark:bg-[#EDEAE0] dark:text-[#18181B]"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Beranda
    </NuxtLink>
  </div>

  <div v-else class="space-y-6">
    <!-- Breadcrumb & Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
            {{ opening.title }}
          </h1>
          <span
            class="font-mono text-xs px-2.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            {{ opening.eco }}
          </span>
          <span
            class="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
            :class="
              opening.side === 'w'
                ? 'bg-[#FAF8F3] text-zinc-800 border-zinc-300'
                : 'bg-zinc-900 text-white border-zinc-800'
            "
          >
            Anda: {{ opening.side === 'w' ? 'Putih' : 'Hitam' }}
          </span>
        </div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {{ opening.subtitle }}
        </p>
      </div>

      <!-- Mode Switcher (Drill vs Study) -->
      <div
        class="inline-flex items-center p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] self-start md:self-auto"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="
            trainerMode === 'drill'
              ? 'bg-[#18181B] text-white dark:bg-[#EDEAE0] dark:text-[#18181B]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchMode('drill')"
        >
          <GraduationCap class="w-3.5 h-3.5" />
          <span>Mode Latihan (Drill)</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="
            trainerMode === 'study'
              ? 'bg-[#5D7463] text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchMode('study')"
        >
          <BookOpen class="w-3.5 h-3.5" />
          <span>Mode Pelajari &amp; Analisis</span>
        </button>
      </div>
    </div>

    <!-- Variation Branch Selector -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="(line, idx) in opening.lines"
        :key="line.id"
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer"
        :class="
          selectedLineIndex === idx
            ? 'bg-[#5D7463] text-white border-[#5D7463] shadow-xs'
            : 'bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-800 hover:border-[#738578]'
        "
        @click="startLine(idx)"
      >
        <CheckCircle2
          v-if="isLineMastered(line.id)"
          class="w-3.5 h-3.5"
          :class="selectedLineIndex === idx ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'"
        />
        <span>{{ line.name }}</span>
      </button>
    </div>

    <!-- Main Two-Column Trainer Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <!-- Board Column -->
      <div class="lg:col-span-7 space-y-4">
        <ChessBoard
          :fen="displayedSnapshot.fen"
          :orientation="orientation"
          :interactive="isBoardInteractive"
          :allowed-color="boardAllowedColor"
          :last-move="displayedSnapshot.lastMove"
          :correct-square="isInspectingHistory ? null : correctSquare"
          :error-square="isInspectingHistory ? null : errorSquare"
          :hint-from="isInspectingHistory ? null : hintFrom"
          :hint-to="isInspectingHistory ? null : hintTo"
          :shake="shakeBoard"
          @move="handleUserMove"
        />

        <!-- Active Free Analysis Branch Banner (Study Mode) -->
        <div
          v-if="isInAnalysisBranch"
          class="max-w-[560px] mx-auto rounded-xl bg-[#F3F1EC] dark:bg-zinc-900 border border-[#C8CFC9] dark:border-zinc-700 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 font-semibold text-[#475C4D] dark:text-[#A4BFA9]">
              <GitBranch class="w-3.5 h-3.5 shrink-0" />
              <span>Cabang Analisis Bebas (dari ply ke-{{ analysisBranchStartPly }})</span>
            </div>
            <p class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
              {{ analysisBranchLineText }}
            </p>
          </div>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg font-semibold bg-[#18181B] text-white dark:bg-[#EDEAE0] dark:text-[#18181B] hover:opacity-90 transition shrink-0 cursor-pointer"
            @click="clearAnalysisBranch(true)"
          >
            Kembali ke Jalur Utama
          </button>
        </div>

        <!-- History Inspection Banner if browsing older ply during drill -->
        <div
          v-if="isInspectingHistory"
          class="max-w-[560px] mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
        >
          <span class="text-amber-900 dark:text-amber-200 font-medium">
            Sedang meninjau riwayat pada ply ke-{{ displayedPly }}.
          </span>
          <button
            type="button"
            class="px-3 py-1 rounded-lg font-semibold bg-amber-900 text-white dark:bg-amber-200 dark:text-amber-950 cursor-pointer"
            @click="returnToLiveDrill"
          >
            Lanjutkan Latihan
          </button>
        </div>

        <!-- Tactile Thumb-Friendly Control Bar -->
        <div
          v-if="trainerMode === 'drill'"
          class="max-w-[560px] mx-auto grid grid-cols-3 gap-2.5"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#B85D43] disabled:opacity-40 transition cursor-pointer"
            :disabled="!isUserTurnNow || lineCompleted"
            @click="requestHint"
          >
            <Lightbulb class="w-4 h-4 text-[#B85D43]" />
            <span>{{ hintLevel === 0 ? 'Petunjuk' : 'Tujuan' }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="startLine(selectedLineIndex)"
          >
            <RotateCcw class="w-4 h-4" />
            <span>Ulangi Jalur</span>
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

        <!-- Study / Analysis Control Bar -->
        <div
          v-else
          class="max-w-[560px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 transition cursor-pointer"
            :disabled="displayedPly <= 0"
            @click="undoStudyStep"
          >
            <Undo2 class="w-4 h-4" />
            <span>Mundur 1</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#B85D43] disabled:opacity-40 transition cursor-pointer"
            :disabled="isAnalyzingMove || !isBoardInteractive"
            @click="requestStudyEngineHint"
          >
            <Cpu class="w-4 h-4 text-[#B85D43]" />
            <span>{{ isAnalyzingMove ? 'Hitung...' : 'Saran Engine' }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="startLine(selectedLineIndex)"
          >
            <RotateCcw class="w-4 h-4" />
            <span>Reset Posisi</span>
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

      <!-- Editorial Notebook / Side Panel -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Progress Pill (Drill Mode) OR Live Analysis Eval Bar (Study Mode) -->
        <div
          v-if="trainerMode === 'drill'"
          class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4"
        >
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-medium text-zinc-500 dark:text-zinc-400">
              Progres Variasi Aktif
            </span>
            <span class="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
              {{ currentPly }} / {{ maxPly }} langkah
            </span>
          </div>
          <div class="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="lineCompleted ? 'bg-emerald-600' : 'bg-[#5D7463]'"
              :style="{ width: `${maxPly > 0 ? Math.round((currentPly / maxPly) * 100) : 0}%` }"
            />
          </div>
          <div
            v-if="sessionAttempts > 0"
            class="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400"
          >
            <span>Akurasi sesi ini</span>
            <span class="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              {{ Math.round((sessionCorrect / sessionAttempts) * 100) }}% ({{ sessionCorrect }}/{{ sessionAttempts }})
            </span>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4"
        >
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Cpu class="w-3.5 h-3.5 text-[#5D7463]" />
              <span>Evaluasi Analisis</span>
            </span>
            <span class="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
              {{ formatEvalLabel(analysisEvalPawns) }}
            </span>
          </div>
          <div class="h-2.5 rounded-full bg-zinc-800 dark:bg-zinc-950 overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-700">
            <div
              class="h-full bg-[#EDEAE0] transition-all duration-500"
              :style="{ width: `${studyEvalBarWidth}%` }"
            />
          </div>
          <div class="flex justify-between text-[10px] font-mono text-zinc-400 mt-1.5">
            <span>Putih</span>
            <span>Gunakan panah ← → atau geser bidak</span>
            <span>Hitam</span>
          </div>
        </div>

        <!-- Strategic Coaching Feedback Banner -->
        <TrainerFeedbackBanner
          :state="feedbackState"
          :title="feedbackTitle"
          :message="feedbackMessage"
          :move-san="feedbackMoveSan"
          :show-hint-button="feedbackState === 'mistake' && isUserTurnNow"
          :hint-level="hintLevel"
          @request-hint="requestHint"
        />

        <!-- Completion Action Buttons -->
        <div
          v-if="lineCompleted && trainerMode === 'drill'"
          class="space-y-2.5"
        >
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              v-if="opening.lines.length > 1"
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:opacity-90 transition cursor-pointer"
              @click="goToNextVariation"
            >
              <Sparkles class="w-4 h-4" />
              <span>Latih Variasi Berikutnya</span>
            </button>
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#19191D] text-zinc-800 dark:text-zinc-100 hover:border-[#738578] transition cursor-pointer"
              @click="startLine(selectedLineIndex)"
            >
              <RotateCcw class="w-4 h-4" />
              <span>Ulangi Variasi Ini</span>
            </button>
          </div>
          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#526857] text-white hover:bg-[#435648] active:scale-[0.98] transition cursor-pointer shadow-sm"
            @click="downloadOpeningCard"
          >
            <Download class="w-4 h-4" />
            <span>{{ cardDownloaded ? 'Kartu Prestasi PNG Diunduh!' : 'Unduh Kartu Prestasi (PNG)' }}</span>
          </button>
        </div>

        <!-- Interactive Move Tree & PGN Viewer -->
        <MoveHistoryPanel
          :moves="visibleHistoryMoves"
          :active-ply="displayedPly"
          empty-message="Mainkan langkah pertama Anda atau beralih ke Mode Pelajari untuk menelusuri pohon variasi lengkap."
          @select-ply="handleSelectPly"
        />

        <!-- Key Themes Card -->
        <div
          class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4"
        >
          <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
            Tema Strategis Utama
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="theme in opening.keyThemes"
              :key="theme"
              class="text-xs px-2.5 py-1 rounded-lg bg-[#F8F7F4] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/60"
            >
              {{ theme }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
