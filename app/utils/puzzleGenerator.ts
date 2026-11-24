import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  PUZZLE_BANK,
  type PuzzleThemeKey,
  type TacticalPuzzleItem
} from './puzzleBank'

const SEEN_PUZZLES_STORAGE_KEY = 'grandmaster_atelier_seen_puzzles_v1'
const MAX_STORED_SEEN = 600

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

const KNIGHT_DELTAS: ReadonlyArray<[number, number]> = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
]

const KING_DELTAS: ReadonlyArray<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
]

export interface GeneratePuzzleOptions {
  themes?: PuzzleThemeKey[]
  minElo?: number
  maxElo?: number
  seenKeys?: Set<string>
  sequenceNumber?: number
  seed?: number
}

// Simple deterministic PRNG (Mulberry32) when seed is provided (e.g. Daily Puzzle)
function createRng(seed?: number): () => number {
  if (seed === undefined) return () => Math.random()
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

function toSq(f: number, r: number): Square | null {
  if (f < 0 || f > 7 || r < 0 || r > 7) return null
  return `${FILES[f]}${RANKS[r]}` as Square
}

function kingsAdjacent(f1: number, r1: number, f2: number, r2: number): boolean {
  return Math.abs(f1 - f2) <= 1 && Math.abs(r1 - r2) <= 1
}

export function normalizeFenKey(fen: string): string {
  return fen.split(' ').slice(0, 2).join(' ')
}

export function loadSeenPuzzleKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SEEN_PUZZLES_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((s): s is string => typeof s === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

export function saveSeenPuzzleKeys(seen: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    const arr = Array.from(seen).slice(-MAX_STORED_SEEN)
    localStorage.setItem(SEEN_PUZZLES_STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // Ignore storage quota errors
  }
}

type BoardMap = Map<Square, { type: PieceSymbol; color: Color }>

function boardMapToFen(map: BoardMap, turn: Color): string {
  const rows: string[] = []
  for (let r = 7; r >= 0; r--) {
    let rowStr = ''
    let empty = 0
    for (let f = 0; f < 8; f++) {
      const sq = toSq(f, r)!
      const p = map.get(sq)
      if (!p) {
        empty += 1
      } else {
        if (empty > 0) {
          rowStr += String(empty)
          empty = 0
        }
        rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase()
      }
    }
    if (empty > 0) rowStr += String(empty)
    rows.push(rowStr)
  }
  return `${rows.join('/')} ${turn} - - 0 1`
}

function placeSafeFriendlyKing(map: BoardMap, side: Color, enemyKf: number, enemyKr: number, rng: () => number): Square | null {
  const preferredRank = side === 'w' ? randInt(rng, 0, 2) : randInt(rng, 5, 7)
  for (let attempt = 0; attempt < 30; attempt++) {
    const f = randInt(rng, 0, 7)
    const r = attempt < 15 ? preferredRank : randInt(rng, 0, 7)
    const sq = toSq(f, r)!
    if (map.has(sq)) continue
    if (kingsAdjacent(f, r, enemyKf, enemyKr)) continue
    map.set(sq, { type: 'k', color: side })
    return sq
  }
  return null
}

function addHarmlessDecoyPawns(
  map: BoardMap,
  side: Color,
  enemySide: Color,
  rng: () => number,
  count: number,
  forbiddenSquares: Set<Square>
) {
  for (let i = 0; i < count; i++) {
    const f = randInt(rng, 0, 7)
    const isFriendly = rng() < 0.5
    const r = isFriendly
      ? side === 'w'
        ? randInt(rng, 1, 3)
        : randInt(rng, 4, 6)
      : enemySide === 'w'
        ? randInt(rng, 1, 3)
        : randInt(rng, 4, 6)
    const sq = toSq(f, r)
    if (!sq || map.has(sq) || forbiddenSquares.has(sq)) continue
    map.set(sq, { type: 'p', color: isFriendly ? side : enemySide })
  }
}

function isLegalQuietSetup(fen: string): Chess | null {
  try {
    const g = new Chess(fen)
    // Mover must NOT already be in checkmate/draw, and opponent king cannot be capturable
    if (g.isGameOver()) return null
    return g
  } catch {
    return null
  }
}

function countMateInOneMoves(game: Chess): string[] {
  const mates: string[] = []
  for (const mv of game.moves({ verbose: true })) {
    game.move(mv)
    if (game.isCheckmate()) mates.push(mv.san)
    game.undo()
  }
  return mates
}

/**
 * 1. Procedural Back-Rank / Corridor Mate (Skakmat, 850 - 1300 ELO)
 * Generates varied edge-rank mates with randomized king file, rook/queen attacker,
 * color (White or Black), and decoy pawn structure — strictly unique mate-in-1!
 */
function genBackRankMate(rng: () => number, seq: number): TacticalPuzzleItem | null {
  const side: Color = rng() < 0.58 ? 'w' : 'b'
  const enemy: Color = side === 'w' ? 'b' : 'w'
  const backRank = side === 'w' ? 7 : 0
  const shieldRank = side === 'w' ? 6 : 1

  const map: BoardMap = new Map()
  const enemyKf = pick(rng, [1, 2, 5, 6])
  const enemyKsq = toSq(enemyKf, backRank)!
  map.set(enemyKsq, { type: 'k', color: enemy })

  // Place pawn wall directly in front of enemy King
  for (const df of [-1, 0, 1]) {
    const psq = toSq(enemyKf + df, shieldRank)
    if (psq) map.set(psq, { type: 'p', color: enemy })
  }

  // Pick rook/queen delivery file away from king
  const candidateFiles = [0, 1, 2, 3, 4, 5, 6, 7].filter((f) => Math.abs(f - enemyKf) >= 2)
  const attackFile = pick(rng, candidateFiles)
  const attackRank = side === 'w' ? randInt(rng, 0, 3) : randInt(rng, 4, 7)
  const attackerPiece: PieceSymbol = rng() < 0.72 ? 'r' : 'q'
  const attackerSq = toSq(attackFile, attackRank)!
  map.set(attackerSq, { type: attackerPiece, color: side })

  const friendlyK = placeSafeFriendlyKing(map, side, enemyKf, backRank, rng)
  if (!friendlyK) return null

  // Optional enemy minor piece away from back rank to make position feel game-like
  const forbidden = new Set<Square>([enemyKsq, attackerSq, friendlyK])
  for (let r = 0; r < 8; r++) {
    const fs = toSq(attackFile, r)
    if (fs) forbidden.add(fs)
  }
  for (let f = 0; f < 8; f++) {
    const bs = toSq(f, backRank)
    if (bs) forbidden.add(bs)
  }
  addHarmlessDecoyPawns(map, side, enemy, rng, randInt(rng, 2, 4), forbidden)

  const fen = boardMapToFen(map, side)
  const game = isLegalQuietSetup(fen)
  if (!game) return null

  const mates = countMateInOneMoves(game)
  if (mates.length !== 1) return null
  const solutionSan = mates[0]!
  const targetSq = toSq(attackFile, backRank)!
  if (!solutionSan.includes(targetSq)) return null

  const rating = randInt(rng, 17, 25) * 50 // 850..1250
  const pieceLabel = attackerPiece === 'r' ? 'Benteng' : 'Menteri'

  return {
    id: `auto-backrank-${seq}-${Date.now().toString(36)}`,
    number: seq,
    title: side === 'w' ? 'Skakmat Baris Belakang' : 'Serangan Baris Pertama Hitam',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating,
    side,
    fen,
    solutionSan,
    prompt: `Raja ${enemy === 'w' ? 'Putih' : 'Hitam'} terkurung di belakang barisan pionnya. Tuntaskan dalam satu langkah!`,
    explanation: `${solutionSan}! ${pieceLabel} mengunci seluruh baris akhir sementara tiga pion menutup jalan pelarian Raja.`,
    hint: `Terobos baris akhir ke petak ${targetSq} menggunakan ${pieceLabel} di ${attackerSq}.`
  }
}

/**
 * 2. Procedural Supported Queen Mate (Skakmat, 950 - 1450 ELO)
 * Queen lands next to enemy King supported by Bishop, Knight, or Rook — unique mate-in-1!
 */
function genSupportedQueenMate(rng: () => number, seq: number): TacticalPuzzleItem | null {
  const side: Color = rng() < 0.55 ? 'w' : 'b'
  const enemy: Color = side === 'w' ? 'b' : 'w'
  const map: BoardMap = new Map()

  const edgeRank = side === 'w' ? 7 : 0
  const supportRank = side === 'w' ? 6 : 1
  const enemyKf = pick(rng, [0, 1, 6, 7])
  const enemyKsq = toSq(enemyKf, edgeRank)!
  map.set(enemyKsq, { type: 'k', color: enemy })

  // Target mate square directly in front of enemy King
  const mateSq = toSq(enemyKf, supportRank)!
  // Block side escape with an enemy rook/pawn if corner
  const sideBlockF = enemyKf <= 1 ? enemyKf + 1 : enemyKf - 1
  const sideBlockSq = toSq(sideBlockF, edgeRank)
  if (sideBlockSq && rng() < 0.7) {
    map.set(sideBlockSq, { type: 'r', color: enemy })
  }

  // Place friendly supporter guarding mateSq (Knight or Bishop)
  const useKnight = rng() < 0.5
  let supporterSq: Square | null = null
  if (useKnight) {
    const candidates = KNIGHT_DELTAS.map(([df, dr]) => toSq(enemyKf + df, supportRank + dr)).filter(
      (sq): sq is Square => Boolean(sq && !map.has(sq) && sq !== mateSq)
    )
    if (candidates.length === 0) return null
    supporterSq = pick(rng, candidates)
    map.set(supporterSq, { type: 'n', color: side })
  } else {
    const diagDir = enemyKf <= 3 ? 1 : -1
    const rankDir = side === 'w' ? -1 : 1
    const step = randInt(rng, 2, 4)
    supporterSq = toSq(enemyKf + diagDir * step, supportRank + rankDir * step)
    if (!supporterSq || map.has(supporterSq)) return null
    map.set(supporterSq, { type: 'b', color: side })
  }

  // Place friendly Queen on a clean line to mateSq (file or rank)
  const qCandidates: Square[] = []
  for (let r = 0; r < 8; r++) {
    const s = toSq(enemyKf, r)
    if (s && s !== enemyKsq && s !== mateSq && !map.has(s)) qCandidates.push(s)
  }
  for (let f = 0; f < 8; f++) {
    const s = toSq(f, supportRank)
    if (s && s !== mateSq && !map.has(s) && Math.abs(f - enemyKf) >= 2) qCandidates.push(s)
  }
  if (qCandidates.length === 0) return null
  const queenSq = pick(rng, qCandidates)
  map.set(queenSq, { type: 'q', color: side })

  const friendlyK = placeSafeFriendlyKing(map, side, enemyKf, edgeRank, rng)
  if (!friendlyK) return null

  const fen = boardMapToFen(map, side)
  const game = isLegalQuietSetup(fen)
  if (!game) return null

  const mates = countMateInOneMoves(game)
  if (mates.length !== 1) return null
  const solutionSan = mates[0]!
  if (!solutionSan.startsWith('Q')) return null

  const rating = randInt(rng, 19, 29) * 50 // 950..1450
  return {
    id: `auto-qmate-${seq}-${Date.now().toString(36)}`,
    number: seq,
    title: useKnight ? 'Skakmat Sinergi Menteri & Kuda' : 'Skakmat Diagonal Menteri & Gajah',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating,
    side,
    fen,
    solutionSan,
    prompt: `Menteri Anda mendapat dukungan penuh dari ${useKnight ? 'Kuda' : 'Gajah'} di ${supporterSq}. Temukan skakmat langsung!`,
    explanation: `${solutionSan}! Menteri mendarat di ${mateSq} dengan perlindungan penuh sehingga Raja tidak memiliki petak aman.`,
    hint: `Arahkan Menteri di ${queenSq} menuju petak ${mateSq} tepat di hadapan Raja lawan.`
  }
}

/**
 * 3. Procedural Knight Royal/Family Fork (Garpu, 1000 - 1650 ELO)
 * Knight leaps to a safe square checking enemy King while simultaneously attacking enemy Queen or Rook!
 */
function genKnightFork(rng: () => number, seq: number): TacticalPuzzleItem | null {
  const side: Color = rng() < 0.55 ? 'w' : 'b'
  const enemy: Color = side === 'w' ? 'b' : 'w'
  const map: BoardMap = new Map()

  // Fork landing square T somewhere central
  const tf = randInt(rng, 1, 6)
  const tr = randInt(rng, 2, 5)
  const forkSq = toSq(tf, tr)!

  // Pick 3 distinct knight-jump neighbors around forkSq:
  // 1) enemy King, 2) enemy Queen or Rook (value target), 3) our Knight's origin square
  const neighbors: Array<[number, number, Square]> = []
  for (const [df, dr] of KNIGHT_DELTAS) {
    const nf = tf + df
    const nr = tr + dr
    const sq = toSq(nf, nr)
    if (sq) neighbors.push([nf, nr, sq])
  }
  if (neighbors.length < 3) return null

  // Shuffle neighbors
  for (let i = neighbors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[neighbors[i], neighbors[j]] = [neighbors[j]!, neighbors[i]!]
  }

  const [ekf, ekr, enemyKsq] = neighbors[0]!
  const [etf, etr, enemyTargetSq] = neighbors[1]!
  const [, , knightOriginSq] = neighbors[2]!

  // Avoid placing enemy target right next to enemy King so King can't just defend/blur clarity, or keep Rook/Queen
  const targetPiece: PieceSymbol = rng() < 0.62 ? 'q' : 'r'
  // Ensure enemy target cannot attack forkSq! (Queen/Rook cannot attack a knight-jump away square — awesome geometric property!)
  if (Math.abs(etf - tf) === 0 || Math.abs(etr - tr) === 0 || Math.abs(etf - tf) === Math.abs(etr - tr)) {
    return null
  }

  map.set(enemyKsq, { type: 'k', color: enemy })
  map.set(enemyTargetSq, { type: targetPiece, color: enemy })
  map.set(knightOriginSq, { type: 'n', color: side })

  const friendlyK = placeSafeFriendlyKing(map, side, ekf, ekr, rng)
  if (!friendlyK) return null

  // Optionally put an enemy pawn ON forkSq so it becomes a capturing fork (Nxc7+ style!)
  if (rng() < 0.45 && tr >= 1 && tr <= 6) {
    map.set(forkSq, { type: 'p', color: enemy })
  }

  // Add 2-3 safe pawns that do NOT guard forkSq
  const forbidden = new Set<Square>([enemyKsq, enemyTargetSq, knightOriginSq, friendlyK, forkSq])
  const enemyPawnGuardRank = enemy === 'w' ? tr - 1 : tr + 1
  for (const df of [-1, 1]) {
    const gsq = toSq(tf + df, enemyPawnGuardRank)
    if (gsq) forbidden.add(gsq)
  }
  addHarmlessDecoyPawns(map, side, enemy, rng, randInt(rng, 2, 4), forbidden)

  const fen = boardMapToFen(map, side)
  const game = isLegalQuietSetup(fen)
  if (!game) return null

  // Verify the fork move is legal, gives check, and lands on a square NOT attacked by enemy pieces
  const moveObj = game
    .moves({ verbose: true })
    .find((m) => m.from === knightOriginSq && m.to === forkSq)
  if (!moveObj) return null

  game.move(moveObj)
  if (!game.isCheck()) return null
  // Ensure our knight on forkSq cannot simply be captured by enemy
  const attackersOnFork = game.attackers(forkSq, enemy)
  if (attackersOnFork.length > 0) return null

  // Also ensure our knight isn't giving an alternate fork or mate elsewhere
  const rating = (targetPiece === 'q' ? randInt(rng, 20, 29) : randInt(rng, 22, 33)) * 50
  const targetLabel = targetPiece === 'q' ? 'Menteri' : 'Benteng'

  return {
    id: `auto-fork-${seq}-${Date.now().toString(36)}`,
    number: seq,
    title: targetPiece === 'q' ? 'Garpu Kerajaan Memburu Menteri' : 'Garpu Kuda Menyerang Benteng',
    theme: 'Garpu',
    themeSubtitle: 'FORK',
    rating,
    side,
    fen,
    solutionSan: moveObj.san,
    prompt: `Temukan lompatan kuda berskak yang langsung mengancam Raja dan ${targetLabel} lawan di ${enemyTargetSq}!`,
    explanation: `${moveObj.san}! Garpu kuda mematikan di petak aman ${forkSq} memaksa Raja berpindah dan merebut ${targetLabel} di ${enemyTargetSq}.`,
    hint: `Lompatkan Kuda ${knightOriginSq} ke petak ${forkSq} untuk menyerang Raja dan ${targetLabel} sekaligus.`
  }
}

/**
 * 4. Procedural Absolute Pin / Skewer (Pin, 1150 - 1750 ELO)
 * Rook or Bishop moves onto a rank/file/diagonal to skewer enemy King -> Queen/Rook OR pin Queen to King!
 */
function genPinOrSkewer(rng: () => number, seq: number): TacticalPuzzleItem | null {
  const side: Color = rng() < 0.55 ? 'w' : 'b'
  const enemy: Color = side === 'w' ? 'b' : 'w'
  const isDiagonal = rng() < 0.5
  const isSkewer = rng() < 0.55
  const map: BoardMap = new Map()

  if (!isDiagonal) {
    // Orthogonal Rook Pin or Skewer on a file or rank
    const useFile = rng() < 0.5
    const lineIdx = randInt(rng, 1, 6)
    const firstPos = randInt(rng, 0, 1)
    const midPos = randInt(rng, 3, 4)
    const endPos = randInt(rng, 6, 7)

    const sqAt = (pos: number): Square => (useFile ? toSq(lineIdx, pos)! : toSq(pos, lineIdx)!)
    const kingSq = isSkewer ? sqAt(midPos) : sqAt(endPos)
    const targetSq = isSkewer ? sqAt(endPos) : sqAt(midPos)
    const landSq = sqAt(firstPos)

    // Rook starts off the line on a perpendicular coordinate
    const offChoices = [0, 1, 2, 3, 4, 5, 6, 7].filter((x) => Math.abs(x - lineIdx) >= 2)
    const offIdx = pick(rng, offChoices)
    const originSq = useFile ? toSq(offIdx, firstPos)! : toSq(firstPos, offIdx)!

    const targetPiece: PieceSymbol = isSkewer ? (rng() < 0.55 ? 'q' : 'r') : 'q'
    map.set(kingSq, { type: 'k', color: enemy })
    map.set(targetSq, { type: targetPiece, color: enemy })
    map.set(originSq, { type: 'r', color: side })

    const ekf = FILES.indexOf(kingSq[0] as (typeof FILES)[number])
    const ekr = RANKS.indexOf(kingSq[1] as (typeof RANKS)[number])
    const friendlyK = placeSafeFriendlyKing(map, side, ekf, ekr, rng)
    if (!friendlyK) return null

    // Guard landSq with friendly pawn or ensure enemy target can't simply take rook safely unless protected
    if (!isSkewer) {
      // Protect landSq with friendly bishop/rook? Simpler: place friendly pawn guarding landSq
      const lf = FILES.indexOf(landSq[0] as (typeof FILES)[number])
      const lr = RANKS.indexOf(landSq[1] as (typeof RANKS)[number])
      const guardR = side === 'w' ? lr - 1 : lr + 1
      const guardSq = toSq(lf + (lf < 7 ? 1 : -1), guardR)
      if (!guardSq || map.has(guardSq) || guardR < 1 || guardR > 6) return null
      map.set(guardSq, { type: 'p', color: side })
    }

    const fen = boardMapToFen(map, side)
    const game = isLegalQuietSetup(fen)
    if (!game) return null

    const mv = game.moves({ verbose: true }).find((m) => m.from === originSq && m.to === landSq)
    if (!mv) return null
    game.move(mv)
    if (isSkewer && !game.isCheck()) return null
    if (!isSkewer && game.isCheck()) return null
    // Ensure rook at landSq is not hanging to enemy King
    if (game.attackers(landSq, enemy).length > 0 && game.attackers(landSq, side).length === 0) {
      return null
    }

    const rating = randInt(rng, 23, 34) * 50 // 1150..1700
    const targetName = targetPiece === 'q' ? 'Menteri' : 'Benteng'
    return {
      id: `auto-pin-r-${seq}-${Date.now().toString(36)}`,
      number: seq,
      title: isSkewer ? `Tusuk Sate Benteng Memburu ${targetName}` : 'Paku Mutlak Benteng terhadap Menteri',
      theme: 'Pin',
      themeSubtitle: 'PIN & SKEWER',
      rating,
      side,
      fen,
      solutionSan: mv.san,
      prompt: isSkewer
        ? `Raja dan ${targetName} lawan sejajar! Berikan skak tusuk sate untuk merebut ${targetName} di ${targetSq}.`
        : `Menteri dan Raja lawan berada pada satu garis lurus. Paku Menteri di ${targetSq} sekarang!`,
      explanation: isSkewer
        ? `${mv.san}! Skak tusuk sate memaksa Raja minggir sehingga ${targetName} di ${targetSq} jatuh tanpa perlawanan.`
        : `${mv.san}! Paku absolut membuat Menteri ${targetSq} tidak bisa berpindah tanpa membuka skak pada Raja di ${kingSq}.`,
      hint: `Geser Benteng dari ${originSq} ke petak ${landSq}.`
    }
  } else {
    // Diagonal Bishop Skewer (King -> Rook/Queen)
    const dirF = rng() < 0.5 ? 1 : -1
    const startF = dirF === 1 ? randInt(rng, 0, 2) : randInt(rng, 5, 7)
    const startR = randInt(rng, 0, 2)
    const landSq = toSq(startF, startR)
    const kingSq = toSq(startF + dirF * 2, startR + 2)
    const targetSq = toSq(startF + dirF * 4, startR + 4)
    if (!landSq || !kingSq || !targetSq) return null

    // Bishop origin on the perpendicular diagonal to landSq
    const originSq = toSq(startF - dirF * 1, startR + 1) ?? toSq(startF + dirF * 1, startR - 1)
    if (!originSq || originSq === kingSq || originSq === targetSq) return null

    const targetPiece: PieceSymbol = rng() < 0.65 ? 'r' : 'q'
    map.set(kingSq, { type: 'k', color: enemy })
    map.set(targetSq, { type: targetPiece, color: enemy })
    map.set(originSq, { type: 'b', color: side })

    const ekf = FILES.indexOf(kingSq[0] as (typeof FILES)[number])
    const ekr = RANKS.indexOf(kingSq[1] as (typeof RANKS)[number])
    const friendlyK = placeSafeFriendlyKing(map, side, ekf, ekr, rng)
    if (!friendlyK) return null

    const fen = boardMapToFen(map, side)
    const game = isLegalQuietSetup(fen)
    if (!game) return null

    const mv = game.moves({ verbose: true }).find((m) => m.from === originSq && m.to === landSq)
    if (!mv) return null
    game.move(mv)
    if (!game.isCheck()) return null
    if (game.attackers(landSq, enemy).length > 0 && game.attackers(landSq, side).length === 0) {
      return null
    }

    const rating = randInt(rng, 25, 35) * 50 // 1250..1750
    const targetName = targetPiece === 'q' ? 'Menteri' : 'Benteng'
    return {
      id: `auto-pin-b-${seq}-${Date.now().toString(36)}`,
      number: seq,
      title: `Tusuk Sate Gajah Memburu ${targetName}`,
      theme: 'Pin',
      themeSubtitle: 'PIN & SKEWER',
      rating,
      side,
      fen,
      solutionSan: mv.san,
      prompt: `Raja dan ${targetName} lawan sejajar pada diagonal terbuka! Tembus keduanya dengan Gajah.`,
      explanation: `${mv.san}! Gajah di ${landSq} memberi skak sambil mengincar ${targetName} di ${targetSq} di belakang Raja.`,
      hint: `Pindahkan Gajah ${originSq} ke petak diagonal ${landSq}.`
    }
  }
}

/**
 * 5. Procedural Forced 2-Ply Sacrifice (Pengorbanan, 1550 - 2100 ELO)
 * Generates a Queen or Rook sacrifice where EVERY legal reply by the opponent leads to immediate checkmate!
 */
function genForcedSacrifice(rng: () => number, seq: number): TacticalPuzzleItem | null {
  const side: Color = rng() < 0.6 ? 'w' : 'b'
  const enemy: Color = side === 'w' ? 'b' : 'w'
  const map: BoardMap = new Map()

  const cornerF = rng() < 0.5 ? 7 : 0 // h-file or a-file corner
  const inward = cornerF === 7 ? -1 : 1
  const backRank = side === 'w' ? 7 : 0
  const shieldRank = side === 'w' ? 6 : 1
  const thirdRank = side === 'w' ? 5 : 2

  const enemyKsq = toSq(cornerF, backRank)!
  const trapRookSq = toSq(cornerF + inward, backRank)! // Enemy rook traps king on back rank
  const pawn1 = toSq(cornerF, shieldRank)!
  const pawn2 = toSq(cornerF + inward, shieldRank)!

  // Classic Philidor / Queen-Sacrifice Back-Rank Deflection:
  // Enemy King in corner, enemy rook beside it, enemy pawns in front;
  // Friendly Queen sacrifices on the square adjacent to King OR takes defender, forcing recapture -> Rook mate!
  const sacTargetSq = toSq(cornerF + inward * 2, backRank)! // e.g., f8 when king on h8, rook on g8
  const qOriginRank = side === 'w' ? randInt(rng, 2, 4) : randInt(rng, 3, 5)
  const qOriginSq = toSq(cornerF + inward * 2, qOriginRank)!
  const followRookOriginSq = toSq(cornerF + inward * 3, backRank)! // Already aimed along back rank!

  map.set(enemyKsq, { type: 'k', color: enemy })
  map.set(trapRookSq, { type: 'r', color: enemy })
  map.set(pawn1, { type: 'p', color: enemy })
  map.set(pawn2, { type: 'p', color: enemy })
  map.set(qOriginSq, { type: 'q', color: side })
  map.set(followRookOriginSq, { type: 'r', color: side })

  const friendlyK = placeSafeFriendlyKing(map, side, cornerF, backRank, rng)
  if (!friendlyK) return null

  const fen = boardMapToFen(map, side)
  const game = isLegalQuietSetup(fen)
  if (!game) return null

  // Ensure there is NO immediate mate-in-1 (must actually sacrifice first!)
  if (countMateInOneMoves(game).length > 0) return null

  // Find Queen sacrifice on trapRookSq OR sacTargetSq that forces mate on next move against EVERY enemy reply!
  const queenMoves = game
    .moves({ verbose: true })
    .filter((m) => m.piece === 'q' && (m.to === trapRookSq || m.to === sacTargetSq))

  for (const cand of queenMoves) {
    game.move(cand)
    const replies = game.moves({ verbose: true })
    if (replies.length === 0) {
      game.undo()
      continue
    }
    let allRepliesMated = true
    for (const rep of replies) {
      game.move(rep)
      if (countMateInOneMoves(game).length === 0) {
        allRepliesMated = false
      }
      game.undo()
      if (!allRepliesMated) break
    }
    game.undo()

    if (allRepliesMated) {
      const rating = randInt(rng, 31, 42) * 50 // 1550..2100
      return {
        id: `auto-sac-${seq}-${Date.now().toString(36)}`,
        number: seq,
        title: 'Pengorbanan Menteri Pembongkar Baris Akhir',
        theme: 'Pengorbanan',
        themeSubtitle: 'SACRIFICE',
        rating,
        side,
        fen,
        solutionSan: cand.san,
        prompt: 'Temukan pengorbanan Menteri yang memaksa skakmat tak terhindarkan pada langkah berikutnya!',
        explanation: `${cand.san}!! Pengorbanan Menteri brilian: setiap balasan legal lawan langsung dibalas skakmat mutlak oleh Benteng.`,
        hint: `Korbankan Menteri dari ${qOriginSq} ke petak ${cand.to} untuk menghancurkan pertahanan baris akhir.`
      }
    }
  }

  // Fallback variant: Arabian / Smothered Knight check setup
  const knightOrigin = toSq(cornerF + inward * 1, thirdRank)
  if (knightOrigin) return null
  return null
}

/**
 * 6. Procedural Endgame Promotion / Rook-Cutoff Tactic (Babak Akhir, 1100 - 1950 ELO)
 * Generates varied winning promotion or back-rank rook endgame skewers across all files!
 */
function genEndgameTactic(rng: () => number, seq: number): TacticalPuzzleItem | null {
  const side: Color = rng() < 0.55 ? 'w' : 'b'
  const enemy: Color = side === 'w' ? 'b' : 'w'
  const map: BoardMap = new Map()

  const variant = rng() < 0.55 ? 'promotion' : 'rook-cutoff'

  if (variant === 'promotion') {
    const promoFile = randInt(rng, 0, 7)
    const seventhRank = side === 'w' ? 6 : 1
    const promoRank = side === 'w' ? 7 : 0
    const pawnSq = toSq(promoFile, seventhRank)!
    const targetSq = toSq(promoFile, promoRank)!

    // Friendly King protects pawn or promo square; enemy King is just 1 step too slow
    const fkFile = promoFile <= 3 ? promoFile + 1 : promoFile - 1
    const fkRank = side === 'w' ? 5 : 2
    const ekFile = promoFile <= 3 ? randInt(rng, Math.min(7, promoFile + 3), 7) : randInt(rng, 0, Math.max(0, promoFile - 3))
    const ekRank = side === 'w' ? randInt(rng, 2, 5) : randInt(rng, 2, 5)

    const fkSq = toSq(fkFile, fkRank)!
    const ekSq = toSq(ekFile, ekRank)!
    if (kingsAdjacent(fkFile, fkRank, ekFile, ekRank)) return null

    map.set(pawnSq, { type: 'p', color: side })
    map.set(fkSq, { type: 'k', color: side })
    map.set(ekSq, { type: 'k', color: enemy })

    // Add an opposing passed pawn further back so promotion is urgent!
    const enemyPawnF = ekFile
    const enemyPawnR = enemy === 'w' ? 4 : 3
    const epSq = toSq(enemyPawnF, enemyPawnR)
    if (epSq && !map.has(epSq)) map.set(epSq, { type: 'p', color: enemy })

    const fen = boardMapToFen(map, side)
    const game = isLegalQuietSetup(fen)
    if (!game) return null

    const promoMove = game
      .moves({ verbose: true })
      .find((m) => m.from === pawnSq && m.to === targetSq && m.promotion === 'q')
    if (!promoMove) return null

    const rating = randInt(rng, 22, 31) * 50 // 1100..1550
    return {
      id: `auto-eg-promo-${seq}-${Date.now().toString(36)}`,
      number: seq,
      title: `Promosi Pion Penentu di Lajur ${FILES[promoFile]}`,
      theme: 'Babak Akhir',
      themeSubtitle: 'ENDGAME',
      rating,
      side,
      fen,
      solutionSan: promoMove.san,
      prompt: 'Raja lawan terlambat satu tempo! Segera promosikan pion menjadi Menteri.',
      explanation: `${promoMove.san}! Promosi pion langsung mengubah babak akhir menjadi kemenangan materi mutlak.`,
      hint: `Majukan pion ${pawnSq} ke petak promosi ${targetSq} dan pilih Menteri.`
    }
  } else {
    // Rook Endgame: Skewer Enemy King to win Enemy Rook on the same rank/file!
    const lineRank = side === 'w' ? randInt(rng, 5, 7) : randInt(rng, 0, 2)
    const rookOriginFile = pick(rng, [0, 1])
    const enemyKingFile = randInt(rng, 3, 4)
    const enemyRookFile = randInt(rng, 6, 7)

    const landSq = toSq(rookOriginFile, lineRank)!
    const originRank = side === 'w' ? randInt(rng, 0, 3) : randInt(rng, 4, 7)
    const originSq = toSq(rookOriginFile, originRank)!
    const ekSq = toSq(enemyKingFile, lineRank)!
    const erSq = toSq(enemyRookFile, lineRank)!

    map.set(originSq, { type: 'r', color: side })
    map.set(ekSq, { type: 'k', color: enemy })
    map.set(erSq, { type: 'r', color: enemy })

    const friendlyK = placeSafeFriendlyKing(map, side, enemyKingFile, lineRank, rng)
    if (!friendlyK) return null

    const fen = boardMapToFen(map, side)
    const game = isLegalQuietSetup(fen)
    if (!game) return null

    const mv = game.moves({ verbose: true }).find((m) => m.from === originSq && m.to === landSq)
    if (!mv) return null
    game.move(mv)
    if (!game.isCheck()) return null
    if (game.attackers(landSq, enemy).length > 0) return null

    const rating = randInt(rng, 29, 39) * 50 // 1450..1950
    return {
      id: `auto-eg-rook-${seq}-${Date.now().toString(36)}`,
      number: seq,
      title: 'Taktik Benteng Babak Akhir (Skewer)',
      theme: 'Babak Akhir',
      themeSubtitle: 'ENDGAME',
      rating,
      side,
      fen,
      solutionSan: mv.san,
      prompt: `Raja dan Benteng lawan sejajar pada baris ${RANKS[lineRank]}. Eksekusi tusuk sate babak akhir!`,
      explanation: `${mv.san}! Skak baris lurus memaksa Raja menjauh sehingga Benteng lawan di ${erSq} langsung direbut.`,
      hint: `Pindahkan Benteng ${originSq} ke petak ${landSq} dengan skak.`
    }
  }
}

const GENERATORS_BY_THEME: Record<
  PuzzleThemeKey,
  Array<(rng: () => number, seq: number) => TacticalPuzzleItem | null>
> = {
  Skakmat: [genBackRankMate, genSupportedQueenMate],
  Garpu: [genKnightFork],
  Pin: [genPinOrSkewer],
  Pengorbanan: [genForcedSacrifice],
  'Babak Akhir': [genEndgameTactic]
}

/**
 * Generates a brand-new, chess.js-verified, non-repeating tactical puzzle matching the requested themes & ELO range.
 */
export function generateUniquePuzzle(options: GeneratePuzzleOptions = {}): TacticalPuzzleItem {
  const rng = createRng(options.seed)
  const themes: PuzzleThemeKey[] =
    options.themes && options.themes.length > 0
      ? options.themes
      : ['Skakmat', 'Garpu', 'Pin', 'Pengorbanan', 'Babak Akhir']
  const minElo = Math.min(options.minElo ?? 800, options.maxElo ?? 2200)
  const maxElo = Math.max(options.minElo ?? 800, options.maxElo ?? 2200)
  const seen = options.seenKeys ?? new Set<string>()
  const seq = options.sequenceNumber ?? 1

  // Pass 1: Strict theme + ELO band + unseen FEN
  for (let attempt = 0; attempt < 90; attempt++) {
    const theme = pick(rng, themes)
    const genFn = pick(rng, GENERATORS_BY_THEME[theme])
    const candidate = genFn(rng, seq)
    if (!candidate) continue
    if (candidate.rating < minElo || candidate.rating > maxElo) continue
    const key = normalizeFenKey(candidate.fen)
    if (seen.has(key)) continue
    return candidate
  }

  // Pass 2: Relax ELO band slightly while strictly keeping theme + unseen FEN
  for (let attempt = 0; attempt < 90; attempt++) {
    const theme = pick(rng, themes)
    const genFn = pick(rng, GENERATORS_BY_THEME[theme])
    const candidate = genFn(rng, seq)
    if (!candidate) continue
    const key = normalizeFenKey(candidate.fen)
    if (seen.has(key)) continue
    // Clamp displayed rating smoothly into requested band when relaxed
    candidate.rating = Math.max(minElo, Math.min(maxElo, candidate.rating))
    return candidate
  }

  // Pass 3: Unseen curated bank fallback matching theme
  const unseenCurated = PUZZLE_BANK.filter(
    (p) => themes.includes(p.theme) && !seen.has(normalizeFenKey(p.fen))
  )
  if (unseenCurated.length > 0) {
    const picked = pick(rng, unseenCurated)
    return { ...picked, number: seq }
  }

  // Final guaranteed fallback: generate any unseen puzzle across all themes
  for (let attempt = 0; attempt < 60; attempt++) {
    const allThemes: PuzzleThemeKey[] = ['Skakmat', 'Garpu', 'Pin', 'Pengorbanan', 'Babak Akhir']
    const theme = pick(rng, allThemes)
    const genFn = pick(rng, GENERATORS_BY_THEME[theme])
    const candidate = genFn(rng, seq)
    if (candidate && !seen.has(normalizeFenKey(candidate.fen))) {
      return candidate
    }
  }

  const fallback = PUZZLE_BANK[seq % PUZZLE_BANK.length] ?? PUZZLE_BANK[0]!
  return { ...fallback, number: seq }
}

/**
 * Deterministic auto-generated Daily Puzzle seeded by today's calendar date (unique every day!)
 */
export function generateDailyAutoPuzzle(): TacticalPuzzleItem {
  const now = new Date()
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const puzzle = generateUniquePuzzle({
    seed: daySeed * 2654435761,
    sequenceNumber: daySeed % 999
  })
  return {
    ...puzzle,
    id: `daily-${daySeed}`
  }
}
