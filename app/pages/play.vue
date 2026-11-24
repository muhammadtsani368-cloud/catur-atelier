<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  BarChart3,
  Bot,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  Flag,
  FlipVertical2,
  Handshake,
  Lightbulb,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Swords,
  Trophy,
  Undo2,
  Users
} from 'lucide-vue-next'
import type { MatchEvalPoint } from '~/components/MatchReportModal.vue'
import type { HistoryMoveItem } from '~/components/MoveHistoryPanel.vue'
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
  computeBotMove,
  computeCapturedMaterial,
  evaluateBoard
} from '~/utils/chessBotEngine'
import { formatEvalLabel } from '~/utils/endgameEngine'
import { getAtelierProfileHeaders } from '~/utils/profileId'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

const route = useRoute()
const { isMuted } = useTheme()

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
const showEvalMeter = ref(false)
const liveEvalPawns = ref(0)
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)

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

onMounted(() => {
  applyBotFromQuery(route.query.bot)
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

const currentTurn = computed<Color>(() => {
  try {
    return new Chess(displayedSnapshot.value.fen).turn()
  } catch {
    return 'w'
  }
})

const historyItems = computed<HistoryMoveItem[]>(() => {
  return snapshots.value.slice(1).map((snap, idx) => ({
    ply: idx + 1,
    san: snap.san,
    color: snap.color,
    moveNumber: snap.moveNumber
  }))
})

const captured = computed(() => computeCapturedMaterial(displayedSnapshot.value.fen))

const canInteractBoard = computed(() => {
  if (!matchStarted.value || gameResult.value !== null || isInspectingHistory.value || isBotThinking.value) {
    return false
  }
  if (isVsEngine.value) {
    return currentTurn.value === humanSideInBot.value
  }
  return true
})

const boardAllowedColor = computed<Color | 'both'>(() => {
  if (isVsEngine.value) return humanSideInBot.value
  return 'both'
})

const canUndo = computed(
  () => matchStarted.value && snapshots.value.length > 1 && !isBotThinking.value && !gameResult.value
)

const topColor = computed<Color>(() => (orientation.value === 'w' ? 'b' : 'w'))
const bottomColor = computed<Color>(() => orientation.value)

function playerDisplayInfo(color: Color) {
  if (isVsEngine.value) {
    const isBot = color !== humanSideInBot.value
    return {
      name: isBot ? `${activeBot.value.name}` : 'Anda',
      badge: isBot ? `${activeBot.value.elo} ELO` : color === 'w' ? 'Putih' : 'Hitam',
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
  if (isVsEngine.value) {
    showMatchReport.value = true
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
    if (isVsEngine.value) showMatchReport.value = true
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
    if (isVsEngine.value) showMatchReport.value = true
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
    if (isVsEngine.value) showMatchReport.value = true
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
    if (isVsEngine.value) showMatchReport.value = true
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
    if (isVsEngine.value) showMatchReport.value = true
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
    const res = computeBotMove(latest.fen, bot, sanHistory)
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
  viewingPly.value = null
  isBotThinking.value = false
  gameResult.value = null
  liveEvalPawns.value = 0
  hintFrom.value = null
  hintTo.value = null

  const baseSec = activeTimeControl.value.baseSeconds
  whiteTimeLeft.value = baseSec
  blackTimeLeft.value = baseSec

  matchStarted.value = true
  startClock()

  if (isVsEngine.value && humanSideInBot.value === 'b') {
    scheduleBotMoveIfNeeded()
  }
}

function handleMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (!canInteractBoard.value) return
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

  hintFrom.value = null
  hintTo.value = null

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

function undoMove() {
  if (!canUndo.value) return
  if (botTimer) {
    clearTimeout(botTimer)
    botTimer = null
  }
  hintFrom.value = null
  hintTo.value = null

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
  if (!canInteractBoard.value) return
  const latest = snapshots.value[latestPly.value]
  if (!latest) return
  const gmProfile = buildCustomEngineBot(2600)
  const res = computeBotMove(latest.fen, { ...gmProfile, timeBudgetMs: 240, randomness: 0 }, [])
  if (!res.move) return
  hintFrom.value = res.move.from
  hintTo.value = res.move.to
  liveEvalPawns.value = res.evaluation
}

function resignMatch() {
  if (!matchStarted.value || gameResult.value) return
  clearTimers()
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
  if (isVsEngine.value) showMatchReport.value = true
}

function agreeDraw() {
  if (!matchStarted.value || gameResult.value) return
  clearTimers()
  gameResult.value = {
    title: 'Remis atas Kesepakatan',
    subtitle: 'Kedua pemain sepakat mengakhiri pertandingan dengan hasil imbang.',
    winner: 'draw'
  }
  playSuccessChime(isMuted.value)
  if (isVsEngine.value) showMatchReport.value = true
}

function backToSetup() {
  clearTimers()
  matchStarted.value = false
  gameResult.value = null
  isBotThinking.value = false
  hintFrom.value = null
  hintTo.value = null
}

function switchGameMode(mode: GameMode) {
  if (gameMode.value === mode) return
  clearTimers()
  gameMode.value = mode
  matchStarted.value = false
  gameResult.value = null
}

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Header & Mode Switcher -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-xs font-medium text-[#5D7463] dark:text-[#A4BFA9] mb-2"
        >
          <Swords class="w-3.5 h-3.5" />
          <span>Arena Pertandingan</span>
        </div>
        <h1 class="font-serif text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Main vs Bot Komputer &amp; 2 Pemain
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Pilih lawan dari 5 tingkatan bot (250–2850 ELO), atur Mesin Kustom hingga 3200 ELO, atau main 2 orang di satu papan.
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
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="
            gameMode === 'bot'
              ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321]'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchGameMode('bot')"
        >
          <Bot class="w-4 h-4" />
          <span>Katalog Bot</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="gameMode === 'custom'"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="
            gameMode === 'custom'
              ? 'bg-[#B85D43] text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchGameMode('custom')"
        >
          <SlidersHorizontal class="w-4 h-4" />
          <span>Mesin Kustom</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="gameMode === 'pvp'"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="
            gameMode === 'pvp'
              ? 'bg-[#526857] text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          "
          @click="switchGameMode('pvp')"
        >
          <Users class="w-4 h-4" />
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
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ topPlayer.name }}
                </span>
                <span
                  class="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700"
                >
                  {{ topPlayer.badge }}
                </span>
                <span
                  v-if="topPlayer.isBot && isBotThinking"
                  class="text-[11px] text-[#5D7463] dark:text-[#9FC0A8] animate-pulse font-medium"
                >
                  Berpikir...
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
                  class="ml-2 font-mono text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
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
                : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
            "
          >
            {{ formatClock(topPlayer.timeLeft) }}
          </div>
        </div>

        <!-- Chessboard -->
        <ChessBoard
          :fen="displayedSnapshot.fen"
          :orientation="orientation"
          :interactive="canInteractBoard"
          :allowed-color="boardAllowedColor"
          :last-move="displayedSnapshot.lastMove"
          :hint-from="isInspectingHistory ? null : hintFrom"
          :hint-to="isInspectingHistory ? null : hintTo"
          @move="handleMove"
        />

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
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ bottomPlayer.name }}
                </span>
                <span
                  class="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700"
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
                  class="ml-2 font-mono text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
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
                : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
            "
          >
            {{ formatClock(bottomPlayer.timeLeft) }}
          </div>
        </div>

        <!-- History Inspection Banner -->
        <div
          v-if="isInspectingHistory"
          class="max-w-[560px] mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
        >
          <span class="text-amber-900 dark:text-amber-200 font-medium">
            Meninjau langkah ke-{{ displayedPly }} dari {{ latestPly }}.
          </span>
          <button
            type="button"
            class="px-3 py-1 rounded-lg font-semibold bg-amber-900 text-white dark:bg-amber-200 dark:text-amber-950 cursor-pointer"
            @click="viewingPly = null"
          >
            Kembali ke Posisi Aktif
          </button>
        </div>

        <!-- Match Action Bar (shown when match is active) -->
        <div
          v-if="matchStarted"
          class="max-w-[560px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 transition cursor-pointer"
            :disabled="!canUndo"
            @click="undoMove"
          >
            <Undo2 class="w-4 h-4" />
            <span>Mundur</span>
          </button>

          <button
            v-if="isVsEngine"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#B85D43] disabled:opacity-40 transition cursor-pointer"
            :disabled="!canInteractBoard"
            @click="requestHint"
          >
            <Lightbulb class="w-4 h-4 text-[#B85D43]" />
            <span>Petunjuk</span>
          </button>

          <button
            v-else
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 transition cursor-pointer"
            :disabled="Boolean(gameResult)"
            @click="agreeDraw"
          >
            <Handshake class="w-4 h-4" />
            <span>Sepakat Remis</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="orientation = orientation === 'w' ? 'b' : 'w'"
          >
            <FlipVertical2 class="w-4 h-4" />
            <span>Putar Papan</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-[#B85D43] hover:bg-[#FDF6F3] dark:hover:bg-[#2A1B16] disabled:opacity-40 transition cursor-pointer"
            :disabled="Boolean(gameResult)"
            @click="resignMatch"
          >
            <Flag class="w-4 h-4" />
            <span>Menyerah</span>
          </button>
        </div>
      </div>

      <!-- Right Sidebar: Setup Panel OR Live Match Panel -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Game Result Banner -->
        <div
          v-if="gameResult"
          class="rounded-2xl border p-5 space-y-3"
          :class="
            gameResult.winner === 'draw'
              ? 'bg-[#F8F7F4] dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
              : 'bg-[#F1F5F2] dark:bg-[#1B261E] border-[#B9CBBF] dark:border-[#3A5241]'
          "
        >
          <div class="flex items-start gap-3">
            <Trophy class="w-5 h-5 text-[#5D7463] dark:text-[#A3C4AB] mt-0.5 shrink-0" />
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
              v-if="isVsEngine"
              type="button"
              class="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#526857] text-white hover:bg-[#435648] transition cursor-pointer shadow-sm"
              @click="showMatchReport = true"
            >
              <BarChart3 class="w-4 h-4" />
              <span>Buka Laporan Analisis &amp; Kartu PNG</span>
            </button>
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:opacity-90 transition cursor-pointer"
              @click="startNewMatch"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Tanding Ulang</span>
            </button>
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-[#718675] transition cursor-pointer"
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
                class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition active:scale-[0.97] cursor-pointer"
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
                        class="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-[#E4DFD5] dark:border-zinc-700 shrink-0"
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
              <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <span>Kedalaman: {{ activeBot.depth }} ply</span>
                <span>·</span>
                <span>Agresivitas: {{ Math.round(activeBot.aggression * 100) }}%</span>
                <span>·</span>
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
                  <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#A4CBB3] block">
                    {{ activeBot.playstyle }}
                  </span>
                  <div class="font-serif text-3xl font-semibold tracking-tight tabular-nums mt-0.5">
                    {{ customElo }} <span class="font-mono text-sm font-normal text-zinc-400">ELO</span>
                  </div>
                </div>
                <span
                  class="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 text-zinc-200 border border-white/10"
                >
                  {{ activeBot.tier }}
                </span>
              </div>

              <!-- ELO Range Slider -->
              <div class="space-y-1.5">
                <input
                  v-model.number="customElo"
                  type="range"
                  min="250"
                  max="3200"
                  step="50"
                  aria-label="Atur rating ELO Mesin Kustom dari 250 hingga 3200"
                  class="w-full accent-[#B85D43] cursor-pointer"
                />
                <div class="flex items-center justify-between font-mono text-[10px] text-zinc-400">
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
                  class="py-1.5 rounded-lg font-mono text-xs font-semibold border transition active:scale-[0.97] cursor-pointer"
                  :class="
                    customElo === preset
                      ? 'bg-[#B85D43] text-white border-[#D9846A]'
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
                <span class="block font-mono text-[9px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Kedalaman
                </span>
                <span class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ activeBot.depth }} Ply
                </span>
              </div>
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-2.5">
                <span class="block font-mono text-[9px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Blunder Rate
                </span>
                <span class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ Math.round(activeBot.blunderRate * 100) }}%
                </span>
              </div>
              <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-800 p-2.5">
                <span class="block font-mono text-[9px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
                <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nama Pemain Putih
                </label>
                <input
                  v-model="pvpWhiteName"
                  type="text"
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#F8F7F4] dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#5D7463]/50"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nama Pemain Hitam
                </label>
                <input
                  v-model="pvpBlackName"
                  type="text"
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
                <span class="block text-[11px] text-zinc-500 dark:text-zinc-400">
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

          <!-- Side Preference (for both Katalog Bot & Mesin Kustom) -->
          <div v-if="isVsEngine" class="space-y-1.5">
            <label class="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Main Sebagai
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in [
                  { key: 'w', label: 'Putih' },
                  { key: 'random', label: 'Acak' },
                  { key: 'b', label: 'Hitam' }
                ]"
                :key="opt.key"
                type="button"
                class="py-2 rounded-xl text-xs font-semibold border transition active:scale-[0.98] cursor-pointer"
                :class="
                  playerSidePref === opt.key
                    ? 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321]'
                    : 'border-[#E4DFD5] dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-[#718675]'
                "
                @click="playerSidePref = opt.key as SidePreference"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Shared Time Control Selector -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 text-[#5D7463]" />
              <span>Kontrol Waktu</span>
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="tc in TIME_CONTROLS"
                :key="tc.id"
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer"
                :class="
                  selectedTimeControlId === tc.id
                    ? 'bg-[#5D7463] text-white border-[#5D7463]'
                    : 'bg-[#F8F7F4] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-[#738578]'
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
            class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#18181B] text-white dark:bg-[#EDEAE0] dark:text-[#18181B] hover:opacity-90 transition shadow-sm cursor-pointer"
            @click="startNewMatch"
          >
            <Play class="w-4 h-4" />
            <span>
              {{
                isVsEngine
                  ? `Mulai Lawan ${activeBot.name} (${activeBot.elo} ELO)`
                  : 'Mulai Pertandingan 2 Pemain'
              }}
            </span>
          </button>
        </div>

        <!-- LIVE MATCH CONTROLS & HISTORY (Shown while playing) -->
        <template v-else>
          <!-- Match Status & Optional Evaluation Meter -->
          <div
            class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-4 space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs">
                <span class="text-zinc-500 dark:text-zinc-400">Giliran Jalan: </span>
                <span class="font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ currentTurn === 'w' ? 'Putih' : 'Hitam' }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="isVsEngine"
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-[#738578] transition cursor-pointer"
                  @click="showEvalMeter = !showEvalMeter"
                >
                  <EyeOff v-if="showEvalMeter" class="w-3 h-3" />
                  <Eye v-else class="w-3 h-3" />
                  <span>{{ showEvalMeter ? 'Sembunyikan Eval' : 'Tampilkan Eval' }}</span>
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-[#738578] transition cursor-pointer"
                  @click="backToSetup"
                >
                  <span>Ganti Mode / Bot</span>
                </button>
              </div>
            </div>

            <div v-if="showEvalMeter && isVsEngine" class="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Cpu class="w-3.5 h-3.5 text-[#5D7463]" />
                  <span>Evaluasi Engine</span>
                </span>
                <span class="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
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
            empty-message="Pertandingan dimulai! Gerakkan bidak Putih pertama Anda di papan."
            @select-ply="viewingPly = $event"
          />

          <!-- Quick Restart button -->
          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="startNewMatch"
          >
            <RotateCcw class="w-3.5 h-3.5" />
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
