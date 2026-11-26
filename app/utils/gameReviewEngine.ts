import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js'
import { buildCustomEngineBot } from '~/utils/botCatalog'
import { computeBotMove, evaluateBoard } from '~/utils/chessBotEngine'

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'

export interface ClassificationMeta {
  key: MoveClassification
  labelId: string
  symbol: string
  color: string
  textColor: string
  lightTextColor: string
  order: number
}

export const MOVE_CLASSIFICATIONS: readonly ClassificationMeta[] = [
  { key: 'brilliant', labelId: 'Brilian', symbol: '!!', color: '#2B312D', textColor: '#D6E8DC', lightTextColor: '#2B312D', order: 0 },
  { key: 'great', labelId: 'Bagus', symbol: '!', color: '#35503E', textColor: '#B8D7C1', lightTextColor: '#35503E', order: 1 },
  { key: 'book', labelId: 'Buku', symbol: 'B', color: '#6E5228', textColor: '#DFC496', lightTextColor: '#6E5228', order: 2 },
  { key: 'best', labelId: 'Terbaik', symbol: '**', color: '#3A5240', textColor: '#A9CBB2', lightTextColor: '#3A5240', order: 3 },
  { key: 'excellent', labelId: 'Sangat Baik', symbol: '+', color: '#465B4C', textColor: '#BDD6C3', lightTextColor: '#465B4C', order: 4 },
  { key: 'good', labelId: 'Baik', symbol: 'v', color: '#4E6353', textColor: '#CBE0D0', lightTextColor: '#4E6353', order: 5 },
  { key: 'inaccuracy', labelId: 'Tidak Akurat', symbol: '?!', color: '#7A561D', textColor: '#EBC57C', lightTextColor: '#7A561D', order: 6 },
  { key: 'mistake', labelId: 'Kesalahan', symbol: '?', color: '#944D24', textColor: '#F2B68A', lightTextColor: '#944D24', order: 7 },
  { key: 'miss', labelId: 'Terlewat', symbol: 'x', color: '#9B452C', textColor: '#F2A68E', lightTextColor: '#9B452C', order: 8 },
  { key: 'blunder', labelId: 'Blunder', symbol: '??', color: '#8C3325', textColor: '#F59886', lightTextColor: '#8C3325', order: 9 }
] as const

export const CLASSIFICATION_MAP: Record<MoveClassification, ClassificationMeta> =
  Object.fromEntries(MOVE_CLASSIFICATIONS.map((m) => [m.key, m])) as Record<
    MoveClassification,
    ClassificationMeta
  >

export interface ReviewSnapshotInput {
  fen: string
  lastMove: { from: string; to: string } | null
  san: string
  color: Color
  moveNumber: number
}

export interface AnalyzedMove {
  ply: number
  moveNumber: number
  color: Color
  san: string
  from: string
  to: string
  beforeFen: string
  afterFen: string
  evalBefore: number // pawns from White's perspective (-10..+10)
  evalAfter: number // pawns from White's perspective (-10..+10)
  bestMoveSan: string
  bestMoveFrom: string
  bestMoveTo: string
  cpLoss: number
  winPctLoss: number
  classification: MoveClassification
  isCapture: boolean
  isCheck: boolean
  isMate: boolean
  phase: 'opening' | 'middlegame' | 'endgame'
  commentId: string
}

export type PhaseGradeKey = 'opening' | 'tactics' | 'strategy' | 'endgame'

export interface PhaseGradeRow {
  key: PhaseGradeKey
  labelId: string
  whiteGrade: MoveClassification | null
  blackGrade: MoveClassification | null
}

export interface GameReviewReport {
  moves: AnalyzedMove[]
  evalCurve: Array<{ ply: number; score: number; classification: MoveClassification | null; color: Color }>
  whiteAccuracy: number
  blackAccuracy: number
  whiteCounts: Record<MoveClassification, number>
  blackCounts: Record<MoveClassification, number>
  whiteGameRating: number
  blackGameRating: number
  skillLeader: Color | 'equal'
  skillDelta: number
  phaseGrades: PhaseGradeRow[]
  coachHeadline: string
  coachSummary: string
}

const PIECE_MAT: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
}

// Common theory prefixes (SAN) to classify early sound moves as "Buku"
const BOOK_SEQUENCES = new Set<string>([
  'e4', 'd4', 'Nf3', 'c4', 'g3',
  'e4 e5', 'e4 c5', 'e4 e6', 'e4 c6', 'e4 d5', 'e4 d6', 'e4 Nf6', 'e4 g6',
  'd4 d5', 'd4 Nf6', 'd4 e6', 'd4 f5', 'd4 c5', 'd4 g6',
  'Nf3 d5', 'Nf3 Nf6', 'Nf3 c5', 'c4 e5', 'c4 c5', 'c4 Nf6',
  'e4 e5 Nf3', 'e4 e5 Nc3', 'e4 e5 Bc4', 'e4 e5 f4',
  'e4 e5 Nf3 Nc6', 'e4 e5 Nf3 Nf6', 'e4 e5 Nf3 d6',
  'e4 e5 Nf3 Nc6 Bb5', 'e4 e5 Nf3 Nc6 Bc4', 'e4 e5 Nf3 Nc6 d4', 'e4 e5 Nf3 Nc6 Nc3',
  'e4 e5 Nf3 Nc6 Bb5 a6', 'e4 e5 Nf3 Nc6 Bb5 Nf6',
  'e4 e5 Nf3 Nc6 Bc4 Bc5', 'e4 e5 Nf3 Nc6 Bc4 Nf6',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3', 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O',
  'e4 e5 Nf3 Nc6 d4 exd4', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4',
  'e4 c5 Nf3', 'e4 c5 Nc3', 'e4 c5 c3', 'e4 c5 d4',
  'e4 c5 Nf3 d6', 'e4 c5 Nf3 Nc6', 'e4 c5 Nf3 e6',
  'e4 c5 Nf3 d6 d4', 'e4 c5 Nf3 d6 d4 cxd4', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4',
  'e4 c5 Nf3 Nc6 d4', 'e4 c5 Nf3 Nc6 d4 cxd4', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4',
  'e4 e6 d4', 'e4 e6 d4 d5', 'e4 e6 d4 d5 Nc3', 'e4 e6 d4 d5 Nd2', 'e4 e6 d4 d5 e5', 'e4 e6 d4 d5 exd5',
  'e4 c6 d4', 'e4 c6 d4 d5', 'e4 c6 d4 d5 Nc3', 'e4 c6 d4 d5 e5', 'e4 c6 d4 d5 exd5',
  'd4 d5 c4', 'd4 d5 Nf3', 'd4 d5 Bf4',
  'd4 d5 c4 e6', 'd4 d5 c4 c6', 'd4 d5 c4 dxc4',
  'd4 d5 c4 e6 Nc3', 'd4 d5 c4 e6 Nc3 Nf6', 'd4 d5 c4 c6 Nf3', 'd4 d5 c4 c6 Nc3',
  'd4 d5 Bf4 Nf6', 'd4 d5 Bf4 e6', 'd4 d5 Bf4 c5',
  'd4 Nf6 c4', 'd4 Nf6 Nf3', 'd4 Nf6 Bf4',
  'd4 Nf6 c4 g6', 'd4 Nf6 c4 e6', 'd4 Nf6 c4 c5',
  'd4 Nf6 c4 g6 Nc3', 'd4 Nf6 c4 g6 Nc3 Bg7', 'd4 Nf6 c4 g6 Nc3 Bg7 e4', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6',
  'd4 Nf6 c4 e6 Nc3', 'd4 Nf6 c4 e6 Nc3 Bb4', 'd4 Nf6 c4 e6 Nf3'
])

function createEmptyCounts(): Record<MoveClassification, number> {
  return {
    brilliant: 0,
    great: 0,
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0
  }
}

function cpToWinPct(cp: number): number {
  const clamped = Math.max(-1200, Math.min(1200, cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1)
}

function clampPawns(cp: number): number {
  const pawns = Math.round((cp / 100) * 10) / 10
  return Math.max(-10, Math.min(10, pawns))
}

function countNonKingMaterial(game: Chess): number {
  let total = 0
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.type === 'k') continue
      total += PIECE_MAT[cell.type]
    }
  }
  return total
}

function detectPhase(ply: number, game: Chess): 'opening' | 'middlegame' | 'endgame' {
  const mat = countNonKingMaterial(game)
  if (mat <= 24) return 'endgame'
  if (ply <= 14) return 'opening'
  return 'middlegame'
}

/**
 * Fast 1-ply + capture reply evaluation from White's perspective (centipawns).
 * Detects immediate hanging pieces / mate-in-1 cheaply without freezing UI.
 */
function quickTacticalEvalWhiteCp(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -1500 : 1500
  }
  if (game.isDraw()) return 0

  const sideToMove = game.turn()
  const baseEval = evaluateBoard(game, 0.5, true)
  const legal = game.moves({ verbose: true })
  if (legal.length === 0) return baseEval

  // Inspect forcing responses (captures, promotions, checks) to catch immediate hanging pieces
  const forcing = legal.filter((m) => m.captured || m.promotion || m.san.includes('+')).slice(0, 10)
  if (forcing.length === 0) return baseEval

  let bestResponseWhite = baseEval
  for (const mv of forcing) {
    game.move(mv)
    let score: number
    if (game.isCheckmate()) {
      score = game.turn() === 'w' ? -1500 : 1500
    } else if (game.isDraw()) {
      score = 0
    } else {
      // Check simple recapture on the destination square
      const staticAfter = evaluateBoard(game, 0.5, true)
      const recaptures = game
        .moves({ verbose: true })
        .filter((r) => r.to === mv.to && r.captured)
        .slice(0, 3)
      if (recaptures.length > 0) {
        let bestRecap = staticAfter
        const recapTurn = game.turn()
        for (const rc of recaptures) {
          game.move(rc)
          const rcScore = game.isCheckmate()
            ? game.turn() === 'w'
              ? -1500
              : 1500
            : evaluateBoard(game, 0.5, true)
          game.undo()
          if (recapTurn === 'w' ? rcScore > bestRecap : rcScore < bestRecap) {
            bestRecap = rcScore
          }
        }
        score = bestRecap
      } else {
        score = staticAfter
      }
    }
    game.undo()

    if (sideToMove === 'w' ? score > bestResponseWhite : score < bestResponseWhite) {
      bestResponseWhite = score
    }
  }

  return bestResponseWhite
}

function getEngineBestForPosition(
  fen: string
): { bestMove: Move | null; bestEvalWhiteCp: number; secondBestEvalWhiteCp: number } {
  const g = new Chess(fen)
  const mover = g.turn()
  const legal = g.moves({ verbose: true })
  if (legal.length === 0) {
    return { bestMove: null, bestEvalWhiteCp: quickTacticalEvalWhiteCp(g), secondBestEvalWhiteCp: 0 }
  }

  // Use our calibrated engine with tight 22ms budget to get strong top move
  const analysisProfile = {
    ...buildCustomEngineBot(2000),
    depth: 2,
    timeBudgetMs: 22,
    randomness: 0,
    blunderRate: 0,
    useBook: false
  }
  const engineRes = computeBotMove(fen, analysisProfile, [])

  // Score all legal moves quickly to establish second-best gap & verify consistency
  let bestMv: Move = engineRes.move ?? legal[0]!
  let bestScoreForMover = -Infinity
  let secondScoreForMover = -Infinity
  let bestWhiteCp = 0

  // Evaluate engine move + top candidate moves
  const candidates = legal.slice(0, 36)
  if (engineRes.move && !candidates.some((c) => c.san === engineRes.move!.san)) {
    candidates.unshift(engineRes.move)
  }

  for (const mv of candidates) {
    g.move(mv)
    const whiteCp = quickTacticalEvalWhiteCp(g)
    g.undo()

    const moverCp = mover === 'w' ? whiteCp : -whiteCp
    if (moverCp > bestScoreForMover) {
      secondScoreForMover = bestScoreForMover
      bestScoreForMover = moverCp
      bestMv = mv
      bestWhiteCp = whiteCp
    } else if (moverCp > secondScoreForMover) {
      secondScoreForMover = moverCp
    }
  }

  // Prefer engineRes.move if within 15cp of quick tactical best (engine sees deeper positional lines)
  if (engineRes.move) {
    g.move(engineRes.move)
    const engWhiteCp = quickTacticalEvalWhiteCp(g)
    g.undo()
    const engMoverCp = mover === 'w' ? engWhiteCp : -engWhiteCp
    if (engMoverCp >= bestScoreForMover - 18) {
      bestMv = engineRes.move
      bestWhiteCp = engWhiteCp
      bestScoreForMover = engMoverCp
    }
  }

  const secondWhiteCp =
    secondScoreForMover === -Infinity
      ? bestWhiteCp
      : mover === 'w'
        ? secondScoreForMover
        : -secondScoreForMover

  return {
    bestMove: bestMv,
    bestEvalWhiteCp: bestWhiteCp,
    secondBestEvalWhiteCp: secondWhiteCp
  }
}

function buildMoveCommentId(
  cls: MoveClassification,
  san: string,
  color: Color,
  bestSan: string,
  evalAfter: number,
  isCapture: boolean,
  isMate: boolean
): string {
  const actor = color === 'w' ? 'Putih' : 'Hitam'
  const evalText = isMate
    ? 'Skakmat!'
    : `${evalAfter >= 0 ? '+' : ''}${evalAfter.toFixed(1)}`

  switch (cls) {
    case 'brilliant':
      return `Langkah brilian ${san}!! Pengorbanan atau taktik tajam dari ${actor} yang langsung menekan lawan (${evalText}).`
    case 'great':
      return `Langkah krusial ${san}! Satu-satunya pilihan terbaik ${actor} untuk mempertahankan kendali penuh (${evalText}).`
    case 'book':
      return `${san} merupakan langkah teori buku pembukaan yang solid dan teruji untuk ${actor}.`
    case 'best':
      return isMate
        ? `Skakmat presisi dengan ${san}! ${actor} menutup partai dengan langkah paling akurat.`
        : isCapture
          ? `Tepat sekali! ${san} mengambil materi dengan kalkulasi terbaik (${evalText}).`
          : `${san} adalah pilihan terkuat engine bagi ${actor} pada posisi ini (${evalText}).`
    case 'excellent':
      return `Langkah sangat baik (${san}). ${actor} menjaga koordinasi bidak tetap kokoh (${evalText}).`
    case 'good':
      return `Langkah baik (${san}) yang solid, meski ${bestSan} sedikit lebih akurat untuk ${actor}.`
    case 'inaccuracy':
      return `Kurang akurat (${san}?!). ${actor} kehilangan sedikit inisiatif; ${bestSan} lebih direkomendasikan.`
    case 'mistake':
      return `Kesalahan (${san}?). ${actor} memberi peluang balik ke lawan, pertimbangkan ${bestSan} sebagai alternatif terbaik.`
    case 'miss':
      return `Peluang terlewat (${san})! ${actor} sebenarnya punya lanjutan jauh lebih kuat dengan ${bestSan}.`
    case 'blunder':
      return `Blunder berat (${san}??)! Langkah ini mengubah evaluasi secara drastis; ${bestSan} seharusnya dimainkan oleh ${actor}.`
  }
}

function computeAccuracyFromMoves(moves: AnalyzedMove[]): number {
  if (moves.length === 0) return 0
  let scoreSum = 0
  for (const m of moves) {
    // Chess.com-style per-move accuracy curve derived from win% loss
    const moveAcc =
      m.classification === 'book' || m.classification === 'best' || m.classification === 'brilliant' || m.classification === 'great'
        ? 100
        : Math.max(5, Math.min(100, 103.1668 * Math.exp(-0.04354 * m.winPctLoss) - 3.1669))
    scoreSum += moveAcc
  }
  return Math.round((scoreSum / moves.length) * 10) / 10
}

function estimateGameRating(
  accuracy: number,
  counts: Record<MoveClassification, number>,
  totalMoves: number,
  referenceOpponentElo: number
): number {
  if (totalMoves === 0) return 400
  const baseFromAcc = 100 + Math.pow(Math.max(0, accuracy) / 100, 1.55) * 2350
  const blunderRatio = (counts.blunder + counts.miss * 0.6) / Math.max(1, totalMoves)
  const brilliantBonus = counts.brilliant * 65 + counts.great * 35
  const opponentPull = referenceOpponentElo > 0 ? (referenceOpponentElo - baseFromAcc) * 0.18 : 0
  const raw = baseFromAcc + opponentPull + brilliantBonus - blunderRatio * 680
  const clamped = Math.max(100, Math.min(2800, raw))
  return Math.round(clamped / 50) * 50
}

function scoreMovesToGrade(moves: AnalyzedMove[]): MoveClassification | null {
  if (moves.length === 0) return null
  const avgWinLoss = moves.reduce((acc, m) => acc + m.winPctLoss, 0) / moves.length
  const hasBlunder = moves.some((m) => m.classification === 'blunder')
  const hasBrilliantOrGreat = moves.some(
    (m) => m.classification === 'brilliant' || m.classification === 'great'
  )

  if (avgWinLoss <= 2.2 && !hasBlunder) return hasBrilliantOrGreat ? 'great' : 'best'
  if (avgWinLoss <= 4.5 && !hasBlunder) return 'excellent'
  if (avgWinLoss <= 8.5) return 'good'
  if (avgWinLoss <= 13.5) return 'inaccuracy'
  if (avgWinLoss <= 21) return 'mistake'
  return 'blunder'
}

export async function analyzeCompletedMatch(
  snapshots: ReviewSnapshotInput[],
  options: {
    whiteName: string
    blackName: string
    referenceOpponentElo?: number
    humanSide?: Color
    onProgress?: (percent: number) => void
  }
): Promise<GameReviewReport> {
  const totalPlies = Math.max(0, snapshots.length - 1)
  const analyzed: AnalyzedMove[] = []
  const evalCurve: GameReviewReport['evalCurve'] = [
    { ply: 0, score: 0, classification: null, color: 'w' }
  ]

  const whiteCounts = createEmptyCounts()
  const blackCounts = createEmptyCounts()
  const sanPrefix: string[] = []

  for (let i = 1; i <= totalPlies; i++) {
    const prev = snapshots[i - 1]!
    const curr = snapshots[i]!
    const mover = curr.color

    const beforeGame = new Chess(prev.fen)
    const afterGame = new Chess(curr.fen)

    const { bestMove, bestEvalWhiteCp, secondBestEvalWhiteCp } = getEngineBestForPosition(prev.fen)
    const playedEvalWhiteCp = quickTacticalEvalWhiteCp(afterGame)

    const bestForMoverCp = mover === 'w' ? bestEvalWhiteCp : -bestEvalWhiteCp
    const secondForMoverCp = mover === 'w' ? secondBestEvalWhiteCp : -secondBestEvalWhiteCp
    const playedForMoverCp = mover === 'w' ? playedEvalWhiteCp : -playedEvalWhiteCp

    const evalBeforeWhiteCp =
      i === 1 ? 20 : Math.round((evalCurve[i - 1]?.score ?? 0) * 100)

    const cpLoss = Math.max(0, Math.round(bestForMoverCp - playedForMoverCp))
    const winBest = cpToWinPct(bestForMoverCp)
    const winPlayed = cpToWinPct(playedForMoverCp)
    const winPctLoss = Math.max(0, Math.round((winBest - winPlayed) * 10) / 10)

    // Inspect move flags from chess.js
    const playedVerbose = beforeGame
      .moves({ verbose: true })
      .find((m) => m.san === curr.san || (curr.lastMove && m.from === curr.lastMove.from && m.to === curr.lastMove.to))
    const isCapture = Boolean(playedVerbose?.captured)
    const isCheck = curr.san.includes('+') || curr.san.includes('#')
    const isMate = curr.san.includes('#')

    sanPrefix.push(curr.san)
    const prefixStr = sanPrefix.join(' ')
    const isBook = i <= 10 && BOOK_SEQUENCES.has(prefixStr) && cpLoss <= 55

    // Detect tactical sacrifice (non-pawn piece placed on square attacked by enemy while keeping advantage)
    const movedPieceType = playedVerbose?.piece ?? 'p'
    const enemyColor: Color = mover === 'w' ? 'b' : 'w'
    const isRiskyLanding =
      curr.lastMove &&
      movedPieceType !== 'p' &&
      movedPieceType !== 'k' &&
      afterGame.attackers(curr.lastMove.to as Parameters<Chess['attackers']>[0], enemyColor).length > 0 &&
      !isCapture

    const onlyGoodMoveGap = bestForMoverCp - secondForMoverCp
    const isExactBest = bestMove?.san === curr.san || isMate

    let classification: MoveClassification
    if (isBook) {
      classification = 'book'
    } else if (
      (isExactBest || cpLoss <= 18) &&
      isRiskyLanding &&
      playedForMoverCp >= 120 &&
      onlyGoodMoveGap >= 90
    ) {
      classification = 'brilliant'
    } else if ((isExactBest || cpLoss <= 15) && onlyGoodMoveGap >= 145 && playedForMoverCp >= -40) {
      classification = 'great'
    } else if (isExactBest || cpLoss <= 14) {
      classification = 'best'
    } else if (winPctLoss <= 3.5 && cpLoss <= 50) {
      classification = 'excellent'
    } else if (winPctLoss <= 7.5 && cpLoss <= 110) {
      classification = 'good'
    } else if (winPctLoss <= 13.5 && cpLoss <= 210) {
      classification = 'inaccuracy'
    } else if (
      bestForMoverCp >= 220 &&
      playedForMoverCp >= -50 &&
      cpLoss >= 185 &&
      winPctLoss <= 28
    ) {
      classification = 'miss'
    } else if (winPctLoss <= 23 && cpLoss <= 360) {
      classification = 'mistake'
    } else {
      classification = 'blunder'
    }

    if (mover === 'w') whiteCounts[classification] += 1
    else blackCounts[classification] += 1

    const evalBeforePawns = clampPawns(evalBeforeWhiteCp)
    const evalAfterPawns = clampPawns(playedEvalWhiteCp)
    const bestSan = bestMove?.san ?? curr.san
    const bestFrom = bestMove?.from ?? curr.lastMove?.from ?? ''
    const bestTo = bestMove?.to ?? curr.lastMove?.to ?? ''
    const phase = detectPhase(i, afterGame)

    analyzed.push({
      ply: i,
      moveNumber: curr.moveNumber,
      color: mover,
      san: curr.san,
      from: curr.lastMove?.from ?? '',
      to: curr.lastMove?.to ?? '',
      beforeFen: prev.fen,
      afterFen: curr.fen,
      evalBefore: evalBeforePawns,
      evalAfter: evalAfterPawns,
      bestMoveSan: bestSan,
      bestMoveFrom: bestFrom,
      bestMoveTo: bestTo,
      cpLoss,
      winPctLoss,
      classification,
      isCapture,
      isCheck,
      isMate,
      phase,
      commentId: buildMoveCommentId(
        classification,
        curr.san,
        mover,
        bestSan,
        evalAfterPawns,
        isCapture,
        isMate
      )
    })

    evalCurve.push({
      ply: i,
      score: evalAfterPawns,
      classification,
      color: mover
    })

    // Yield to browser every 2 plies so UI stays buttery smooth
    if (i % 2 === 0 || i === totalPlies) {
      options.onProgress?.(Math.round((i / Math.max(1, totalPlies)) * 100))
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  const whiteMoves = analyzed.filter((m) => m.color === 'w')
  const blackMoves = analyzed.filter((m) => m.color === 'b')

  const whiteAccuracy = computeAccuracyFromMoves(whiteMoves)
  const blackAccuracy = computeAccuracyFromMoves(blackMoves)

  const refElo = options.referenceOpponentElo ?? 1100
  const whiteGameRating = estimateGameRating(whiteAccuracy, whiteCounts, whiteMoves.length, refElo)
  const blackGameRating = estimateGameRating(blackAccuracy, blackCounts, blackMoves.length, refElo)

  // Skill delta (quality moves minus errors)
  const qualityScore = (c: Record<MoveClassification, number>) =>
    c.brilliant * 4 + c.great * 3 + c.best * 2 + c.excellent - c.inaccuracy - c.mistake * 2 - c.miss * 2 - c.blunder * 3
  const wSkill = qualityScore(whiteCounts)
  const bSkill = qualityScore(blackCounts)
  const skillDiff = Math.abs(wSkill - bSkill)
  const skillLeader: Color | 'equal' =
    wSkill > bSkill ? 'w' : bSkill > wSkill ? 'b' : 'equal'

  // 4 Phase Grades (Pembukaan, Taktik, Strategi, Permainan Akhir)
  const whiteOpening = whiteMoves.filter((m) => m.phase === 'opening')
  const blackOpening = blackMoves.filter((m) => m.phase === 'opening')
  const whiteTactics = whiteMoves.filter((m) => m.isCapture || m.isCheck || m.cpLoss >= 180)
  const blackTactics = blackMoves.filter((m) => m.isCapture || m.isCheck || m.cpLoss >= 180)
  const whiteStrategy = whiteMoves.filter((m) => m.phase === 'middlegame' && !m.isCapture)
  const blackStrategy = blackMoves.filter((m) => m.phase === 'middlegame' && !m.isCapture)
  const whiteEndgame = whiteMoves.filter((m) => m.phase === 'endgame')
  const blackEndgame = blackMoves.filter((m) => m.phase === 'endgame')

  const phaseGrades: PhaseGradeRow[] = [
    {
      key: 'opening',
      labelId: 'Pembukaan',
      whiteGrade: scoreMovesToGrade(whiteOpening),
      blackGrade: scoreMovesToGrade(blackOpening)
    },
    {
      key: 'tactics',
      labelId: 'Taktik',
      whiteGrade: scoreMovesToGrade(whiteTactics.length > 0 ? whiteTactics : whiteMoves),
      blackGrade: scoreMovesToGrade(blackTactics.length > 0 ? blackTactics : blackMoves)
    },
    {
      key: 'strategy',
      labelId: 'Strategi',
      whiteGrade: scoreMovesToGrade(whiteStrategy.length > 0 ? whiteStrategy : whiteMoves),
      blackGrade: scoreMovesToGrade(blackStrategy.length > 0 ? blackStrategy : blackMoves)
    },
    {
      key: 'endgame',
      labelId: 'Permainan Akhir',
      whiteGrade: scoreMovesToGrade(whiteEndgame),
      blackGrade: scoreMovesToGrade(blackEndgame)
    }
  ]

  // Dynamic Coach Summary in Bahasa Indonesia
  const focusSide = options.humanSide ?? (whiteAccuracy >= blackAccuracy ? 'w' : 'b')
  const focusAcc = focusSide === 'w' ? whiteAccuracy : blackAccuracy
  const focusName = focusSide === 'w' ? options.whiteName : options.blackName
  const focusCounts = focusSide === 'w' ? whiteCounts : blackCounts

  let coachHeadline = 'Ulasan Siap Ditinjau'
  let coachSummary = ''
  if (totalPlies === 0) {
    coachSummary = 'Belum ada langkah yang dimainkan pada partai ini.'
  } else if (focusAcc >= 82 && focusCounts.blunder === 0) {
    coachHeadline = 'Permainan Sangat Tajam!'
    coachSummary = `Luar biasa, ${focusName}! Akurasi ${focusAcc.toFixed(1)}% tanpa satu pun blunder. Klik langkah mana saja untuk meninjau detail posisi Anda maupun lawan.`
  } else if (focusCounts.brilliant > 0 || focusCounts.great > 0) {
    coachHeadline = 'Insting Taktik Mengesankan!'
    coachSummary = `Anda menemukan momen krusial dengan akurasi ${focusAcc.toFixed(1)}%! Gunakan tombol panah atau klik titik di grafik untuk memeriksa gerakan Anda dan lawan.`
  } else if (focusCounts.blunder > 0 || focusCounts.miss > 0) {
    coachHeadline = 'Pelajaran Berharga Ditemukan'
    coachSummary = `Tercatat ${focusCounts.blunder} blunder dan ${focusCounts.miss} peluang terlewat di sisi ${focusName}. Klik titik merah di grafik untuk melihat langkah terbaik versi engine!`
  } else {
    coachHeadline = 'Pertandingan Solid'
    coachSummary = `${focusName} bermain cukup konsisten dengan akurasi ${focusAcc.toFixed(1)}%. Tinjau perbandingan langkah Putih dan Hitam di bawah untuk melihat momen penentu.`
  }

  return {
    moves: analyzed,
    evalCurve,
    whiteAccuracy,
    blackAccuracy,
    whiteCounts,
    blackCounts,
    whiteGameRating,
    blackGameRating,
    skillLeader,
    skillDelta: Math.min(99, Math.max(1, skillDiff)),
    phaseGrades,
    coachHeadline,
    coachSummary
  }
}
