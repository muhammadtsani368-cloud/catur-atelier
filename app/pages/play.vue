<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  BarChart3,
  Bot,
  Clock,
  Compass,
  Cpu,
  Eye,
  EyeOff,
  Flag,
  FlipVertical2,
  Handshake,
  Lightbulb,
  MessageSquareQuote,
  Play,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Trophy,
  Undo2,
  Users,
  X
} from 'lucide-vue-next'
import type { MatchEvalPoint } from '~/components/MatchReportModal.vue'
import type { HistoryMoveItem } from '~/components/MoveHistoryPanel.vue'
import type { TacticalArrow } from '~/components/TacticalArrowOverlay.vue'
import {
  analyzeBoardVision,
  computeTieredHint,
  evaluateMoveRisk,
  getLensPreset,
  type AdaptiveLensId,
  type MoveRiskAssessment,
  type TieredHintResult
} from '~/utils/adaptiveLensEngine'
import { markDailyRoutineTaskComplete } from '~/utils/dailyRoutine'
import {
  analyzeCompletedMatch,
  type AnalyzedMove,
  type GameReviewReport
} from '~/utils/gameReviewEngine'
import {
  BOT_CATALOG,
  BOT_TIER_GROUPS,
  buildCustomEngineBot,
  CUSTOM_ELO_PRESETS,
  getBotsByTier,
  getCatalogBotById,
  type BotCatalogEntry,
  type BotTierName
} from '~/utils/botCatalog'
import {
  BOT_PERSONAS,
  getBotPersona,
  getPersonaLiveReaction,
  type BotPersonaId
} from '~/utils/botPersonas'
import {
  computeBotMove,
  computeCapturedMaterial,
  evaluateBoard
} from '~/utils/chessBotEngine'
import { formatEvalLabel } from '~/utils/endgameEngine'
import { getAtelierProfileHeaders } from '~/utils/profileId'
import {
  generateLiveCoPilotBrief,
  generateSocraticReview
} from '~/utils/socraticCoachEngine'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'
import {
  applyOpponentReplyInWhatIf,
  createWhatIfSession,
  rewindWhatIfPly,
  stepWhatIfMove,
  type WhatIfSessionState
} from '~/utils/whatIfSimulator'

const route = useRoute()
const { isMuted } = useTheme()
const { user: authUser } = useAuth()
const { activeLens, initLens, setLens } = useAdaptiveLens()

type GameMode = 'bot' | 'custom' | 'pvp'
type SidePreference = 'w' | 'b' | 'random'

interface TimeControlOption {
  id: string
  label: string
  baseSeconds: number // 0 = unlimited
  incrementSeconds: number
}

const TIME_CONTROLS: TimeControlOption[] = [
  { id: 'unlimited', label: 'Tanpa Batas', baseSeconds: 0, incrementSeconds: 0 },
  { id: '3+2', label: '3 + 2 Blitz', baseSeconds: 180, incrementSeconds: 2 },
  { id: '5+0', label: '5 + 0 Blitz', baseSeconds: 300, incrementSeconds: 0 },
  { id: '10+0', label: '10 + 0 Rapid', baseSeconds: 600, incrementSeconds: 0 },
  { id: '15+10', label: '15 + 10 Klasik', baseSeconds: 900, incrementSeconds: 10 }
]

interface PlaySnapshot {
  fen: string
  lastMove: { from: string; to: string } | null
  san: string
  color: Color
  moveNumber: number
}

// Setup preferences
const gameMode = ref<GameMode>('bot')
const selectedTier = ref<BotTierName>('Menengah')
const selectedBotId = ref<string>('bot-citra-1050')
const selectedPersonaId = ref<BotPersonaId>('default')
const customElo = ref<number>(1500)
const playerSidePref = ref<SidePreference>('w')
const selectedTimeControlId = ref<string>('10+0')
const pvpWhiteName = ref('Pemain 1')
const pvpBlackName = ref('Pemain 2')
const pvpAutoFlip = ref(false)

// Active match state
const matchStarted = ref(false)
const humanSideInBot = ref<Color>('w')
const orientation = ref<Color>('w')
const snapshots = ref<PlaySnapshot[]>([
  {
    fen: new Chess().fen(),
    lastMove: null,
    san: '',
    color: 'w',
    moveNumber: 0
  }
])
const viewingPly = ref<number | null>(null)
const isBotThinking = ref(false)
const showEvalMeter = ref(true)
const liveEvalPawns = ref(0)
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)
const hintTier = ref<0 | 1 | 2 | 3>(0)
const activeHintResult = ref<TieredHintResult | null>(null)
const botLiveComment = ref<string>('')

// Socratic Blunder Guard (Apprentice lens live sparring)
const pendingBlunderGuard = ref<{
  payload: { from: Square; to: Square; promotion?: PieceSymbol }
  risk: MoveRiskAssessment
} | null>(null)

// Interactive What-If Simulator (Game Review sandbox)
const whatIfSession = ref<WhatIfSessionState | null>(null)
const whatIfError = ref<string | null>(null)
const whatIfAutoReply = ref(true)
let whatIfReplyTimer: ReturnType<typeof setTimeout> | null = null

function clearWhatIfReplyTimer() {
  if (whatIfReplyTimer) {
    clearTimeout(whatIfReplyTimer)
    whatIfReplyTimer = null
  }
}

function scheduleWhatIfAutoReply() {
  clearWhatIfReplyTimer()
  if (!whatIfAutoReply.value || !whatIfSession.value?.pendingOpponentReply) return
  whatIfReplyTimer = setTimeout(() => {
    whatIfReplyTimer = null
    if (!whatIfSession.value?.pendingOpponentReply) return
    whatIfSession.value = applyOpponentReplyInWhatIf(whatIfSession.value, activeLens.value)
    playWoodenMove(isMuted.value)
  }, 380)
}

// Clock state
const whiteTimeLeft = ref(600)
const blackTimeLeft = ref(600)

// Result & Post-Match Analysis Report state
interface GameResult {
  title: string
  subtitle: string
  winner: Color | 'draw'
}
const gameResult = ref<GameResult | null>(null)
const evalHistory = ref<MatchEvalPoint[]>([])
const showMatchReport = ref(false)
const matchArchived = ref(false)

// Post-match interactive Game Review (Ulasan Permainan)
const showGameReview = ref(false)
const isAnalyzingReview = ref(false)
const reviewAnalysisProgress = ref(0)
const gameReviewReport = ref<GameReviewReport | null>(null)
let reviewRunSeq = 0

async function triggerGameReview(openPanel = true) {
  const mySeq = ++reviewRunSeq
  if (openPanel) showGameReview.value = true
  isAnalyzingReview.value = true
  reviewAnalysisProgress.value = 0
  gameReviewReport.value = null

  const whiteInfo = playerDisplayInfo('w')
  const blackInfo = playerDisplayInfo('b')

  try {
    const report = await analyzeCompletedMatch(snapshots.value, {
      whiteName: whiteInfo.name,
      blackName: blackInfo.name,
      referenceOpponentElo: isVsEngine.value ? activeBot.value.elo : 1200,
      humanSide: isVsEngine.value ? humanSideInBot.value : 'w',
      onProgress: (pct) => {
        if (mySeq === reviewRunSeq) {
          reviewAnalysisProgress.value = pct
        }
      }
    })
    if (mySeq === reviewRunSeq) {
      gameReviewReport.value = report
      markDailyRoutineTaskComplete('match-or-tactics')
    }
  } finally {
    if (mySeq === reviewRunSeq) {
      isAnalyzingReview.value = false
    }
  }
}

const activeReviewedMove = computed<AnalyzedMove | null>(() => {
  if (!showGameReview.value || !gameReviewReport.value || displayedPly.value <= 0) return null
  return gameReviewReport.value.moves[displayedPly.value - 1] ?? null
})

const reviewMoveBadge = computed(() => {
  if (whatIfSession.value) return null
  const mv = activeReviewedMove.value
  if (!mv || !mv.to) return null
  return {
    square: mv.to,
    classification: mv.classification
  }
})

const reviewArrows = computed<TacticalArrow[]>(() => {
  const mv = activeReviewedMove.value
  if (!mv) return []
  const humanSide: Color = isVsEngine.value ? humanSideInBot.value : 'w'
  const isHumanMove = mv.color === humanSide
  const socratic = generateSocraticReview(mv, activeLens.value, humanSide)

  // Always show arrows that are valid on the currently displayed board (mv.afterFen)!
  if (!isHumanMove) {
    // On opponent's move: show human's best legal reply arrow (if game not over)
    return socratic.refutationArrow ? [socratic.refutationArrow] : []
  }

  const arrows: TacticalArrow[] = []
  const isSuboptimal =
    mv.classification === 'inaccuracy' ||
    mv.classification === 'mistake' ||
    mv.classification === 'miss' ||
    mv.classification === 'blunder'

  if (isSuboptimal && socratic.refutationArrow) {
    arrows.push(socratic.refutationArrow)
  }
  return arrows
})

const whiteReviewInfo = computed(() => playerDisplayInfo('w'))
const blackReviewInfo = computed(() => playerDisplayInfo('b'))

function buildMatchPgn(): string {
  const parts: string[] = []
  const moves = snapshots.value.slice(1)
  for (let i = 0; i < moves.length; i += 2) {
    const moveNo = Math.floor(i / 2) + 1
    const wMove = moves[i]?.san ?? ''
    const bMove = moves[i + 1]?.san ?? ''
    parts.push(bMove ? `${moveNo}. ${wMove} ${bMove}` : `${moveNo}. ${wMove}`)
  }
  return parts.join(' ')
}

function estimateMatchAccuracy(): number {
  if (evalHistory.value.length <= 1) return 85
  const side: Color = isVsEngine.value ? humanSideInBot.value : 'w'
  let penaltySum = 0
  let count = 0
  for (let i = 1; i < evalHistory.value.length; i++) {
    const prev = evalHistory.value[i - 1]!
    const curr = evalHistory.value[i]!
    if (curr.color !== side) continue
    const swing = side === 'w' ? curr.score - prev.score : prev.score - curr.score
    if (swing < 0) penaltySum += Math.min(4, Math.abs(swing))
    count++
  }
  if (count === 0) return 85
  const avgLoss = penaltySum / count
  return Math.max(35, Math.min(99, Math.round(98 - avgLoss * 16)))
}

function archiveMatchToCloud(result: GameResult) {
  if (matchArchived.value || snapshots.value.length <= 1) return
  matchArchived.value = true

  const latest = snapshots.value[snapshots.value.length - 1]
  const opponentName = isVsEngine.value
    ? activeBot.value.name
    : pvpBlackName.value.trim() || 'Pemain 2'
  const opponentElo = isVsEngine.value ? activeBot.value.elo : 0

  void $fetch('/api/matches', {
    method: 'POST',
    headers: getAtelierProfileHeaders(),
    body: {
      gameMode: gameMode.value,
      opponentName,
      opponentElo,
      humanSide: isVsEngine.value ? humanSideInBot.value : 'w',
      resultWinner: result.winner,
      resultTitle: result.title,
      accuracyPercent: estimateMatchAccuracy(),
      totalPlies: latestPly.value,
      finalFen: latest?.fen ?? new Chess().fen(),
      pgn: buildMatchPgn(),
      evalHistory: evalHistory.value.map((pt) => ({
        ply: pt.ply,
        san: pt.san,
        score: pt.score,
        color: pt.color
      }))
    }
  }).catch(() => {
    // Offline-safe: abaikan jika server tidak terjangkau
  })
}

watch(gameResult, (nextResult) => {
  if (nextResult) {
    archiveMatchToCloud(nextResult)
    void triggerGameReview(true)
  }
})

function clampEvalPawns(rawCp: number): number {
  const pawns = Math.round((rawCp / 100) * 10) / 10
  return Math.max(-8, Math.min(8, pawns))
}

function appendEvalPoint(game: Chess, ply: number, san: string, beforeFen: string, color: Color) {
  const score = clampEvalPawns(evaluateBoard(game, 0.5, true))
  liveEvalPawns.value = score
  evalHistory.value = [
    ...evalHistory.value,
    {
      ply,
      san,
      fen: game.fen(),
      beforeFen,
      score,
      color
    }
  ]
}

function applyBotFromQuery(botIdParam: unknown) {
  if (typeof botIdParam !== 'string' || !botIdParam.trim()) return
  const found = BOT_CATALOG.find((b) => b.id === botIdParam.trim())
  if (!found) return
  gameMode.value = 'bot'
  selectedTier.value = found.tier
  selectedBotId.value = found.id
}

function applyPersonaFromQuery() {
  const personaParam = route.query.persona
  if (
    typeof personaParam === 'string' &&
    (personaParam === 'default' ||
      personaParam === 'gambiteer' ||
      personaParam === 'positional' ||
      personaParam === 'trickster' ||
      personaParam === 'fortress')
  ) {
    selectedPersonaId.value = personaParam
  }
}

function handleLensChange(nextLens: AdaptiveLensId) {
  setLens(nextLens)
  showEvalMeter.value = getLensPreset(nextLens).showEvalByDefault
  if (nextLens !== 'apprentice') {
    pendingBlunderGuard.value = null
  }
}

function handleEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && pendingBlunderGuard.value) {
    pendingBlunderGuard.value = null
  }
}

onMounted(() => {
  initLens()
  showEvalMeter.value = getLensPreset(activeLens.value).showEvalByDefault
  applyBotFromQuery(route.query.bot)
  applyPersonaFromQuery()
  window.addEventListener('keydown', handleEscapeKey)
})

watch(
  () => route.query.bot,
  (nextBot) => applyBotFromQuery(nextBot)
)

let botTimer: ReturnType<typeof setTimeout> | null = null
let clockInterval: ReturnType<typeof setInterval> | null = null

const isVsEngine = computed(() => gameMode.value === 'bot' || gameMode.value === 'custom')
const activeTierGroup = computed(
  () => BOT_TIER_GROUPS.find((t) => t.tier === selectedTier.value) ?? BOT_TIER_GROUPS[1]!
)
const botsInSelectedTier = computed<BotCatalogEntry[]>(() => getBotsByTier(selectedTier.value))
const activePersona = computed(() => getBotPersona(selectedPersonaId.value))
const activeLensPreset = computed(() => getLensPreset(activeLens.value))
const activeBot = computed<BotCatalogEntry>(() =>
  gameMode.value === 'custom'
    ? buildCustomEngineBot(customElo.value)
    : getCatalogBotById(selectedBotId.value)
)
const activeTimeControl = computed<TimeControlOption>(
  () => TIME_CONTROLS.find((t) => t.id === selectedTimeControlId.value) ?? TIME_CONTROLS[0]!
)

function selectTier(tier: BotTierName) {
  selectedTier.value = tier
  const list = getBotsByTier(tier)
  if (list.length > 0 && !list.some((b) => b.id === selectedBotId.value)) {
    selectedBotId.value = list[0]!.id
  }
}

const latestPly = computed(() => Math.max(0, snapshots.value.length - 1))
const displayedPly = computed(() => (viewingPly.value !== null ? viewingPly.value : latestPly.value))
const isInspectingHistory = computed(
  () => viewingPly.value !== null && viewingPly.value !== latestPly.value
)

watch(viewingPly, () => {
  whatIfSession.value = null
  whatIfError.value = null
})

const displayedSnapshot = computed<PlaySnapshot>(() => {
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

const boardFen = computed(() => {
  if (showGameReview.value && whatIfSession.value) {
    return whatIfSession.value.currentFen
  }
  return displayedSnapshot.value.fen
})

const boardLastMove = computed<{ from: string; to: string } | null>(() => {
  if (showGameReview.value && whatIfSession.value) {
    const bms = whatIfSession.value.branchMoves
    const last = bms[bms.length - 1]
    return last ? { from: last.from, to: last.to } : null
  }
  return displayedSnapshot.value.lastMove
})

const currentTurn = computed<Color>(() => {
  try {
    return new Chess(displayedSnapshot.value.fen).turn()
  } catch {
    return 'w'
  }
})

const planVariationSeed = ref(0)
const focusedPlanSan = ref<string | null>(null)

watch(
  () => boardFen.value,
  () => {
    planVariationSeed.value = 0
    focusedPlanSan.value = null
  }
)

function cyclePlanVariations() {
  planVariationSeed.value += 1
  focusedPlanSan.value = null
}

function toggleFocusPlanOption(san: string) {
  focusedPlanSan.value = focusedPlanSan.value === san ? null : san
}

const liveBoardVision = computed(() => {
  const perspective: Color = isVsEngine.value ? humanSideInBot.value : currentTurn.value
  return analyzeBoardVision(boardFen.value, perspective, activeLens.value, planVariationSeed.value)
})

const liveCoPilotBrief = computed(() => {
  if (!matchStarted.value || gameResult.value || showGameReview.value) return null
  const perspective: Color = isVsEngine.value ? humanSideInBot.value : currentTurn.value
  const lastSan = displayedPly.value > 0 ? displayedSnapshot.value.san : null
  const brief = generateLiveCoPilotBrief(displayedSnapshot.value.fen, lastSan, perspective, activeLens.value)
  return brief.visibleOnStage ? brief : null
})

const boardHangingSquares = computed<string[]>(() => {
  if (showGameReview.value && !whatIfSession.value) return []
  return liveBoardVision.value.hangingSquares
})

const boardTensionSquares = computed<string[]>(() => {
  if (showGameReview.value) return []
  return liveBoardVision.value.tensionSquares
})

const boardArrows = computed<TacticalArrow[]>(() => {
  if (showGameReview.value && whatIfSession.value) {
    const arrows: TacticalArrow[] = []
    if (whatIfSession.value.planArrow) arrows.push(whatIfSession.value.planArrow)
    if (whatIfSession.value.refutationArrow) arrows.push(whatIfSession.value.refutationArrow)
    return arrows
  }
  if (showGameReview.value) {
    return reviewArrows.value
  }
  if (pendingBlunderGuard.value?.risk.punishmentFrom && pendingBlunderGuard.value?.risk.punishmentTo) {
    return [
      {
        from: pendingBlunderGuard.value.risk.punishmentFrom,
        to: pendingBlunderGuard.value.risk.punishmentTo,
        tone: 'threat'
      }
    ]
  }
  if (!matchStarted.value || gameResult.value) return []
  const focusedOpt = focusedPlanSan.value
    ? liveBoardVision.value.planOptions.find((o) => o.san === focusedPlanSan.value)
    : null
  const activePlanArrows: TacticalArrow[] = focusedOpt
    ? [{ from: focusedOpt.from, to: focusedOpt.to, tone: 'plan' }]
    : liveBoardVision.value.planArrows
  return [...liveBoardVision.value.threatArrows, ...activePlanArrows]
})

const historyItems = computed<HistoryMoveItem[]>(() => {
  return snapshots.value.slice(1).map((snap, idx) => ({
    ply: idx + 1,
    san: snap.san,
    color: snap.color,
    moveNumber: snap.moveNumber
  }))
})

const captured = computed(() => computeCapturedMaterial(boardFen.value))

const canInteractBoard = computed(() => {
  if (showGameReview.value && whatIfSession.value) {
    if (whatIfSession.value.pendingOpponentReply) return false
    try {
      return new Chess(whatIfSession.value.currentFen).turn() === whatIfSession.value.moverPerspective
    } catch {
      return false
    }
  }
  if (pendingBlunderGuard.value) {
    return false
  }
  if (!matchStarted.value || gameResult.value !== null || isInspectingHistory.value || isBotThinking.value) {
    return false
  }
  if (isVsEngine.value) {
    return currentTurn.value === humanSideInBot.value
  }
  return true
})

const boardAllowedColor = computed<Color | 'both'>(() => {
  if (showGameReview.value && whatIfSession.value) {
    return whatIfSession.value.moverPerspective
  }
  if (isVsEngine.value) return humanSideInBot.value
  return 'both'
})

const maxHintTier = computed(() => activeLensPreset.value.maxHintTier)
const hintButtonLabel = computed(() => {
  if (maxHintTier.value === 0) return 'Tanpa Petunjuk'
  if (hintTier.value === 0) return `Petunjuk (1/${maxHintTier.value})`
  if (hintTier.value < maxHintTier.value) return `Petunjuk (${hintTier.value + 1}/${maxHintTier.value})`
  return 'Ulang Petunjuk'
})

const canUndo = computed(
  () => matchStarted.value && snapshots.value.length > 1 && !isBotThinking.value && !gameResult.value
)

const topColor = computed<Color>(() => (orientation.value === 'w' ? 'b' : 'w'))
const bottomColor = computed<Color>(() => orientation.value)

function playerDisplayInfo(color: Color) {
  if (isVsEngine.value) {
    const isBot = color !== humanSideInBot.value
    const personaSuffix =
      isBot && selectedPersonaId.value !== 'default' ? ` · ${activePersona.value.nameId}` : ''
    const humanLabel = authUser.value?.name?.trim().split(/\s+/)[0] || 'Anda'
    return {
      name: isBot ? `${activeBot.value.name}` : humanLabel,
      badge: isBot
        ? `${activeBot.value.elo} ELO${personaSuffix}`
        : color === 'w'
          ? 'Putih'
          : 'Hitam',
      isBot,
      avatarPiece: isBot ? activeBot.value.avatarPiece : null,
      timeLeft: color === 'w' ? whiteTimeLeft.value : blackTimeLeft.value,
      capturedPieces: color === 'w' ? captured.value.whiteCaptured : captured.value.blackCaptured,
      materialAdvantage:
        color === 'w'
          ? Math.max(0, captured.value.materialDiff)
          : Math.max(0, -captured.value.materialDiff),
      isActiveTurn: matchStarted.value && !gameResult.value && currentTurn.value === color
    }
  }
  return {
    name: color === 'w' ? pvpWhiteName.value.trim() || 'Pemain 1' : pvpBlackName.value.trim() || 'Pemain 2',
    badge: color === 'w' ? 'Putih' : 'Hitam',
    isBot: false,
    avatarPiece: null,
    timeLeft: color === 'w' ? whiteTimeLeft.value : blackTimeLeft.value,
    capturedPieces: color === 'w' ? captured.value.whiteCaptured : captured.value.blackCaptured,
    materialAdvantage:
      color === 'w'
        ? Math.max(0, captured.value.materialDiff)
        : Math.max(0, -captured.value.materialDiff),
    isActiveTurn: matchStarted.value && !gameResult.value && currentTurn.value === color
  }
}

const topPlayer = computed(() => playerDisplayInfo(topColor.value))
const bottomPlayer = computed(() => playerDisplayInfo(bottomColor.value))

const evalBarWidth = computed(() => {
  const clamped = Math.max(-8, Math.min(8, liveEvalPawns.value))
  return Math.round(((clamped + 8) / 16) * 100)
})

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function clearTimers() {
  clearWhatIfReplyTimer()
  if (botTimer) {
    clearTimeout(botTimer)
    botTimer = null
  }
  if (clockInterval) {
    clearInterval(clockInterval)
    clockInterval = null
  }
}

function startClock() {
  if (clockInterval) {
    clearInterval(clockInterval)
    clockInterval = null
  }
  if (activeTimeControl.value.baseSeconds <= 0) return

  clockInterval = setInterval(() => {
    if (!matchStarted.value || gameResult.value) return
    // Start ticking once White makes the first move (or immediately if playing vs bot as Black)
    if (latestPly.value === 0 && (gameMode.value === 'pvp' || humanSideInBot.value === 'w')) return

    if (currentTurn.value === 'w') {
      whiteTimeLeft.value = Math.max(0, whiteTimeLeft.value - 1)
      if (whiteTimeLeft.value === 0) {
        finishByTimeout('w')
      }
    } else {
      blackTimeLeft.value = Math.max(0, blackTimeLeft.value - 1)
      if (blackTimeLeft.value === 0) {
        finishByTimeout('b')
      }
    }
  }, 1000)
}

function finishByTimeout(flaggedColor: Color) {
  clearTimers()
  const winner: Color = flaggedColor === 'w' ? 'b' : 'w'
  const loserName = playerDisplayInfo(flaggedColor).name
  const winnerName = playerDisplayInfo(winner).name
  gameResult.value = {
    title: `${winnerName} Menang Waktu!`,
    subtitle: `Waktu ${loserName} habis.`,
    winner
  }
  if (isVsEngine.value && winner !== humanSideInBot.value) {
    playErrorSound(isMuted.value)
  } else {
    playSuccessChime(isMuted.value)
  }
}

function checkGameEnd(game: Chess): boolean {
  if (game.isCheckmate()) {
    clearTimers()
    const winner: Color = game.turn() === 'w' ? 'b' : 'w'
    const winnerName = playerDisplayInfo(winner).name
    gameResult.value = {
      title: `Skakmat: ${winnerName} Menang!`,
      subtitle: `Partai berakhir pada langkah ke-${Math.ceil(latestPly.value / 2)}.`,
      winner
    }
    if (isVsEngine.value && winner !== humanSideInBot.value) {
      playErrorSound(isMuted.value)
    } else {
      playSuccessChime(isMuted.value)
    }
    return true
  }

  if (game.isStalemate()) {
    clearTimers()
    gameResult.value = {
      title: 'Remis: Pat (Stalemate)',
      subtitle: 'Sisi yang giliran jalan tidak memiliki langkah legal tanpa dalam posisi skak.',
      winner: 'draw'
    }
    playSuccessChime(isMuted.value)
    return true
  }

  if (game.isThreefoldRepetition()) {
    clearTimers()
    gameResult.value = {
      title: 'Remis: Repetisi 3 Kali',
      subtitle: 'Posisi yang sama muncul tiga kali berturut-turut.',
      winner: 'draw'
    }
    playSuccessChime(isMuted.value)
    return true
  }

  if (game.isInsufficientMaterial()) {
    clearTimers()
    gameResult.value = {
      title: 'Remis: Materi Tidak Cukup',
      subtitle: 'Kedua pihak tidak lagi memiliki materi yang cukup untuk melakukan skakmat.',
      winner: 'draw'
    }
    playSuccessChime(isMuted.value)
    return true
  }

  if (game.isDraw()) {
    clearTimers()
    gameResult.value = {
      title: 'Permainan Berakhir Remis',
      subtitle: 'Aturan 50 langkah terpenuhi.',
      winner: 'draw'
    }
    playSuccessChime(isMuted.value)
    return true
  }

  return false
}

function scheduleBotMoveIfNeeded() {
  if (botTimer) {
    clearTimeout(botTimer)
    botTimer = null
  }
  if (!matchStarted.value || !isVsEngine.value || gameResult.value) return

  const latest = snapshots.value[latestPly.value]
  if (!latest) return
  const g = new Chess(latest.fen)
  if (g.isGameOver() || g.turn() === humanSideInBot.value) return

  isBotThinking.value = true
  const bot = activeBot.value
  const thinkDelay = bot.elo <= 800 ? 320 : bot.elo <= 1800 ? 400 : 460

  botTimer = setTimeout(() => {
    const sanHistory = snapshots.value.slice(1).map((s) => s.san)
    const res = computeBotMove(latest.fen, bot, sanHistory, selectedPersonaId.value)
    isBotThinking.value = false

    if (!res.move || gameResult.value) return

    const after = new Chess(latest.fen)
    const played = after.move(res.move)

    // Add clock increment for the side that just moved
    if (activeTimeControl.value.baseSeconds > 0 && activeTimeControl.value.incrementSeconds > 0) {
      if (played.color === 'w') whiteTimeLeft.value += activeTimeControl.value.incrementSeconds
      else blackTimeLeft.value += activeTimeControl.value.incrementSeconds
    }

    const nextPly = snapshots.value.length
    snapshots.value = [
      ...snapshots.value,
      {
        fen: after.fen(),
        lastMove: { from: played.from, to: played.to },
        san: played.san,
        color: played.color,
        moveNumber: Math.ceil(nextPly / 2)
      }
    ]
    viewingPly.value = null
    appendEvalPoint(after, nextPly, played.san, latest.fen, played.color)

    // Update humanized bot sparring dialogue
    const botAdvantage = humanSideInBot.value === 'w' ? -liveEvalPawns.value : liveEvalPawns.value
    const moment =
      played.san.includes('+') || played.san.includes('#')
        ? 'check_delivered'
        : played.captured
          ? 'capture_made'
          : nextPly >= 46
            ? 'endgame_reached'
            : botAdvantage <= -1.6
              ? 'under_pressure'
              : 'gambit_or_attack'
    botLiveComment.value = getPersonaLiveReaction(selectedPersonaId.value, moment, nextPly)

    if (played.san.includes('+') || played.san.includes('#')) {
      playCheckSound(isMuted.value)
    } else if (played.captured) {
      playWoodenCapture(isMuted.value)
    } else {
      playWoodenMove(isMuted.value)
    }

    checkGameEnd(after)
  }, thinkDelay)
}

function clearHints() {
  hintTier.value = 0
  activeHintResult.value = null
  hintFrom.value = null
  hintTo.value = null
}

function startNewMatch() {
  clearTimers()
  const resolvedSide: Color =
    isVsEngine.value
      ? playerSidePref.value === 'random'
        ? Math.random() < 0.5
          ? 'w'
          : 'b'
        : playerSidePref.value
      : 'w'

  humanSideInBot.value = resolvedSide
  orientation.value = resolvedSide
  const startFen = new Chess().fen()
  snapshots.value = [
    {
      fen: startFen,
      lastMove: null,
      san: '',
      color: 'w',
      moveNumber: 0
    }
  ]
  evalHistory.value = [
    {
      ply: 0,
      san: 'Awal',
      fen: startFen,
      beforeFen: startFen,
      score: 0,
      color: 'w'
    }
  ]
  showMatchReport.value = false
  matchArchived.value = false
  showGameReview.value = false
  isAnalyzingReview.value = false
  gameReviewReport.value = null
  whatIfSession.value = null
  whatIfError.value = null
  pendingBlunderGuard.value = null
  reviewRunSeq += 1
  viewingPly.value = null
  isBotThinking.value = false
  gameResult.value = null
  liveEvalPawns.value = 0
  clearHints()

  if (isVsEngine.value) {
    botLiveComment.value = getPersonaLiveReaction(selectedPersonaId.value, 'match_start', 0)
  } else {
    botLiveComment.value = ''
  }

  const baseSec = activeTimeControl.value.baseSeconds
  whiteTimeLeft.value = baseSec
  blackTimeLeft.value = baseSec

  matchStarted.value = true
  startClock()

  if (isVsEngine.value && humanSideInBot.value === 'b') {
    scheduleBotMoveIfNeeded()
  }
}

function handleWhatIfBoardMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (!whatIfSession.value) return
  clearWhatIfReplyTimer()
  const outcome = stepWhatIfMove(whatIfSession.value, payload, activeLens.value)
  if (!outcome.valid) {
    whatIfError.value = outcome.errorMessage ?? 'Langkah tersebut tidak sah pada cabang ini.'
    playErrorSound(isMuted.value)
    return
  }
  whatIfError.value = null
  whatIfSession.value = outcome.nextSession
  playWoodenMove(isMuted.value)
  scheduleWhatIfAutoReply()
}

function commitLiveMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  const latest = snapshots.value[latestPly.value]
  if (!latest) return

  const g = new Chess(latest.fen)
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

  pendingBlunderGuard.value = null
  clearHints()

  if (activeTimeControl.value.baseSeconds > 0 && activeTimeControl.value.incrementSeconds > 0) {
    if (played.color === 'w') whiteTimeLeft.value += activeTimeControl.value.incrementSeconds
    else blackTimeLeft.value += activeTimeControl.value.incrementSeconds
  }

  const nextPly = snapshots.value.length
  snapshots.value = [
    ...snapshots.value,
    {
      fen: g.fen(),
      lastMove: { from: played.from, to: played.to },
      san: played.san,
      color: played.color,
      moveNumber: Math.ceil(nextPly / 2)
    }
  ]
  viewingPly.value = null
  appendEvalPoint(g, nextPly, played.san, latest.fen, played.color)

  if (played.san.includes('+') || played.san.includes('#')) {
    playCheckSound(isMuted.value)
  } else if (played.captured) {
    playWoodenCapture(isMuted.value)
  } else {
    playWoodenMove(isMuted.value)
  }

  const ended = checkGameEnd(g)
  if (!ended) {
    if (isVsEngine.value) {
      scheduleBotMoveIfNeeded()
    } else if (pvpAutoFlip.value) {
      orientation.value = g.turn()
    }
  }
}

function handleMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (showGameReview.value && whatIfSession.value) {
    handleWhatIfBoardMove(payload)
    return
  }

  if (!canInteractBoard.value) return
  const latest = snapshots.value[latestPly.value]
  if (!latest) return

  // Check Socratic Blunder Guard when Apprentice Lens is active
  if (activeLens.value === 'apprentice' && isVsEngine.value) {
    const risk = evaluateMoveRisk(latest.fen, payload, activeLens.value)
    if (risk.shouldWarn) {
      pendingBlunderGuard.value = { payload, risk }
      playErrorSound(isMuted.value)
      return
    }
  }

  commitLiveMove(payload)
}

function confirmBlunderGuardMove() {
  if (!pendingBlunderGuard.value) return
  const chosen = pendingBlunderGuard.value.payload
  pendingBlunderGuard.value = null
  commitLiveMove(chosen)
}

function dismissBlunderGuard() {
  pendingBlunderGuard.value = null
}

function startWhatIfSession(candidateSan?: string) {
  clearWhatIfReplyTimer()
  const mv = activeReviewedMove.value
  const humanSide: Color = isVsEngine.value ? humanSideInBot.value : 'w'
  const isOpponentNonMate = Boolean(mv && mv.color !== humanSide && !mv.isMate)

  // If inspecting an opponent's move, start What-If on mv.afterFen so the PLAYER moves THEIR OWN pieces!
  const originFen = mv
    ? isOpponentNonMate
      ? mv.afterFen
      : mv.beforeFen
    : (snapshots.value[0]?.fen ?? new Chess().fen())

  const originLabel = mv
    ? isOpponentNonMate
      ? `Balasanmu setelah ${mv.moveNumber}${mv.color === 'w' ? '.' : '...'} ${mv.san}`
      : `Langkah ${mv.moveNumber}${mv.color === 'w' ? '.' : '...'} (alternatif ${mv.san})`
    : 'Posisi Awal'

  let session = createWhatIfSession(
    originFen,
    originLabel,
    isOpponentNonMate ? null : (mv?.san ?? null),
    activeLens.value
  )
  whatIfError.value = null

  if (candidateSan) {
    const outcome = stepWhatIfMove(session, candidateSan, activeLens.value)
    if (outcome.valid) {
      session = outcome.nextSession
      playWoodenMove(isMuted.value)
    } else if (outcome.errorMessage) {
      whatIfError.value = outcome.errorMessage
    }
  }

  whatIfSession.value = session
  if (candidateSan) {
    scheduleWhatIfAutoReply()
  }
}

function playWhatIfCandidate(san: string) {
  if (!whatIfSession.value) return
  clearWhatIfReplyTimer()
  const outcome = stepWhatIfMove(whatIfSession.value, san, activeLens.value)
  if (!outcome.valid) {
    whatIfError.value = outcome.errorMessage ?? 'Langkah kandidat tidak dapat dijalankan.'
    return
  }
  whatIfError.value = null
  whatIfSession.value = outcome.nextSession
  playWoodenMove(isMuted.value)
  scheduleWhatIfAutoReply()
}

function playWhatIfOpponentReply() {
  if (!whatIfSession.value) return
  clearWhatIfReplyTimer()
  whatIfError.value = null
  whatIfSession.value = applyOpponentReplyInWhatIf(whatIfSession.value, activeLens.value)
  playWoodenMove(isMuted.value)
}

function toggleWhatIfAutoReply() {
  whatIfAutoReply.value = !whatIfAutoReply.value
  if (whatIfAutoReply.value && whatIfSession.value?.pendingOpponentReply) {
    scheduleWhatIfAutoReply()
  }
}

function rewindWhatIfBranch() {
  if (!whatIfSession.value) return
  clearWhatIfReplyTimer()
  whatIfError.value = null
  whatIfSession.value = rewindWhatIfPly(whatIfSession.value, activeLens.value)
}

function resetWhatIfBranch() {
  if (!whatIfSession.value) return
  clearWhatIfReplyTimer()
  whatIfError.value = null
  whatIfSession.value = createWhatIfSession(
    whatIfSession.value.originFen,
    whatIfSession.value.originLabel,
    whatIfSession.value.originalMoveSan,
    activeLens.value
  )
}

function closeWhatIfSession() {
  clearWhatIfReplyTimer()
  whatIfSession.value = null
  whatIfError.value = null
}

function undoMove() {
  if (!canUndo.value) return
  if (botTimer) {
    clearTimeout(botTimer)
    botTimer = null
  }
  pendingBlunderGuard.value = null
  clearHints()

  let nextLen = snapshots.value.length - 1
  if (isVsEngine.value && nextLen > 1) {
    // Undo back to human's turn
    const candidate = snapshots.value[nextLen - 1]
    if (candidate && new Chess(candidate.fen).turn() !== humanSideInBot.value) {
      nextLen -= 1
    }
  }

  snapshots.value = snapshots.value.slice(0, Math.max(1, nextLen))
  evalHistory.value = evalHistory.value.slice(0, Math.max(1, nextLen))
  viewingPly.value = null

  if (gameMode.value === 'pvp' && pvpAutoFlip.value) {
    const cur = snapshots.value[snapshots.value.length - 1]
    if (cur) orientation.value = new Chess(cur.fen).turn()
  }
}

function requestHint() {
  if (!canInteractBoard.value || maxHintTier.value === 0) return
  const latest = snapshots.value[latestPly.value]
  if (!latest) return

  const nextTier = (hintTier.value >= maxHintTier.value ? 1 : hintTier.value + 1) as 1 | 2 | 3
  const res = computeTieredHint(latest.fen, nextTier, activeLens.value, planVariationSeed.value)
  hintTier.value = nextTier
  activeHintResult.value = res
  hintFrom.value = res.hintFrom
  hintTo.value = res.hintTo
}

function resignMatch() {
  if (!matchStarted.value || gameResult.value) return
  clearTimers()
  pendingBlunderGuard.value = null
  const resigningColor: Color = isVsEngine.value ? humanSideInBot.value : currentTurn.value
  const winner: Color = resigningColor === 'w' ? 'b' : 'w'
  const resigningName = playerDisplayInfo(resigningColor).name
  const winnerName = playerDisplayInfo(winner).name
  gameResult.value = {
    title: `${winnerName} Menang (Menyerah)`,
    subtitle: `${resigningName} memilih menyerah.`,
    winner
  }
  playErrorSound(isMuted.value)
}

function agreeDraw() {
  if (!matchStarted.value || gameResult.value) return
  clearTimers()
  pendingBlunderGuard.value = null
  gameResult.value = {
    title: 'Remis atas Kesepakatan',
    subtitle: 'Kedua pemain sepakat mengakhiri pertandingan dengan hasil imbang.',
    winner: 'draw'
  }
  playSuccessChime(isMuted.value)
}

function backToSetup() {
  clearTimers()
  matchStarted.value = false
  gameResult.value = null
  showGameReview.value = false
  isAnalyzingReview.value = false
  gameReviewReport.value = null
  whatIfSession.value = null
  whatIfError.value = null
  pendingBlunderGuard.value = null
  reviewRunSeq += 1
  isBotThinking.value = false
  clearHints()
}

async function goToMainMenu() {
  clearTimers()
  await navigateTo('/')
}

function switchGameMode(mode: GameMode) {
  if (gameMode.value === mode) return
  clearTimers()
  gameMode.value = mode
  matchStarted.value = false
  gameResult.value = null
  showGameReview.value = false
  isAnalyzingReview.value = false
  gameReviewReport.value = null
  whatIfSession.value = null
  whatIfError.value = null
  pendingBlunderGuard.value = null
  reviewRunSeq += 1
  clearHints()
}

onBeforeUnmount(() => {
  clearTimers()
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleEscapeKey)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Header & Mode Switcher -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="font-serif text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Studio Sparring &amp; Pelatih Sokratik
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
          Berlatih melawan kepribadian bot yang manusiawi (250 hingga 3200 ELO) dengan Lensa Panduan yang menyesuaikan diri dari Perintis hingga Master, atau bermain 2 orang di satu papan.
        </p>
      </div>

      <!-- Mode Switcher Tabs -->
      <div
        class="inline-flex flex-wrap items-center p-1 rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] self-start md:self-auto gap-0.5"
        role="tablist"
        aria-label="Pilih mode permainan"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="gameMode === 'bot'"
          class="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="
            gameMode === 'bot'
              ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchGameMode('bot')"
        >
          <Bot class="w-4 h-4" aria-hidden="true" />
          <span>Katalog Bot</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="gameMode === 'custom'"
          class="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="
            gameMode === 'custom'
              ? 'bg-[#9B452C] text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchGameMode('custom')"
        >
          <SlidersHorizontal class="w-4 h-4" aria-hidden="true" />
          <span>Mesin Kustom</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="gameMode === 'pvp'"
          class="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="
            gameMode === 'pvp'
              ? 'bg-[#526857] text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchGameMode('pvp')"
        >
          <Users class="w-4 h-4" aria-hidden="true" />
          <span>Main 2 Orang</span>
        </button>
      </div>
    </div>

    <!-- Main Split Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <!-- Board Column -->
      <div class="lg:col-span-7 space-y-3">
        <!-- Top Player Bar -->
        <div
          class="max-w-[560px] mx-auto rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition"
          :class="
            topPlayer.isActiveTurn
              ? 'bg-white dark:bg-[#19191D] border-[#5D7463] ring-1 ring-[#5D7463]/30'
              : 'bg-white/75 dark:bg-[#19191D]/75 border-zinc-200/80 dark:border-zinc-800'
          "
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border p-1"
              :class="
                topColor === 'w'
                  ? 'bg-[#FAF8F3] text-zinc-900 border-zinc-300'
                  : 'bg-zinc-900 text-[#FAF8F3] border-zinc-700'
              "
            >
              <ChessPiece
                v-if="topPlayer.avatarPiece"
                :type="topPlayer.avatarPiece.type"
                :color="topPlayer.avatarPiece.color"
              />
              <span v-else>{{ topColor === 'w' ? 'P' : 'H' }}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ topPlayer.name }}
                </span>
                <span
                  class="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700"
                >
                  {{ topPlayer.badge }}
                </span>
                <span
                  v-if="topPlayer.isBot && isBotThinking"
                  class="text-[11px] text-[#495C4D] dark:text-[#9FC0A8] font-medium"
                >
                  Sedang menghitung...
                </span>
              </div>
              <!-- Captured pieces -->
              <div class="flex items-center gap-0.5 mt-0.5 min-h-[16px]">
                <div
                  v-for="(piece, i) in topPlayer.capturedPieces"
                  :key="`${piece}-${i}`"
                  class="w-4 h-4 -mr-1"
                >
                  <ChessPiece :type="piece" :color="topColor === 'w' ? 'b' : 'w'" />
                </div>
                <span
                  v-if="topPlayer.materialAdvantage > 0"
                  class="ml-2 font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
                >
                  +{{ topPlayer.materialAdvantage }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="activeTimeControl.baseSeconds > 0"
            class="font-mono text-sm sm:text-base font-semibold px-3 py-1 rounded-lg border shrink-0"
            :class="
              topPlayer.isActiveTurn
                ? 'bg-[#18181B] text-white border-[#18181B] dark:bg-[#EDEAE0] dark:text-[#18181B]'
                : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
            "
          >
            {{ formatClock(topPlayer.timeLeft) }}
          </div>
        </div>

        <!-- Humanized Bot Persona Live Dialogue Bubble -->
        <div
          v-if="matchStarted && !gameResult && isVsEngine && botLiveComment"
          class="max-w-[560px] mx-auto rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#FAF8F4] dark:bg-zinc-900/80 px-3.5 py-2 flex items-start gap-2.5 text-xs"
        >
          <MessageSquareQuote
            class="w-4 h-4 text-[#526857] dark:text-[#9FC0A8] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p class="text-zinc-700 dark:text-zinc-200 leading-relaxed">
            <strong class="font-semibold text-zinc-900 dark:text-zinc-100">
              {{ activeBot.name }} ({{ activePersona.nameId }}):
            </strong>
            {{ botLiveComment }}
          </p>
        </div>

        <!-- What-If Sandbox Active Banner -->
        <div
          v-if="showGameReview && whatIfSession"
          class="max-w-[560px] mx-auto rounded-xl border border-[#718675]/55 bg-[#EEF3EF] dark:bg-[#1E2620] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
        >
          <span class="font-semibold text-[#233227] dark:text-[#DCEBE0]">
            Papan Uji What-If Aktif ({{ whatIfSession.originLabel }}). Gerakkan bidak langsung di papan.
          </span>
          <button
            type="button"
            class="min-h-[44px] px-3 py-1.5 rounded-lg font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321]"
            @click="closeWhatIfSession"
          >
            Selesai Uji
          </button>
        </div>

        <!-- Chessboard -->
        <ChessBoard
          :fen="boardFen"
          :orientation="orientation"
          :interactive="canInteractBoard"
          :allowed-color="boardAllowedColor"
          :last-move="boardLastMove"
          :hint-from="isInspectingHistory || showGameReview ? null : hintFrom"
          :hint-to="isInspectingHistory || showGameReview ? null : hintTo"
          :hanging-squares="boardHangingSquares"
          :tension-squares="boardTensionSquares"
          :arrows="boardArrows"
          :move-badge="reviewMoveBadge"
          @move="handleMove"
        />

        <!-- Live Socratic Blunder Guard (Apprentice Lens) -->
        <div
          v-if="pendingBlunderGuard"
          role="alertdialog"
          aria-labelledby="blunder-guard-title"
          aria-describedby="blunder-guard-desc"
          class="max-w-[560px] mx-auto rounded-2xl border-2 border-[#B85D43] bg-[#FDF7F5] dark:bg-[#261B18] p-4 space-y-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <ShieldAlert class="w-5 h-5 text-[#B85D43] dark:text-[#F09A82] shrink-0" aria-hidden="true" />
              <h3 id="blunder-guard-title" class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {{ pendingBlunderGuard.risk.warningTitle }}
              </h3>
            </div>
            <span
              v-if="pendingBlunderGuard.risk.opponentPunishmentSan"
              class="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#B85D43]/15 dark:bg-[#B85D43]/30 text-[#8F3E27] dark:text-[#FAD7CD]"
            >
              Ancaman: {{ pendingBlunderGuard.risk.opponentPunishmentSan }}
            </span>
          </div>

          <p id="blunder-guard-desc" class="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {{ pendingBlunderGuard.risk.socraticPrompt }}
          </p>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              class="min-h-[44px] flex-1 px-4 py-2 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:opacity-90 transition"
              @click="dismissBlunderGuard"
            >
              Tarik &amp; Pikir Ulang
            </button>
            <button
              type="button"
              class="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#B85D43] text-[#9A4229] dark:text-[#F4B4A2] bg-white dark:bg-zinc-900 hover:bg-[#B85D43]/10 transition"
              @click="confirmBlunderGuardMove"
            >
              Tetap Mainkan {{ pendingBlunderGuard.risk.attemptedSan }}
            </button>
          </div>
        </div>

        <!-- Tiered Socratic Hint Card -->
        <div
          v-if="activeHintResult && !showGameReview && !gameResult"
          role="status"
          class="max-w-[560px] mx-auto rounded-xl border border-[#718675]/50 bg-[#F2F6F3] dark:bg-[#1D251F] px-3.5 py-3 flex items-start justify-between gap-3"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-1.5">
              <Lightbulb class="w-4 h-4 text-[#526857] dark:text-[#9FC0A8] shrink-0" aria-hidden="true" />
              <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {{ activeHintResult.headline }}
              </span>
            </div>
            <p class="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
              {{ activeHintResult.message }}
            </p>
          </div>
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition"
            aria-label="Tutup petunjuk"
            @click="clearHints"
          >
            <X class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <!-- Bottom Player Bar -->
        <div
          class="max-w-[560px] mx-auto rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition"
          :class="
            bottomPlayer.isActiveTurn
              ? 'bg-white dark:bg-[#19191D] border-[#5D7463] ring-1 ring-[#5D7463]/30'
              : 'bg-white/75 dark:bg-[#19191D]/75 border-zinc-200/80 dark:border-zinc-800'
          "
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border p-1"
              :class="
                bottomColor === 'w'
                  ? 'bg-[#FAF8F3] text-zinc-900 border-zinc-300'
                  : 'bg-zinc-900 text-[#FAF8F3] border-zinc-700'
              "
            >
              <ChessPiece
                v-if="bottomPlayer.avatarPiece"
                :type="bottomPlayer.avatarPiece.type"
                :color="bottomPlayer.avatarPiece.color"
              />
              <span v-else>{{ bottomColor === 'w' ? 'P' : 'H' }}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ bottomPlayer.name }}
                </span>
                <span
                  class="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700"
                >
                  {{ bottomPlayer.badge }}
                </span>
              </div>
              <div class="flex items-center gap-0.5 mt-0.5 min-h-[16px]">
                <div
                  v-for="(piece, i) in bottomPlayer.capturedPieces"
                  :key="`${piece}-${i}`"
                  class="w-4 h-4 -mr-1"
                >
                  <ChessPiece :type="piece" :color="bottomColor === 'w' ? 'b' : 'w'" />
                </div>
                <span
                  v-if="bottomPlayer.materialAdvantage > 0"
                  class="ml-2 font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
                >
                  +{{ bottomPlayer.materialAdvantage }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="activeTimeControl.baseSeconds > 0"
            class="font-mono text-sm sm:text-base font-semibold px-3 py-1 rounded-lg border shrink-0"
            :class="
              bottomPlayer.isActiveTurn
                ? 'bg-[#18181B] text-white border-[#18181B] dark:bg-[#EDEAE0] dark:text-[#18181B]'
                : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
            "
          >
            {{ formatClock(bottomPlayer.timeLeft) }}
          </div>
        </div>

        <!-- History Inspection Banner -->
        <div
          v-if="isInspectingHistory && !showGameReview"
          class="max-w-[560px] mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
        >
          <span class="text-amber-900 dark:text-amber-200 font-medium">
            Meninjau langkah ke-{{ displayedPly }} dari {{ latestPly }}.
          </span>
          <button
            type="button"
            class="min-h-[44px] px-3.5 py-2 rounded-lg font-semibold bg-amber-900 text-white dark:bg-amber-200 dark:text-amber-950"
            @click="viewingPly = null"
          >
            Kembali ke Posisi Aktif
          </button>
        </div>

        <!-- Match Action Bar (shown when match is active) -->
        <div
          v-if="matchStarted && !showGameReview"
          class="max-w-[560px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          <button
            type="button"
            class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="!canUndo"
            @click="undoMove"
          >
            <Undo2 class="w-4 h-4" aria-hidden="true" />
            <span>Mundur</span>
          </button>

          <button
            v-if="isVsEngine"
            type="button"
            class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#B85D43] disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="!canInteractBoard || maxHintTier === 0"
            @click="requestHint"
          >
            <Lightbulb class="w-4 h-4 text-[#B85D43]" aria-hidden="true" />
            <span>{{ hintButtonLabel }}</span>
          </button>

          <button
            v-else
            type="button"
            class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="Boolean(gameResult)"
            @click="agreeDraw"
          >
            <Handshake class="w-4 h-4" aria-hidden="true" />
            <span>Sepakat Remis</span>
          </button>

          <button
            type="button"
            class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition"
            @click="orientation = orientation === 'w' ? 'b' : 'w'"
          >
            <FlipVertical2 class="w-4 h-4" aria-hidden="true" />
            <span>Putar Papan</span>
          </button>

          <button
            type="button"
            class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-[#9A4229] dark:text-[#F09A82] hover:bg-[#FDF6F3] dark:hover:bg-[#2A1B16] disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="Boolean(gameResult)"
            @click="resignMatch"
          >
            <Flag class="w-4 h-4" aria-hidden="true" />
            <span>Menyerah</span>
          </button>
        </div>
      </div>

      <!-- Right Sidebar: Game Review Panel OR Setup Panel OR Live Match Panel -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Interactive Post-Match Game Review Panel ("Ulasan Permainan") -->
        <GameReviewPanel
          v-if="gameResult && showGameReview"
          :report="gameReviewReport"
          :is-analyzing="isAnalyzingReview"
          :analysis-progress="reviewAnalysisProgress"
          :active-ply="displayedPly"
          :total-plies="latestPly"
          :white-name="whiteReviewInfo.name"
          :black-name="blackReviewInfo.name"
          :white-is-bot="whiteReviewInfo.isBot"
          :black-is-bot="blackReviewInfo.isBot"
          :white-avatar-piece="whiteReviewInfo.avatarPiece"
          :black-avatar-piece="blackReviewInfo.avatarPiece"
          :result-title="gameResult.title"
          :result-subtitle="gameResult.subtitle"
          :human-side="isVsEngine ? humanSideInBot : 'w'"
          :opponent-elo="isVsEngine ? activeBot.elo : 0"
          :final-fen="snapshots[latestPly]?.fen ?? displayedSnapshot.fen"
          :lens="activeLens"
          :what-if-session="whatIfSession"
          :what-if-error="whatIfError"
          :what-if-auto-reply="whatIfAutoReply"
          @select-ply="viewingPly = $event"
          @close="
            () => {
              showGameReview = false
              closeWhatIfSession()
            }
          "
          @rematch="startNewMatch"
          @update-lens="handleLensChange"
          @start-what-if="startWhatIfSession"
          @play-what-if-candidate="playWhatIfCandidate"
          @play-what-if-opponent-reply="playWhatIfOpponentReply"
          @toggle-what-if-auto-reply="toggleWhatIfAutoReply"
          @rewind-what-if="rewindWhatIfBranch"
          @reset-what-if="resetWhatIfBranch"
          @close-what-if="closeWhatIfSession"
          @back-to-setup="backToSetup"
          @main-menu="goToMainMenu"
        />

        <!-- Game Result Banner (Shown when Game Review panel is closed) -->
        <div
          v-else-if="gameResult"
          class="rounded-2xl border p-5 space-y-3"
          :class="
            gameResult.winner === 'draw'
              ? 'bg-[#F8F7F4] dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
              : 'bg-[#F1F5F2] dark:bg-[#1B261E] border-[#B9CBBF] dark:border-[#3A5241]'
          "
        >
          <div class="flex items-start gap-3">
            <Trophy class="w-5 h-5 text-[#5D7463] dark:text-[#A3C4AB] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h3 class="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {{ gameResult.title }}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                {{ gameResult.subtitle }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              class="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#3F5344] text-white hover:bg-[#334438] transition shadow-sm"
              @click="
                () => {
                  if (!gameReviewReport && !isAnalyzingReview) {
                    void triggerGameReview(true)
                  } else {
                    showGameReview = true
                  }
                }
              "
            >
              <BarChart3 class="w-4 h-4" aria-hidden="true" />
              <span>Buka Ulasan Sokratik &amp; Simulator What-If</span>
            </button>
            <button
              type="button"
              class="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:opacity-90 transition"
              @click="startNewMatch"
            >
              <RotateCcw class="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tanding Ulang</span>
            </button>
            <button
              type="button"
              class="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-[#718675] transition"
              @click="backToSetup"
            >
              <span>Ubah Pengaturan</span>
            </button>
          </div>
        </div>

        <!-- SETUP PANEL (Shown before match starts) -->
        <div
          v-if="!matchStarted"
          class="rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_-16px_rgba(32,35,33,0.12)] dark:shadow-none"
        >
          <!-- Adaptive Lens Selector -->
          <AdaptiveLensSwitcher
            :model-value="activeLens"
            @update:model-value="handleLensChange"
          />
          <!-- 1. TIERED BOT CATALOG SELECTOR (5 Categories ala Chess.com) -->
          <div v-if="gameMode === 'bot'" class="space-y-3.5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Katalog Bot Bertingkat
              </h2>
              <span class="font-mono text-xs font-semibold text-[#495C4D] dark:text-[#A4BFA9]">
                {{ activeBot.elo }} ELO
              </span>
            </div>

            <!-- 5 Tier Category Selector Pills -->
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Pilih tingkatan bot">
              <button
                v-for="group in BOT_TIER_GROUPS"
                :key="group.tier"
                type="button"
                :aria-pressed="selectedTier === group.tier"
                class="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border transition active:scale-[0.97] cursor-pointer"
                :class="
                  selectedTier === group.tier
                    ? 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321] dark:border-[#EDEAE0]'
                    : 'bg-[#F7F5F0] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
                "
                @click="selectTier(group.tier)"
              >
                {{ group.tier }}
              </button>
            </div>

            <div class="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
              <span>{{ activeTierGroup.summaryId }}</span>
              <span class="font-mono font-semibold text-[#495C4D] dark:text-[#9DB5A1] shrink-0 ml-2">
                {{ activeTierGroup.eloRange }}
              </span>
            </div>

            <!-- Bots inside selected tier with live ChessPiece avatars (adapts to Classic/Animal) -->
            <div class="space-y-2">
              <button
                v-for="bot in botsInSelectedTier"
                :key="bot.id"
                type="button"
                class="w-full text-left p-3 rounded-xl border transition-all duration-150 active:scale-[0.99] cursor-pointer flex items-center gap-3"
                :class="
                  selectedBotId === bot.id
                    ? 'bg-[#F1F5F2] dark:bg-[#1F2A22] border-[#526857] ring-1 ring-[#526857]/40'
                    : 'bg-[#F7F5F0]/75 dark:bg-zinc-900/65 border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
                "
                @click="selectedBotId = bot.id"
              >
                <div
                  class="w-11 h-11 rounded-xl border p-1.5 shrink-0 flex items-center justify-center"
                  :class="
                    bot.avatarPiece.color === 'w'
                      ? 'bg-white dark:bg-zinc-800 border-[#E4DFD5] dark:border-zinc-700'
                      : 'bg-[#EDEAE0] dark:bg-zinc-900 border-[#DCD6CA] dark:border-zinc-700'
                  "
                >
                  <ChessPiece :type="bot.avatarPiece.type" :color="bot.avatarPiece.color" />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {{ bot.name }}
                      </span>
                      <span
                        class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/90 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-[#E4DFD5] dark:border-zinc-700 shrink-0"
                      >
                        {{ bot.playstyle }}
                      </span>
                    </div>
                    <span
                      class="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
                      :style="{ backgroundColor: bot.accentColor }"
                    >
                      {{ bot.elo }}
                    </span>
                  </div>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                    {{ bot.taglineId }}
                  </p>
                </div>
              </button>
            </div>

            <!-- Selected bot detail card -->
            <div
              class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900/80 border border-[#E4DFD5] dark:border-zinc-800 p-3.5 space-y-2 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed"
            >
              <p>
                <strong class="text-zinc-900 dark:text-zinc-100">
                  {{ activeBot.name }} ({{ activeBot.elo }} ELO):
                </strong>
                {{ activeBot.descriptionId }}
              </p>
              <div class="flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                <span>Kedalaman: {{ activeBot.depth }} ply</span>
                <span aria-hidden="true">·</span>
                <span>Agresivitas: {{ Math.round(activeBot.aggression * 100) }}%</span>
                <span aria-hidden="true">·</span>
                <span>{{ activeBot.useBook ? 'Buku Pembukaan Aktif' : 'Tanpa Buku' }}</span>
              </div>
            </div>
          </div>

          <!-- 2. CUSTOM ENGINE MODE (Free ELO Slider 250 - 3200) -->
          <div v-else-if="gameMode === 'custom'" class="space-y-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h2 class="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Mesin Kustom (250–3200 ELO)
                </h2>
                <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Geser rating sesuka Anda atau pilih preset kekuatan instan.
                </p>
              </div>
              <div
                class="w-11 h-11 rounded-xl border border-[#E4DFD5] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-900 p-1.5 shrink-0"
              >
                <ChessPiece :type="activeBot.avatarPiece.type" :color="activeBot.avatarPiece.color" />
              </div>
            </div>

            <!-- Dynamic ELO Display -->
            <div
              class="rounded-2xl bg-[#1B1E1C] dark:bg-[#111214] text-[#F7F5F0] p-4 border border-[#2E3330] dark:border-zinc-800 space-y-3"
            >
              <div class="flex items-baseline justify-between gap-2">
                <div>
                  <span class="text-xs font-medium text-[#A9CBB2] block">
                    {{ activeBot.playstyle }}
                  </span>
                  <div class="font-serif text-3xl font-semibold tracking-tight tabular-nums mt-0.5">
                    {{ customElo }} <span class="font-mono text-sm font-normal text-zinc-300">ELO</span>
                  </div>
                </div>
                <span
                  class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/10 text-zinc-200 border border-white/10"
                >
                  {{ activeBot.tier }}
                </span>
              </div>

              <!-- ELO Range Slider -->
              <div class="space-y-1.5">
                <label for="custom-elo-slider" class="block text-xs font-medium text-zinc-200">
                  Geser Kekuatan Mesin (250 hingga 3200 ELO)
                </label>
                <input
                  id="custom-elo-slider"
                  v-model.number="customElo"
                  type="range"
                  min="250"
                  max="3200"
                  step="50"
                  class="w-full accent-[#B85D43] cursor-pointer"
                />
                <div class="flex items-center justify-between font-mono text-[11px] text-zinc-300">
                  <span>250</span>
                  <span>1200</span>
                  <span>2200</span>
                  <span>3200</span>
                </div>
              </div>

              <!-- Quick Presets: 500, 1200, 2000, 3200 -->
              <div class="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  v-for="preset in CUSTOM_ELO_PRESETS"
                  :key="preset"
                  type="button"
                  :aria-pressed="customElo === preset"
                  class="min-h-[44px] py-1.5 rounded-lg font-mono text-xs font-semibold border transition active:scale-[0.97]"
                  :class="
                    customElo === preset
                      ? 'bg-[#9B452C] text-white border-[#D9846A]'
                      : 'bg-white/[0.06] text-zinc-200 border-white/10 hover:bg-white/[0.14]'
                  "
                  @click="customElo = preset"
                >
                  {{ preset }}
                </button>
              </div>
            </div>

            <!-- Engine Telemetry Breakdown -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-2.5">
                <span class="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Kedalaman
                </span>
                <span class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ activeBot.depth }} Ply
                </span>
              </div>
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-2.5">
                <span class="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Toleransi Khilaf
                </span>
                <span class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ Math.round(activeBot.blunderRate * 100) }}%
                </span>
              </div>
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-2.5">
                <span class="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Batas Waktu
                </span>
                <span class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ activeBot.timeBudgetMs }} ms
                </span>
              </div>
            </div>
          </div>

          <!-- 3. 2-PLAYER LOCAL SETUP -->
          <div v-else class="space-y-3.5">
            <h2 class="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Pengaturan 2 Pemain (Satu Perangkat)
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="pvp-white-name" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Pemain Putih
                </label>
                <input
                  id="pvp-white-name"
                  v-model="pvpWhiteName"
                  type="text"
                  placeholder="Contoh: Pemain Putih"
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#F8F7F4] dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#5D7463]/50"
                />
              </div>
              <div>
                <label for="pvp-black-name" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Pemain Hitam
                </label>
                <input
                  id="pvp-black-name"
                  v-model="pvpBlackName"
                  type="text"
                  placeholder="Contoh: Pemain Hitam"
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#F8F7F4] dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#5D7463]/50"
                />
              </div>
            </div>

            <label
              class="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-[#F8F7F4] dark:bg-zinc-900/70 px-3.5 py-2.5 cursor-pointer"
            >
              <div>
                <span class="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Putar Papan Otomatis Setiap Giliran
                </span>
                <span class="block text-[11px] text-zinc-600 dark:text-zinc-400">
                  Cocok saat bermain berhadap-hadapan di ponsel atau tablet.
                </span>
              </div>
              <input
                v-model="pvpAutoFlip"
                type="checkbox"
                class="w-4 h-4 accent-[#5D7463] rounded cursor-pointer"
              />
            </label>
          </div>

          <!-- Humanized Bot Sparring Persona Selector -->
          <div v-if="isVsEngine" class="space-y-2 pt-1 border-t border-[#E4DFD5]/80 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Kepribadian Sparring Lawan
              </span>
              <span class="text-[11px] font-medium text-[#495C4D] dark:text-[#A4BFA9]">
                {{ activePersona.archetypeLabel }}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Pilih kepribadian gaya bermain bot"
              class="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
            >
              <button
                v-for="persona in BOT_PERSONAS"
                :key="persona.id"
                type="button"
                role="radio"
                :aria-checked="selectedPersonaId === persona.id"
                class="min-h-[44px] px-2.5 py-2 rounded-xl border text-left transition flex flex-col justify-center"
                :class="
                  selectedPersonaId === persona.id
                    ? 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321] dark:border-[#EDEAE0] font-semibold'
                    : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-[#E4DFD5] dark:border-zinc-700 hover:border-[#718675]'
                "
                @click="selectedPersonaId = persona.id"
              >
                <span class="text-xs leading-tight font-semibold">{{ persona.nameId }}</span>
                <span
                  class="text-[10px] leading-snug mt-0.5 truncate"
                  :class="
                    selectedPersonaId === persona.id
                      ? 'text-zinc-300 dark:text-zinc-700'
                      : 'text-zinc-600 dark:text-zinc-400'
                  "
                >
                  {{ persona.archetypeLabel }}
                </span>
              </button>
            </div>

            <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {{ activePersona.descriptionId }}
            </p>
          </div>

          <!-- Side Preference (for both Katalog Bot & Mesin Kustom) -->
          <div v-if="isVsEngine" class="space-y-1.5">
            <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Main Sebagai
            </span>
            <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pilih warna bidak Anda">
              <button
                v-for="opt in [
                  { key: 'w', label: 'Putih' },
                  { key: 'random', label: 'Acak' },
                  { key: 'b', label: 'Hitam' }
                ]"
                :key="opt.key"
                type="button"
                role="radio"
                :aria-checked="playerSidePref === opt.key"
                class="min-h-[44px] py-2 rounded-xl text-xs font-semibold border transition active:scale-[0.98]"
                :class="
                  playerSidePref === opt.key
                    ? 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321]'
                    : 'border-[#E4DFD5] dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-[#718675]'
                "
                @click="playerSidePref = opt.key as SidePreference"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Shared Time Control Selector -->
          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 text-[#5D7463]" aria-hidden="true" />
              <span>Kontrol Waktu</span>
            </span>
            <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pilih kontrol waktu">
              <button
                v-for="tc in TIME_CONTROLS"
                :key="tc.id"
                type="button"
                role="radio"
                :aria-checked="selectedTimeControlId === tc.id"
                class="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                :class="
                  selectedTimeControlId === tc.id
                    ? 'bg-[#5D7463] text-white border-[#5D7463]'
                    : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-[#738578]'
                "
                @click="selectedTimeControlId = tc.id"
              >
                {{ tc.label }}
              </button>
            </div>
          </div>

          <!-- Start CTA -->
          <button
            type="button"
            class="min-h-[48px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#18181B] text-white dark:bg-[#EDEAE0] dark:text-[#18181B] hover:opacity-90 transition shadow-sm"
            @click="startNewMatch"
          >
            <Play class="w-4 h-4" aria-hidden="true" />
            <span>
              {{
                isVsEngine
                  ? `Mulai Sparring Lawan ${activeBot.name} (${activeBot.elo} ELO)`
                  : 'Mulai Pertandingan 2 Pemain'
              }}
            </span>
          </button>
        </div>

        <!-- LIVE MATCH CONTROLS & HISTORY (Hidden while Game Review panel is expanded) -->
        <template v-else-if="!showGameReview">
          <!-- Live Adaptive Lens Switcher -->
          <AdaptiveLensSwitcher
            :model-value="activeLens"
            compact
            @update:model-value="handleLensChange"
          />

          <!-- Live Socratic Co-Pilot / Multi-Branch Plan Radar Card (Apprentice & Club lenses) -->
          <section
            v-if="liveCoPilotBrief"
            aria-label="Radar Panduan Posisi"
            class="rounded-xl border border-[#718675]/45 bg-[#F2F6F3] dark:bg-[#1C241E] p-3.5 space-y-2.5"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5">
                <Compass class="w-4 h-4 text-[#495C4D] dark:text-[#9FC0A8] shrink-0" aria-hidden="true" />
                <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {{ liveCoPilotBrief.headline }}
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <span
                  v-if="liveBoardVision.legalMoveCount > 0"
                  class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-black/30 text-[#36493B] dark:text-[#CBE0D0] border border-[#718675]/30"
                  title="Setiap langkah sah membuka cabang kombinasi baru dari ~10^120 kemungkinan catur"
                >
                  {{ liveBoardVision.legalMoveCount }} cabang sah
                </span>
                <span
                  class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#718675]/18 text-[#36493B] dark:text-[#CBE0D0]"
                >
                  {{ liveCoPilotBrief.badgeLabel }}
                </span>
              </div>
            </div>
            <p class="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
              {{
                focusedPlanSan
                  ? liveBoardVision.planOptions.find((o) => o.san === focusedPlanSan)?.summaryId ?? liveCoPilotBrief.promptText
                  : liveCoPilotBrief.promptText
              }}
            </p>

            <!-- Multi-Branch Plan Chips + Shuffle Variation Button -->
            <div
              v-if="liveBoardVision.planOptions.length > 0"
              class="pt-2 border-t border-[#718675]/25 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#495C4D] dark:text-[#A4CBB3]">
                  Cabang Rencana (Klik untuk Sorot)
                </span>
                <button
                  v-if="liveBoardVision.legalMoveCount > 3"
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white/80 dark:bg-zinc-900/80 border border-[#718675]/35 text-[#36493B] dark:text-[#CBE0D0] hover:bg-[#526857] hover:text-white transition cursor-pointer"
                  @click="cyclePlanVariations"
                >
                  <RotateCcw class="w-3 h-3" aria-hidden="true" />
                  <span>Variasi Lain</span>
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="opt in liveBoardVision.planOptions"
                  :key="`${opt.from}-${opt.to}-${opt.san}`"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer"
                  :class="
                    focusedPlanSan === opt.san
                      ? 'bg-[#202321] text-white border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321]'
                      : 'bg-white/85 dark:bg-zinc-900/75 text-[#202321] dark:text-zinc-100 border-[#718675]/35 hover:border-[#526857]'
                  "
                  @click="toggleFocusPlanOption(opt.san)"
                >
                  <span class="font-mono font-bold">{{ opt.san }}</span>
                  <span class="text-[10px] opacity-75">{{ opt.styleTag }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Match Status & Optional Evaluation Meter -->
          <div
            class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4 space-y-3"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="text-xs">
                <span class="text-zinc-600 dark:text-zinc-400">Giliran Jalan: </span>
                <span class="font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ currentTurn === 'w' ? 'Putih' : 'Hitam' }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="isVsEngine"
                  type="button"
                  class="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition"
                  @click="showEvalMeter = !showEvalMeter"
                >
                  <EyeOff v-if="showEvalMeter" class="w-3.5 h-3.5" aria-hidden="true" />
                  <Eye v-else class="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{{ showEvalMeter ? 'Sembunyikan Eval' : 'Tampilkan Eval' }}</span>
                </button>

                <button
                  type="button"
                  class="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:border-[#738578] transition"
                  @click="backToSetup"
                >
                  <span>Ganti Lawan</span>
                </button>
              </div>
            </div>

            <div v-if="showEvalMeter && isVsEngine" class="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                  <Cpu class="w-3.5 h-3.5 text-[#5D7463]" aria-hidden="true" />
                  <span>Evaluasi Posisi</span>
                </span>
                <span class="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ formatEvalLabel(liveEvalPawns) }}
                </span>
              </div>
              <div class="h-2 rounded-full bg-zinc-800 dark:bg-zinc-950 overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-700">
                <div
                  class="h-full bg-[#EDEAE0] transition-all duration-500"
                  :style="{ width: `${evalBarWidth}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Move History Panel -->
          <MoveHistoryPanel
            :moves="historyItems"
            :active-ply="displayedPly"
            empty-message="Pertandingan dimulai. Gerakkan bidak Putih pertama Anda di papan."
            @select-ply="viewingPly = $event"
          />

          <!-- Quick Restart button -->
          <button
            type="button"
            class="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition"
            @click="startNewMatch"
          >
            <RotateCcw class="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mulai Ulang Pertandingan</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Post-Match Analysis Report Modal (with Advantage Graph & PNG Achievement Card) -->
    <MatchReportModal
      :open="showMatchReport"
      :result-title="gameResult?.title ?? 'Pertandingan Selesai'"
      :result-subtitle="gameResult?.subtitle ?? ''"
      :bot-name="activeBot.name"
      :bot-elo="activeBot.elo"
      :human-side="humanSideInBot"
      :final-fen="displayedSnapshot.fen"
      :eval-history="evalHistory"
      @close="showMatchReport = false"
      @rematch="startNewMatch"
    />
  </div>
</template>
