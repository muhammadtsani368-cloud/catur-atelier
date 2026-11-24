import { Chess, type Move, type PieceSymbol } from 'chess.js'

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 310,
  b: 330,
  r: 500,
  q: 920,
  k: 0
}

// Endgame-tailored piece-square tables (from White's perspective, index 0 = a8 ... 63 = h1)
const PAWN_ENDGAME_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  175, 180, 185, 190, 190, 185, 180, 175,
  95, 100, 105, 110, 110, 105, 100, 95,
  50, 52, 56, 62, 62, 56, 52, 50,
  24, 26, 28, 34, 34, 28, 26, 24,
  10, 10, 12, 16, 16, 12, 10, 10,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0
]

const KING_ENDGAME_PST = [
  -35, -20, -15, -10, -10, -15, -20, -35,
  -15, 0, 10, 15, 15, 10, 0, -15,
  -10, 12, 26, 34, 34, 26, 12, -10,
  -10, 14, 32, 42, 42, 32, 14, -10,
  -12, 12, 30, 40, 40, 30, 12, -12,
  -18, 4, 18, 24, 24, 18, 4, -18,
  -25, -10, 0, 5, 5, 0, -10, -25,
  -40, -25, -15, -10, -10, -15, -25, -40
]

const ROOK_ENDGAME_PST = [
  10, 12, 15, 18, 18, 15, 12, 10,
  18, 22, 24, 26, 26, 24, 22, 18,
  6, 8, 10, 12, 12, 10, 8, 6,
  4, 6, 8, 10, 10, 8, 6, 4,
  4, 6, 8, 10, 10, 8, 6, 4,
  2, 4, 6, 8, 8, 6, 4, 2,
  0, 2, 4, 6, 6, 4, 2, 0,
  0, 4, 6, 10, 10, 6, 4, 0
]

const MINOR_ENDGAME_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -10, 5, 12, 14, 14, 12, 5, -10,
  -10, 5, 14, 18, 18, 14, 5, -10,
  -10, 5, 14, 18, 18, 14, 5, -10,
  -10, 5, 12, 14, 14, 12, 5, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -20, -10, -10, -10, -10, -10, -10, -20
]

function pstScore(type: PieceSymbol, color: 'w' | 'b', row: number, col: number): number {
  const r = color === 'w' ? row : 7 - row
  const idx = r * 8 + col
  switch (type) {
    case 'p':
      return PAWN_ENDGAME_PST[idx] ?? 0
    case 'k':
      return KING_ENDGAME_PST[idx] ?? 0
    case 'r':
      return ROOK_ENDGAME_PST[idx] ?? 0
    case 'n':
    case 'b':
      return MINOR_ENDGAME_PST[idx] ?? 0
    case 'q':
      return Math.round((MINOR_ENDGAME_PST[idx] ?? 0) * 0.6)
  }
}

/**
 * Static evaluation from White's perspective in centipawns.
 * Positive = White advantage, Negative = Black advantage.
 */
export function evaluateEndgamePosition(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999
  }
  if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) {
    return 0
  }

  const board = game.board()
  let score = 0

  let wKing: { r: number; c: number } | null = null
  let bKing: { r: number; c: number } | null = null
  const wPawns: Array<{ r: number; c: number }> = []
  const bPawns: Array<{ r: number; c: number }> = []
  const wRooks: Array<{ r: number; c: number }> = []
  const bRooks: Array<{ r: number; c: number }> = []

  let wMaterial = 0
  let bMaterial = 0

  for (let r = 0; r < 8; r++) {
    const row = board[r]
    if (!row) continue
    for (let c = 0; c < 8; c++) {
      const piece = row[c]
      if (!piece) continue
      const val = PIECE_VALUES[piece.type] + pstScore(piece.type, piece.color, r, c)
      if (piece.color === 'w') {
        score += val
        wMaterial += PIECE_VALUES[piece.type]
        if (piece.type === 'k') wKing = { r, c }
        if (piece.type === 'p') wPawns.push({ r, c })
        if (piece.type === 'r') wRooks.push({ r, c })
      } else {
        score -= val
        bMaterial += PIECE_VALUES[piece.type]
        if (piece.type === 'k') bKing = { r, c }
        if (piece.type === 'p') bPawns.push({ r, c })
        if (piece.type === 'r') bRooks.push({ r, c })
      }
    }
  }

  // Passed pawn bonus + king proximity to passed pawns
  for (const wp of wPawns) {
    const isPassed = !bPawns.some((bp) => bp.r < wp.r && Math.abs(bp.c - wp.c) <= 1)
    if (isPassed) {
      const rankAdv = 7 - wp.r // 1..6
      score += rankAdv * rankAdv * 8
      if (wKing) {
        const wDist = Math.max(Math.abs(wKing.r - wp.r), Math.abs(wKing.c - wp.c))
        score += Math.max(0, 5 - wDist) * 12
        // Bonus if White king is ahead of or adjacent-front of the pawn
        if (wKing.r <= wp.r && Math.abs(wKing.c - wp.c) <= 1) {
          score += 28
        }
      }
      if (bKing) {
        const bDist = Math.max(Math.abs(bKing.r - wp.r), Math.abs(bKing.c - wp.c))
        score += bDist * 10
        // Black king directly blocking in front of pawn is strong defensively
        if (bKing.c === wp.c && bKing.r < wp.r && wp.r - bKing.r <= 2) {
          score -= 55
        }
      }
      // Rook behind passed pawn bonus
      for (const wr of wRooks) {
        if (wr.c === wp.c && wr.r > wp.r) score += 22
      }
      for (const br of bRooks) {
        if (br.c === wp.c && br.r > wp.r) score -= 22
      }
    }
  }

  for (const bp of bPawns) {
    const isPassed = !wPawns.some((wp) => wp.r > bp.r && Math.abs(wp.c - bp.c) <= 1)
    if (isPassed) {
      const rankAdv = bp.r // 1..6
      score -= rankAdv * rankAdv * 8
      if (bKing) {
        const bDist = Math.max(Math.abs(bKing.r - bp.r), Math.abs(bKing.c - bp.c))
        score -= Math.max(0, 5 - bDist) * 12
        if (bKing.r >= bp.r && Math.abs(bKing.c - bp.c) <= 1) {
          score -= 28
        }
      }
      if (wKing) {
        const wDist = Math.max(Math.abs(wKing.r - bp.r), Math.abs(wKing.c - bp.c))
        score -= wDist * 10
        if (wKing.c === bp.c && wKing.r > bp.r && wKing.r - bp.r <= 2) {
          score += 55
        }
      }
      for (const br of bRooks) {
        if (br.c === bp.c && br.r < bp.r) score -= 22
      }
      for (const wr of wRooks) {
        if (wr.c === bp.c && wr.r < bp.r) score += 22
      }
    }
  }

  // Direct opposition bonus in pure king & pawn endgames
  if (wKing && bKing && wRooks.length === 0 && bRooks.length === 0) {
    const sameFile = wKing.c === bKing.c
    const rankDiff = Math.abs(wKing.r - bKing.r)
    if (sameFile && rankDiff === 2) {
      // Side NOT to move holds the direct opposition
      score += game.turn() === 'w' ? -24 : 24
    }
  }

  // Mop-up evaluation when one side has decisive material advantage (e.g. Q+K vs K, R+K vs K)
  if (wKing && bKing) {
    const kingDist = Math.abs(wKing.r - bKing.r) + Math.abs(wKing.c - bKing.c)
    if (wMaterial >= bMaterial + 400) {
      const bCenterDist = Math.max(3 - bKing.r, bKing.r - 4) + Math.max(3 - bKing.c, bKing.c - 4)
      score += bCenterDist * 16 + (14 - kingDist) * 8
    } else if (bMaterial >= wMaterial + 400) {
      const wCenterDist = Math.max(3 - wKing.r, wKing.r - 4) + Math.max(3 - wKing.c, wKing.c - 4)
      score -= wCenterDist * 16 + (14 - kingDist) * 8
    }
  }

  return score
}

function scoreMoveForOrdering(move: Move): number {
  let s = 0
  if (move.promotion) s += 900 + PIECE_VALUES[move.promotion]
  if (move.captured) s += 300 + PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece]
  if (move.san.includes('+')) s += 80
  return s
}

interface SearchControl {
  deadline: number
  aborted: boolean
  nodes: number
}

function alphaBeta(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizingWhite: boolean,
  ctrl: SearchControl
): number {
  ctrl.nodes += 1
  if ((ctrl.nodes & 255) === 0 && Date.now() >= ctrl.deadline) {
    ctrl.aborted = true
    return 0
  }

  if (game.isCheckmate()) {
    // Prefer faster checkmates
    return game.turn() === 'w' ? -90000 - depth * 100 : 90000 + depth * 100
  }
  if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) {
    return 0
  }
  if (depth === 0) {
    return evaluateEndgamePosition(game)
  }

  const moves = game.moves({ verbose: true })
  moves.sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a))

  if (maximizingWhite) {
    let best = -Infinity
    for (const move of moves) {
      game.move(move)
      const val = alphaBeta(game, depth - 1, alpha, beta, false, ctrl)
      game.undo()
      if (ctrl.aborted) return 0
      if (val > best) best = val
      if (best > alpha) alpha = best
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const move of moves) {
      game.move(move)
      const val = alphaBeta(game, depth - 1, alpha, beta, true, ctrl)
      game.undo()
      if (ctrl.aborted) return 0
      if (val < best) best = val
      if (best < beta) beta = best
      if (beta <= alpha) break
    }
    return best
  }
}

export interface EngineMoveResult {
  move: Move | null
  evaluation: number // in pawns, positive = White advantage
  depth: number
}

/**
 * Computes the best legal move for the current turn using iterative deepening
 * alpha-beta pruning (depth 3-4) bounded by a crisp time budget (~240ms)
 * so the browser UI remains silky smooth.
 */
export function computeBestEndgameMove(
  fen: string,
  maxDepth = 4,
  timeBudgetMs = 240
): EngineMoveResult {
  const game = new Chess(fen)
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) {
    return {
      move: null,
      evaluation: evaluateEndgamePosition(game) / 100,
      depth: 0
    }
  }

  moves.sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a))
  const isWhiteTurn = game.turn() === 'w'

  let overallBestMove: Move = moves[0]!
  let overallBestVal = 0
  let completedDepth = 0
  const deadline = Date.now() + timeBudgetMs

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Allow depth 1..3 to always finish fast; respect time budget strictly on deeper plies
    const ctrl: SearchControl = {
      deadline: depth <= 2 ? Number.MAX_SAFE_INTEGER : deadline,
      aborted: false,
      nodes: 0
    }

    // Put previous iteration's best move first for optimal alpha-beta cutoffs
    if (completedDepth > 0) {
      const idx = moves.findIndex((m) => m.lan === overallBestMove.lan)
      if (idx > 0) {
        const [pv] = moves.splice(idx, 1)
        if (pv) moves.unshift(pv)
      }
    }

    let iterBestMove: Move = moves[0]!
    let iterBestVal = isWhiteTurn ? -Infinity : Infinity
    let alpha = -Infinity
    let beta = Infinity

    for (const move of moves) {
      game.move(move)
      const val = alphaBeta(game, depth - 1, alpha, beta, !isWhiteTurn, ctrl)
      game.undo()

      if (ctrl.aborted) break

      if (isWhiteTurn) {
        if (val > iterBestVal) {
          iterBestVal = val
          iterBestMove = move
        }
        if (iterBestVal > alpha) alpha = iterBestVal
      } else {
        if (val < iterBestVal) {
          iterBestVal = val
          iterBestMove = move
        }
        if (iterBestVal < beta) beta = iterBestVal
      }
    }

    if (ctrl.aborted) break

    overallBestMove = iterBestMove
    overallBestVal = iterBestVal
    completedDepth = depth

    if (Math.abs(overallBestVal) >= 85000 || Date.now() >= deadline) {
      break
    }
  }

  return {
    move: overallBestMove,
    evaluation: Math.round((overallBestVal / 100) * 10) / 10,
    depth: completedDepth
  }
}

export function formatEvalLabel(evalPawns: number): string {
  if (Math.abs(evalPawns) >= 800) {
    return evalPawns > 0 ? 'Skakmat Putih' : 'Skakmat Hitam'
  }
  if (Math.abs(evalPawns) < 0.35) {
    return 'Seimbang (0.0)'
  }
  const sign = evalPawns > 0 ? '+' : ''
  const sideText = evalPawns > 0 ? 'Putih Unggul' : 'Hitam Unggul'
  return `${sideText} (${sign}${evalPawns.toFixed(1)})`
}
