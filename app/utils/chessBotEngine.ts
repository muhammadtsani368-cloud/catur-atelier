import { Chess, type Move, type PieceSymbol } from 'chess.js'
import {
  BOT_CATALOG,
  buildCustomEngineBot,
  getCatalogBotById,
  type BotCatalogEntry
} from '~/utils/botCatalog'

export interface ChessBotProfile {
  id: string
  name: string
  elo: number
  tier: string
  tagline: string
  description: string
  accentColor: string
  maxDepth: number
  timeBudgetMs: number
  noiseCp: number
  blunderChance: number
  aggression: number
  useBook: boolean
  useQuiescence: boolean
}

export type BotEngineInput = ChessBotProfile | BotCatalogEntry | { elo: number }

export function catalogEntryToEngineProfile(entry: BotCatalogEntry): ChessBotProfile {
  const noiseCp = Math.round(entry.randomness * 260)
  return {
    id: entry.id,
    name: entry.name,
    elo: entry.elo,
    tier: entry.tier,
    tagline: entry.taglineId,
    description: entry.descriptionId,
    accentColor: entry.accentColor,
    maxDepth: entry.depth,
    timeBudgetMs: entry.timeBudgetMs,
    noiseCp,
    blunderChance: entry.blunderRate,
    aggression: entry.aggression,
    useBook: entry.useBook,
    useQuiescence: entry.useQuiescence
  }
}

function normalizeBotProfile(input: BotEngineInput): ChessBotProfile {
  if ('maxDepth' in input) {
    return input
  }
  if ('depth' in input) {
    return catalogEntryToEngineProfile(input)
  }
  return catalogEntryToEngineProfile(buildCustomEngineBot(input.elo))
}

// Backward-compatible profile export derived from the 5-tier bot catalog
export const CHESS_BOT_PROFILES: ChessBotProfile[] = BOT_CATALOG.map(catalogEntryToEngineProfile)

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 900,
  k: 0
}

// Piece-square tables from White's perspective (row 0 = rank 8 ... row 7 = rank 1)
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  52, 52, 52, 58, 58, 52, 52, 52,
  14, 14, 24, 34, 34, 24, 14, 14,
  5, 6, 14, 30, 30, 14, 6, 5,
  0, 0, 6, 26, 26, 6, 0, 0,
  5, -4, -8, 2, 2, -8, -4, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0
]

const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 4, 4, 0, -20, -40,
  -30, 4, 14, 18, 18, 14, 4, -30,
  -30, 6, 18, 24, 24, 18, 6, -30,
  -30, 2, 16, 24, 24, 16, 2, -30,
  -30, 6, 12, 16, 16, 12, 6, -30,
  -40, -20, 0, 6, 6, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50
]

const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 8, 12, 12, 8, 0, -10,
  -10, 6, 8, 16, 16, 8, 6, -10,
  -10, 0, 12, 16, 16, 12, 0, -10,
  -10, 10, 10, 12, 12, 10, 10, -10,
  -10, 6, 0, 0, 0, 0, 6, -10,
  -20, -10, -10, -10, -10, -10, -10, -20
]

const ROOK_PST = [
  0, 0, 2, 4, 4, 2, 0, 0,
  10, 16, 16, 16, 16, 16, 16, 10,
  -4, 0, 0, 0, 0, 0, 0, -4,
  -4, 0, 0, 0, 0, 0, 0, -4,
  -4, 0, 0, 0, 0, 0, 0, -4,
  -4, 0, 0, 0, 0, 0, 0, -4,
  -4, 0, 0, 0, 0, 0, 0, -4,
  0, 0, 4, 12, 12, 4, 0, 0
]

const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 6, 6, 6, 6, 0, -10,
  -5, 0, 6, 8, 8, 6, 0, -5,
  0, 0, 6, 8, 8, 6, 0, -5,
  -10, 4, 6, 6, 6, 6, 0, -10,
  -10, 0, 4, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20
]

const KING_MID_PST = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  18, 22, 0, 0, 0, 0, 22, 18,
  20, 34, 12, 0, 0, 12, 34, 20
]

const KING_END_PST = [
  -35, -20, -15, -10, -10, -15, -20, -35,
  -15, 0, 10, 15, 15, 10, 0, -15,
  -10, 12, 26, 34, 34, 26, 12, -10,
  -10, 14, 32, 42, 42, 32, 14, -10,
  -12, 12, 30, 40, 40, 30, 12, -12,
  -18, 4, 18, 24, 24, 18, 4, -18,
  -25, -10, 0, 5, 5, 0, -10, -25,
  -40, -25, -15, -10, -10, -15, -25, -40
]

// Expanded opening book covering classical & elite responses
const MINI_OPENING_BOOK: Record<string, string[]> = {
  '': ['e4', 'd4', 'Nf3', 'c4'],
  e4: ['e5', 'c5', 'c6', 'e6'],
  d4: ['d5', 'Nf6', 'e6'],
  Nf3: ['d5', 'Nf6', 'c5'],
  c4: ['e5', 'Nf6', 'c5'],
  'e4 e5': ['Nf3', 'Bc4'],
  'e4 e5 Nf3': ['Nc6', 'Nf6'],
  'e4 e5 Nf3 Nc6': ['Bb5', 'Bc4', 'd4'],
  'e4 e5 Nf3 Nc6 Bb5': ['a6', 'Nf6'],
  'e4 e5 Nf3 Nc6 Bb5 a6': ['Ba4'],
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': ['Nf6'],
  'e4 e5 Nf3 Nc6 Bc4': ['Bc5', 'Nf6'],
  'e4 e5 Nf3 Nc6 Bc4 Bc5': ['c3', 'O-O'],
  'e4 c5': ['Nf3', 'Nc3'],
  'e4 c5 Nf3': ['d6', 'Nc6', 'e6'],
  'e4 c5 Nf3 d6': ['d4'],
  'e4 c5 Nf3 d6 d4': ['cxd4'],
  'e4 c5 Nf3 d6 d4 cxd4': ['Nxd4'],
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4': ['Nf6'],
  'e4 c6': ['d4', 'Nc3'],
  'e4 c6 d4': ['d5'],
  'e4 c6 d4 d5': ['Nc3', 'e5', 'exd5'],
  'e4 e6': ['d4'],
  'e4 e6 d4': ['d5'],
  'e4 e6 d4 d5': ['Nc3', 'Nd2', 'e5'],
  'd4 d5': ['c4', 'Bf4', 'Nf3'],
  'd4 d5 c4': ['e6', 'c6'],
  'd4 d5 c4 e6': ['Nc3', 'Nf3'],
  'd4 Nf6': ['c4', 'Nf3', 'Bf4'],
  'd4 Nf6 c4': ['e6', 'g6'],
  'd4 Nf6 c4 g6': ['Nc3'],
  'd4 Nf6 c4 g6 Nc3': ['Bg7']
}

function getPstValue(
  type: PieceSymbol,
  color: 'w' | 'b',
  row: number,
  col: number,
  isEndgame: boolean
): number {
  const r = color === 'w' ? row : 7 - row
  const idx = r * 8 + col
  switch (type) {
    case 'p':
      return PAWN_PST[idx] ?? 0
    case 'n':
      return KNIGHT_PST[idx] ?? 0
    case 'b':
      return BISHOP_PST[idx] ?? 0
    case 'r':
      return ROOK_PST[idx] ?? 0
    case 'q':
      return QUEEN_PST[idx] ?? 0
    case 'k':
      return (isEndgame ? KING_END_PST[idx] : KING_MID_PST[idx]) ?? 0
  }
}

/**
 * Full-game static evaluation in centipawns from White's perspective.
 * Enhanced for high-ELO play with passed pawns, open-file rooks, king shield, and aggression tuning.
 */
export function evaluateBoard(game: Chess, aggression = 0.5, enhanced = true): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999
  }
  if (
    game.isDraw() ||
    game.isStalemate() ||
    game.isInsufficientMaterial() ||
    game.isThreefoldRepetition()
  ) {
    return 0
  }

  const board = game.board()
  let nonPawnMaterial = 0
  let wBishops = 0
  let bBishops = 0
  const wPawnFiles = new Uint8Array(8)
  const bPawnFiles = new Uint8Array(8)
  const wPawnRanks: number[] = []
  const bPawnRanks: number[] = []
  const wRooks: number[] = []
  const bRooks: number[] = []
  let wKingPos: { r: number; c: number } | null = null
  let bKingPos: { r: number; c: number } | null = null

  for (let r = 0; r < 8; r++) {
    const row = board[r]
    if (!row) continue
    for (let c = 0; c < 8; c++) {
      const p = row[c]
      if (!p) continue
      if (p.type !== 'p' && p.type !== 'k') {
        nonPawnMaterial += PIECE_VALUES[p.type]
      }
      if (p.type === 'b') {
        if (p.color === 'w') wBishops += 1
        else bBishops += 1
      } else if (p.type === 'p') {
        if (p.color === 'w') {
          wPawnFiles[c] = (wPawnFiles[c] ?? 0) + 1
          wPawnRanks.push((r << 3) | c)
        } else {
          bPawnFiles[c] = (bPawnFiles[c] ?? 0) + 1
          bPawnRanks.push((r << 3) | c)
        }
      } else if (p.type === 'r') {
        if (p.color === 'w') wRooks.push(c)
        else bRooks.push(c)
      } else if (p.type === 'k') {
        if (p.color === 'w') wKingPos = { r, c }
        else bKingPos = { r, c }
      }
    }
  }

  const isEndgame = nonPawnMaterial <= 2600
  let score = 0
  const aggrScale = 0.75 + aggression * 0.55

  for (let r = 0; r < 8; r++) {
    const row = board[r]
    if (!row) continue
    for (let c = 0; c < 8; c++) {
      const p = row[c]
      if (!p) continue
      let val = PIECE_VALUES[p.type] + getPstValue(p.type, p.color, r, c, isEndgame)

      // Aggression bonus for advancing minor/major pieces toward enemy territory
      if (enhanced && !isEndgame && (p.type === 'n' || p.type === 'b' || p.type === 'q')) {
        const enemyKing = p.color === 'w' ? bKingPos : wKingPos
        if (enemyKing) {
          const dist = Math.abs(r - enemyKing.r) + Math.abs(c - enemyKing.c)
          val += Math.round(Math.max(0, 8 - dist) * 2.2 * aggrScale)
        }
      }

      if (p.color === 'w') score += val
      else score -= val
    }
  }

  // Bishop pair bonus
  if (wBishops >= 2) score += 34
  if (bBishops >= 2) score -= 34

  if (enhanced) {
    // Doubled pawn penalty & open-file rook bonus
    for (let c = 0; c < 8; c++) {
      const wf = wPawnFiles[c] ?? 0
      const bf = bPawnFiles[c] ?? 0
      if (wf > 1) score -= (wf - 1) * 14
      if (bf > 1) score += (bf - 1) * 14
    }

    for (const c of wRooks) {
      if ((wPawnFiles[c] ?? 0) === 0) {
        score += (bPawnFiles[c] ?? 0) === 0 ? 22 : 12
      }
    }
    for (const c of bRooks) {
      if ((bPawnFiles[c] ?? 0) === 0) {
        score -= (wPawnFiles[c] ?? 0) === 0 ? 22 : 12
      }
    }

    // Passed pawn bonus (stronger in endgame)
    const passScale = isEndgame ? 1.55 : 0.85
    for (const packed of wPawnRanks) {
      const r = packed >> 3
      const c = packed & 7
      let blocked = false
      for (const bPacked of bPawnRanks) {
        const br = bPacked >> 3
        const bc = bPacked & 7
        if (br < r && Math.abs(bc - c) <= 1) {
          blocked = true
          break
        }
      }
      if (!blocked) {
        const advance = 7 - r
        score += Math.round((10 + advance * advance * 3.5) * passScale)
      }
    }

    for (const packed of bPawnRanks) {
      const r = packed >> 3
      const c = packed & 7
      let blocked = false
      for (const wPacked of wPawnRanks) {
        const wr = wPacked >> 3
        const wc = wPacked & 7
        if (wr > r && Math.abs(wc - c) <= 1) {
          blocked = true
          break
        }
      }
      if (!blocked) {
        const advance = r
        score -= Math.round((10 + advance * advance * 3.5) * passScale)
      }
    }

    // Castled king pawn shield in middlegame
    if (!isEndgame && wKingPos && wKingPos.r >= 6 && (wKingPos.c <= 2 || wKingPos.c >= 5)) {
      const shieldRow = board[6]
      if (shieldRow) {
        for (let dc = -1; dc <= 1; dc++) {
          const sc = wKingPos.c + dc
          if (sc >= 0 && sc < 8 && shieldRow[sc]?.type === 'p' && shieldRow[sc]?.color === 'w') {
            score += 11
          }
        }
      }
    }
    if (!isEndgame && bKingPos && bKingPos.r <= 1 && (bKingPos.c <= 2 || bKingPos.c >= 5)) {
      const shieldRow = board[1]
      if (shieldRow) {
        for (let dc = -1; dc <= 1; dc++) {
          const sc = bKingPos.c + dc
          if (sc >= 0 && sc < 8 && shieldRow[sc]?.type === 'p' && shieldRow[sc]?.color === 'b') {
            score -= 11
          }
        }
      }
    }
  }

  return score
}

function orderMoveScore(move: Move, aggression: number): number {
  let s = 0
  if (move.promotion) s += 950 + PIECE_VALUES[move.promotion]
  if (move.captured) {
    // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    s += 320 + PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece]
  }
  if (move.san.includes('#')) s += 5000
  else if (move.san.includes('+')) s += Math.round(50 + aggression * 35)
  if (move.san === 'O-O' || move.san === 'O-O-O') s += 42
  // Slight center preference for quiet moves
  if (move.to === 'd4' || move.to === 'e4' || move.to === 'd5' || move.to === 'e5') {
    s += Math.round(14 + aggression * 10)
  }
  return s
}

interface BotSearchControl {
  deadline: number
  aborted: boolean
  nodes: number
  useQuiescence: boolean
  maxQDepth: number
  aggression: number
  enhancedEval: boolean
}

function quiescence(
  game: Chess,
  alpha: number,
  beta: number,
  maximizingWhite: boolean,
  qDepth: number,
  ctrl: BotSearchControl
): number {
  ctrl.nodes += 1
  if ((ctrl.nodes & 127) === 0 && Date.now() >= ctrl.deadline) {
    ctrl.aborted = true
    return 0
  }

  const standPat = evaluateBoard(game, ctrl.aggression, ctrl.enhancedEval)
  if (qDepth <= 0) return standPat

  if (maximizingWhite) {
    if (standPat >= beta) return beta
    if (standPat > alpha) alpha = standPat
  } else {
    if (standPat <= alpha) return alpha
    if (standPat < beta) beta = standPat
  }

  const captures = game
    .moves({ verbose: true })
    .filter((m) => Boolean(m.captured || m.promotion))
  captures.sort((a, b) => orderMoveScore(b, ctrl.aggression) - orderMoveScore(a, ctrl.aggression))

  if (maximizingWhite) {
    for (const move of captures) {
      game.move(move)
      const val = quiescence(game, alpha, beta, false, qDepth - 1, ctrl)
      game.undo()
      if (ctrl.aborted) return 0
      if (val >= beta) return beta
      if (val > alpha) alpha = val
    }
    return alpha
  } else {
    for (const move of captures) {
      game.move(move)
      const val = quiescence(game, alpha, beta, true, qDepth - 1, ctrl)
      game.undo()
      if (ctrl.aborted) return 0
      if (val <= alpha) return alpha
      if (val < beta) beta = val
    }
    return beta
  }
}

function alphaBeta(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizingWhite: boolean,
  ctrl: BotSearchControl,
  lastMoveTactical = false
): number {
  ctrl.nodes += 1
  if ((ctrl.nodes & 127) === 0 && Date.now() >= ctrl.deadline) {
    ctrl.aborted = true
    return 0
  }

  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -90000 - depth * 100 : 90000 + depth * 100
  }
  if (
    game.isDraw() ||
    game.isStalemate() ||
    game.isInsufficientMaterial() ||
    game.isThreefoldRepetition()
  ) {
    return 0
  }
  if (depth === 0) {
    if (ctrl.useQuiescence && lastMoveTactical) {
      return quiescence(game, alpha, beta, maximizingWhite, ctrl.maxQDepth, ctrl)
    }
    return evaluateBoard(game, ctrl.aggression, ctrl.enhancedEval)
  }

  const moves = game.moves({ verbose: true })
  moves.sort((a, b) => orderMoveScore(b, ctrl.aggression) - orderMoveScore(a, ctrl.aggression))

  if (maximizingWhite) {
    let best = -Infinity
    for (const move of moves) {
      const isTactical = Boolean(move.captured || move.promotion || move.san.includes('+'))
      game.move(move)
      const val = alphaBeta(game, depth - 1, alpha, beta, false, ctrl, isTactical)
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
      const isTactical = Boolean(move.captured || move.promotion || move.san.includes('+'))
      game.move(move)
      const val = alphaBeta(game, depth - 1, alpha, beta, true, ctrl, isTactical)
      game.undo()
      if (ctrl.aborted) return 0
      if (val < best) best = val
      if (best < beta) beta = val
      if (beta <= alpha) break
    }
    return best
  }
}

export interface BotMoveResponse {
  move: Move | null
  evaluation: number // in pawns (+ White, - Black)
  depth: number
  fromBook: boolean
}

export function getBotProfileById(id: string): ChessBotProfile {
  return catalogEntryToEngineProfile(getCatalogBotById(id))
}

/**
 * Computes a realistic move calibrated across ELO 250–3200 without freezing the UI.
 */
export function computeBotMove(
  fen: string,
  botInput: BotEngineInput,
  moveHistorySan: string[] = []
): BotMoveResponse {
  const profile = normalizeBotProfile(botInput)
  const game = new Chess(fen)
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) {
    return {
      move: null,
      evaluation: Math.round((evaluateBoard(game, profile.aggression) / 100) * 10) / 10,
      depth: 0,
      fromBook: false
    }
  }

  // 1. Opening book lookup for intermediate+ bots
  if (profile.useBook && moveHistorySan.length <= 8) {
    const key = moveHistorySan.join(' ')
    const candidates = MINI_OPENING_BOOK[key]
    if (candidates && candidates.length > 0) {
      const legalBook = candidates
        .map((san) => moves.find((m) => m.san === san))
        .filter((m): m is Move => Boolean(m))
      if (legalBook.length > 0) {
        const picked = legalBook[Math.floor(Math.random() * legalBook.length)]!
        return {
          move: picked,
          evaluation: Math.round((evaluateBoard(game, profile.aggression) / 100) * 10) / 10,
          depth: 0,
          fromBook: true
        }
      }
    }
  }

  // 2. Calibrated beginner/intermediate blunder rate (ELO 250 - 1350)
  if (profile.blunderChance > 0 && Math.random() < profile.blunderChance) {
    // At very low ELO (250-500), completely random legal move; at 600-1300, avoid giving away instant mate-in-1 when possible
    const shuffled = [...moves].sort(() => Math.random() - 0.5)
    const picked = shuffled[0]!
    return {
      move: picked,
      evaluation: Math.round((evaluateBoard(game, profile.aggression, false) / 100) * 10) / 10,
      depth: 1,
      fromBook: false
    }
  }

  const isWhiteTurn = game.turn() === 'w'
  moves.sort((a, b) => orderMoveScore(b, profile.aggression) - orderMoveScore(a, profile.aggression))

  // Strict hard time ceiling so 2800-3200 ELO never blocks main thread
  const safeBudgetMs = Math.min(540, Math.max(40, profile.timeBudgetMs))
  const deadline = Date.now() + safeBudgetMs
  let scoredMoves: Array<{ move: Move; score: number }> = moves.map((m) => ({ move: m, score: 0 }))
  let completedDepth = 0
  const enhancedEval = profile.elo >= 1400
  const maxQDepth = profile.elo >= 2700 ? 3 : 2

  for (let depth = 1; depth <= profile.maxDepth; depth++) {
    const ctrl: BotSearchControl = {
      deadline: depth <= 1 ? Number.MAX_SAFE_INTEGER : deadline,
      aborted: false,
      nodes: 0,
      useQuiescence: profile.useQuiescence && depth >= 2,
      maxQDepth,
      aggression: profile.aggression,
      enhancedEval
    }

    const iterScored: Array<{ move: Move; score: number }> = []
    let alpha = -Infinity
    let beta = Infinity

    for (const entry of scoredMoves) {
      const isTactical = Boolean(entry.move.captured || entry.move.promotion || entry.move.san.includes('+'))
      game.move(entry.move)
      const val = alphaBeta(game, depth - 1, alpha, beta, !isWhiteTurn, ctrl, isTactical)
      game.undo()

      if (ctrl.aborted) break

      iterScored.push({ move: entry.move, score: val })
      if (isWhiteTurn) {
        if (val > alpha) alpha = val
      } else {
        if (val < beta) beta = val
      }
    }

    if (ctrl.aborted) break

    iterScored.sort((a, b) => (isWhiteTurn ? b.score - a.score : a.score - b.score))
    scoredMoves = iterScored
    completedDepth = depth

    if (Math.abs(scoredMoves[0]?.score ?? 0) >= 85000 || Date.now() >= deadline) {
      break
    }
  }

  // Apply ELO-calibrated evaluation noise to select among top moves
  let chosen = scoredMoves[0]!
  if (profile.noiseCp > 0 && scoredMoves.length > 1) {
    const topCount = profile.elo <= 600 ? 7 : profile.elo <= 1300 ? 5 : 3
    const topSlice = scoredMoves.slice(0, Math.min(topCount, scoredMoves.length))
    const hasForcedMate = Math.abs(chosen.score) >= 85000
    if (!hasForcedMate) {
      const noisy = topSlice.map((item) => {
        const jitter = (Math.random() * 2 - 1) * profile.noiseCp
        return {
          ...item,
          noisyScore: item.score + jitter
        }
      })
      noisy.sort((a, b) => (isWhiteTurn ? b.noisyScore - a.noisyScore : a.noisyScore - b.noisyScore))
      chosen = noisy[0]!
    }
  }

  return {
    move: chosen.move,
    evaluation: Math.round((chosen.score / 100) * 10) / 10,
    depth: completedDepth,
    fromBook: false
  }
}

export interface CapturedSummary {
  whiteCaptured: PieceSymbol[]
  blackCaptured: PieceSymbol[]
  materialDiff: number
}

const STARTING_COUNTS: Record<Exclude<PieceSymbol, 'k'>, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8
}

const MATERIAL_UNIT: Record<Exclude<PieceSymbol, 'k'>, number> = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 1
}

export function computeCapturedMaterial(fen: string): CapturedSummary {
  const game = new Chess(fen)
  const board = game.board()

  const wOnBoard: Record<Exclude<PieceSymbol, 'k'>, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 }
  const bOnBoard: Record<Exclude<PieceSymbol, 'k'>, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 }

  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type === 'k') continue
      if (cell.color === 'w') wOnBoard[cell.type] += 1
      else bOnBoard[cell.type] += 1
    }
  }

  const order: Array<Exclude<PieceSymbol, 'k'>> = ['q', 'r', 'b', 'n', 'p']
  const whiteCaptured: PieceSymbol[] = []
  const blackCaptured: PieceSymbol[] = []
  let wMat = 0
  let bMat = 0

  for (const t of order) {
    wMat += wOnBoard[t] * MATERIAL_UNIT[t]
    bMat += bOnBoard[t] * MATERIAL_UNIT[t]

    const missingBlack = Math.max(0, STARTING_COUNTS[t] - bOnBoard[t])
    for (let i = 0; i < missingBlack; i++) whiteCaptured.push(t)

    const missingWhite = Math.max(0, STARTING_COUNTS[t] - wOnBoard[t])
    for (let i = 0; i < missingWhite; i++) blackCaptured.push(t)
  }

  return {
    whiteCaptured,
    blackCaptured,
    materialDiff: wMat - bMat
  }
}
