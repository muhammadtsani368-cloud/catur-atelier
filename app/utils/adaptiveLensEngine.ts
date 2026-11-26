import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import type { TacticalArrow } from '~/components/TacticalArrowOverlay.vue'
import { buildCustomEngineBot } from '~/utils/botCatalog'
import { computeBotMove, evaluateBoard } from '~/utils/chessBotEngine'

export type AdaptiveLensId = 'apprentice' | 'club' | 'master'

export interface AdaptiveLensPreset {
  id: AdaptiveLensId
  label: string
  badge: string
  shortDesc: string
  detailDesc: string
  showHangingPieces: boolean
  showThreatArrows: boolean
  showTensionSquares: boolean
  showPlanRadar: boolean
  enableBlunderGuard: boolean
  showEvalByDefault: boolean
  maxHintTier: 0 | 2 | 3
}

export const ADAPTIVE_LENS_PRESETS: readonly AdaptiveLensPreset[] = [
  {
    id: 'apprentice',
    label: 'Pemula',
    badge: 'Bahasa Santai',
    shortDesc: 'Bahasa mudah dipahami, penanda bidak rawan, panah aman, dan penjaga blunder.',
    detailDesc:
      'Dirancang ramah untuk pemula tanpa istilah rumit. Menandai bidakmu yang sedang diincar lawan, menampilkan arah langkah aman yang sah, serta memberi pengingat lembut sebelum blunder fatal.',
    showHangingPieces: true,
    showThreatArrows: true,
    showTensionSquares: true,
    showPlanRadar: true,
    enableBlunderGuard: true,
    showEvalByDefault: true,
    maxHintTier: 3
  },
  {
    id: 'club',
    label: 'Menengah',
    badge: 'Klub',
    shortDesc: 'Bahasa taktis seimbang dengan Plan Radar, petak tegang, dan eksplorasi What-If.',
    detailDesc:
      'Melatih perhitungan mandiri tanpa pop-up blunder otomatis, memakai istilah taktis populer (garpu, pin, pusat, lajur terbuka) dan arah rencana jangka menengah.',
    showHangingPieces: false,
    showThreatArrows: false,
    showTensionSquares: true,
    showPlanRadar: true,
    enableBlunderGuard: false,
    showEvalByDefault: false,
    maxHintTier: 2
  },
  {
    id: 'master',
    label: 'Pro',
    badge: 'Mahir',
    shortDesc: 'Papan bersih 100% dengan analisis teknis mendalam (tempo, evaluasi, struktur).',
    detailDesc:
      'Tanpa bantuan visual selama bertanding. Seluruh bedah teknis (selisih evaluasi, inisiatif, profilaksis, struktur pion, dan cabang What-If) hadir lengkap di Ulasan Permainan.',
    showHangingPieces: false,
    showThreatArrows: false,
    showTensionSquares: false,
    showPlanRadar: false,
    enableBlunderGuard: false,
    showEvalByDefault: false,
    maxHintTier: 0
  }
] as const

const PIECE_SCORE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 99
}

export const PIECE_NAME_ID: Record<PieceSymbol, string> = {
  p: 'Pion',
  n: 'Kuda',
  b: 'Gajah',
  r: 'Benteng',
  q: 'Menteri',
  k: 'Raja'
}

export interface PlanRadarSummary {
  focusZone: 'center' | 'kingside' | 'queenside' | 'endgame' | 'safety'
  zoneLabelId: string
  headline: string
  rationale: string
}

export interface AdaptivePlanOption {
  san: string
  from: Square
  to: Square
  piece: PieceSymbol
  styleTag: string
  summaryId: string
}

export interface BoardVisionState {
  lens: AdaptiveLensId
  hangingSquares: string[]
  tensionSquares: string[]
  threatArrows: TacticalArrow[]
  planArrows: TacticalArrow[]
  planOptions: AdaptivePlanOption[]
  legalMoveCount: number
  planSummary: PlanRadarSummary
  showEvalByDefault: boolean
}

export function getLensPreset(lens: AdaptiveLensId): AdaptiveLensPreset {
  return ADAPTIVE_LENS_PRESETS.find((p) => p.id === lens) ?? ADAPTIVE_LENS_PRESETS[0]!
}

/**
 * Safely returns legal moves for `color` on the given position.
 * If it is currently the opposite side's turn, attempts a turn-flipped clone (returns [] if opponent is in check).
 */
function getLegalMovesForColor(game: Chess, color: Color): Move[] {
  if (game.turn() === color) {
    return game.moves({ verbose: true })
  }
  const parts = game.fen().split(' ')
  if (parts.length < 4) return []
  parts[1] = color
  parts[3] = '-' // clear en-passant on turn flip
  try {
    const flipped = new Chess(parts.join(' '))
    return flipped.moves({ verbose: true })
  } catch {
    return []
  }
}

/**
 * Checks whether playing `mv` leaves the moved piece immediately hanging to a lower-value or undefended capture.
 */
function isMoveObviouslyUnsafe(game: Chess, mv: Move): boolean {
  const clone = new Chess(game.fen())
  if (clone.turn() !== mv.color) return false
  try {
    clone.move(mv)
  } catch {
    return true
  }
  if (clone.isCheckmate()) return false
  const enemy: Color = mv.color === 'w' ? 'b' : 'w'
  const enemyCaptures = clone.moves({ verbose: true }).filter((r) => r.to === mv.to && Boolean(r.captured))
  if (enemyCaptures.length === 0) return false

  const movedVal = PIECE_SCORE[mv.promotion ?? mv.piece]
  const defenders = clone.attackers(mv.to, mv.color)
  if (defenders.length === 0) return true

  let minAttackerVal = 99
  for (const cap of enemyCaptures) {
    const v = PIECE_SCORE[cap.piece]
    if (v < minAttackerVal) minAttackerVal = v
  }
  return minAttackerVal < movedVal
}

function isTruePassedPawn(board: ReturnType<Chess['board']>, sq: Square, perspective: Color): boolean {
  const fileIdx = sq.charCodeAt(0) - 97
  const rankIdx = 8 - Number(sq[1]) // 0 = rank 8, 7 = rank 1
  const enemy: Color = perspective === 'w' ? 'b' : 'w'

  for (let r = 0; r < 8; r++) {
    const isAhead = perspective === 'w' ? r < rankIdx : r > rankIdx
    if (!isAhead) continue
    const row = board[r]
    if (!row) continue
    for (let c = Math.max(0, fileIdx - 1); c <= Math.min(7, fileIdx + 1); c++) {
      const cell = row[c]
      if (cell && cell.type === 'p' && cell.color === enemy) {
        return false
      }
    }
  }
  return true
}

function pickBestLegalMove(game: Chess, legal: Move[], filterFn?: (m: Move) => boolean): Move | null {
  const pool = filterFn ? legal.filter(filterFn) : legal
  if (pool.length === 0) return null

  const mover = pool[0]!.color
  const safePool = pool.filter((m) => !isMoveObviouslyUnsafe(game, m))
  const candidates = safePool.length > 0 ? safePool : pool

  let bestMove: Move = candidates[0]!
  let bestScore = -Infinity
  const clone = new Chess(game.fen())

  for (const mv of candidates.slice(0, 18)) {
    if (clone.turn() !== mv.color) return candidates[0]!
    clone.move(mv)
    const evalWhite = evaluateBoard(clone, 0.5, true)
    const evalForMover = mover === 'w' ? evalWhite : -evalWhite
    clone.undo()
    if (evalForMover > bestScore) {
      bestScore = evalForMover
      bestMove = mv
    }
  }
  return bestMove
}

function describePlanOption(mv: Move, isBeginner: boolean): { styleTag: string; summaryId: string } {
  const pieceName = PIECE_NAME_ID[mv.piece]

  if (mv.san === 'O-O' || mv.san === 'O-O-O') {
    return {
      styleTag: 'Rokade Aman',
      summaryId: isBeginner
        ? 'Amankan Raja ke sudut dan langsung aktifkan Benteng.'
        : 'Selesaikan rokade untuk mengamankan Raja dan menghubungkan kedua Benteng.'
    }
  }
  if (mv.san.includes('#')) {
    return {
      styleTag: 'Skakmat!',
      summaryId: `${pieceName} ke ${mv.to} langsung menutup partai dengan skakmat.`
    }
  }
  if (mv.san.includes('+')) {
    return {
      styleTag: 'Inisiatif Skak',
      summaryId: isBeginner
        ? `Serang Raja lawan langsung dengan ${pieceName} ke ${mv.to}.`
        : `Rebut tempo melalui skak aktif ${mv.san} untuk memaksa respons lawan.`
    }
  }
  if (mv.captured) {
    const capName = PIECE_NAME_ID[mv.captured]
    return {
      styleTag: 'Taktis',
      summaryId: isBeginner
        ? `Tangkap ${capName} lawan di ${mv.to} dengan ${pieceName}.`
        : `Konversi tekanan taktis dengan menangkap ${capName} di ${mv.to}.`
    }
  }
  if (mv.piece === 'p') {
    if (mv.to === 'e4' || mv.to === 'e5') {
      return {
        styleTag: 'Pusat Terbuka',
        summaryId: isBeginner
          ? 'Rebut pusat cepat, langsung membuka jalur Menteri dan Gajah.'
          : 'Buka permainan taktis dengan menguasai petak pusat dan ruang diagonal.'
      }
    }
    if (mv.to === 'd4' || mv.to === 'd5') {
      return {
        styleTag: 'Pusat Klasik',
        summaryId: isBeginner
          ? 'Bangun fondasi pion pusat yang kokoh dan terencana.'
          : 'Klaim pusat secara solid untuk rencana strategis jangka menengah.'
      }
    }
    if (mv.to === 'c4' || mv.to === 'c5') {
      return {
        styleTag: 'Sayap Strategis',
        summaryId: isBeginner
          ? 'Serang pusat dari samping agar bentuk permainan makin bervariasi.'
          : 'Tekan pusat secara asimetris dari lajur c dengan rencana dinamis.'
      }
    }
    if (mv.to === 'b3' || mv.to === 'g3' || mv.to === 'b6' || mv.to === 'g6') {
      return {
        styleTag: 'Fianchetto',
        summaryId: isBeginner
          ? 'Siapkan jalur diagonal panjang untuk Gajah mengintai seluruh papan.'
          : 'Bangun struktur fianchetto untuk menekan pusat dari jarak jauh.'
      }
    }
    if (mv.to === 'f4' || mv.to === 'f5') {
      return {
        styleTag: 'Agresif',
        summaryId: isBeginner
          ? 'Langsung menekan sisi Raja lawan dengan gaya menyerang berani.'
          : 'Buka dinamika sayap Raja sejak awal dengan tekanan agresif.'
      }
    }
    return {
      styleTag: 'Struktur Pion',
      summaryId: isBeginner
        ? `Dorong pion ke ${mv.to} untuk membuka ruang gerak bidak lain.`
        : `Perluas ruang dan perbaiki struktur pion lewat ${mv.san}.`
    }
  }
  if (mv.piece === 'n') {
    return {
      styleTag: 'Kuda Fleksibel',
      summaryId: isBeginner
        ? `Keluarkan Kuda ke ${mv.to} untuk membantu mengawal tengah papan.`
        : `Aktifkan Kuda ke ${mv.to} sambil menjaga fleksibilitas rencana pion.`
    }
  }
  if (mv.piece === 'b') {
    return {
      styleTag: 'Diagonal Aktif',
      summaryId: isBeginner
        ? `Arahkan Gajah ke ${mv.to} untuk menguasai garis miring penting.`
        : `Kembangkan Gajah ke ${mv.to} guna menekan diagonal vital lawan.`
    }
  }
  if (mv.piece === 'r') {
    return {
      styleTag: 'Lajur Benteng',
      summaryId: isBeginner
        ? `Geser Benteng ke ${mv.to} supaya jalurnya terbuka ke barisan lawan.`
        : `Optimalkan aktivitas Benteng pada lajur ${mv.to[0]} yang strategis.`
    }
  }
  if (mv.piece === 'q') {
    return {
      styleTag: 'Tekanan Menteri',
      summaryId: isBeginner
        ? `Aktifkan Menteri ke ${mv.to} untuk menekan beberapa petak sekaligus.`
        : `Koordinasikan Menteri ke ${mv.to} untuk meningkatkan tekanan multisektor.`
    }
  }
  return {
    styleTag: 'Raja Aktif',
    summaryId: isBeginner
      ? `Pindahkan Raja ke ${mv.to} agar lebih aman atau siap membantu pion.`
      : `Reposisi Raja ke ${mv.to} demi keamanan maupun aktivitas babak akhir.`
  }
}

/**
 * Dynamically ranks ALL safe legal moves on ANY reachable chess position (10^120 tree)
 * and selects up to `maxCount` strategically diverse branches (never railroading move 1 to Knights only!).
 */
function collectDiversePlanOptions(
  game: Chess,
  legal: Move[],
  perspective: Color,
  isBeginner: boolean,
  variationSeed = 0,
  maxCount = 3,
  priorityFilter?: (m: Move) => boolean
): AdaptivePlanOption[] {
  if (legal.length === 0 || game.turn() !== perspective) return []

  const safeLegal = legal.filter((m) => !isMoveObviouslyUnsafe(game, m))
  const workingPool = safeLegal.length > 0 ? safeLegal : legal

  const clone = new Chess(game.fen())
  const fullMoveNum = game.moveNumber()
  const isEarlyOpening = fullMoveNum <= 3

  const scored = workingPool.map((mv) => {
    clone.move(mv)
    const evalWhite = evaluateBoard(clone, 0.5, true)
    let score = perspective === 'w' ? evalWhite : -evalWhite
    clone.undo()

    if (priorityFilter && priorityFilter(mv)) score += 90
    if (mv.san.includes('#')) score += 5000
    if (mv.san === 'O-O' || mv.san === 'O-O-O') score += 45

    // Give genuine central & flank opening pawn pushes fair, first-class footing on early moves
    if (isEarlyOpening && mv.piece === 'p') {
      if (mv.to === 'e4' || mv.to === 'd4' || mv.to === 'e5' || mv.to === 'd5') score += 42
      else if (mv.to === 'c4' || mv.to === 'c5') score += 34
      else if (mv.to === 'b3' || mv.to === 'g3' || mv.to === 'e6' || mv.to === 'c6' || mv.to === 'g6' || mv.to === 'd6') {
        score += 24
      } else if (mv.to === 'f4' || mv.to === 'f5') {
        score += 18
      }
    }

    return { move: mv, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Keep sound top-tier pool (within 135 cp of best move, or at least top 8 legal moves so variety stays sound)
  const topScore = scored[0]!.score
  const soundBand = scored.filter((item, idx) => idx < 8 && topScore - item.score <= 135)
  const pool = soundBand.length > 0 ? soundBand : scored.slice(0, 6)

  // Apply deterministic rotation when the user clicks "Variasi Lain" (variationSeed > 0)
  const rotated =
    variationSeed > 0 && pool.length > 1
      ? [
          ...pool.slice(variationSeed % pool.length),
          ...pool.slice(0, variationSeed % pool.length)
        ]
      : pool

  const chosen: Move[] = []
  const usedFromSquares = new Set<string>()
  const usedPieceTypes = new Set<PieceSymbol>()

  // Pass 1: Maximize piece-type & origin-square diversity (e.g., e4 Pawn + d4/c4 Pawn + Nf3/Bc4 Piece)
  for (const entry of rotated) {
    if (chosen.length >= maxCount) break
    const mv = entry.move
    if (usedFromSquares.has(mv.from)) continue
    // On opening move 1-2, allow up to 2 different central/flank pawns + 1 piece so pawns & pieces shine together
    const samePieceLimit = mv.piece === 'p' && isEarlyOpening ? 2 : 1
    const samePieceCount = chosen.filter((c) => c.piece === mv.piece).length
    if (samePieceCount >= samePieceLimit && usedPieceTypes.size < 2 && rotated.length >= maxCount) {
      continue
    }
    chosen.push(mv)
    usedFromSquares.add(mv.from)
    usedPieceTypes.add(mv.piece)
  }

  // Pass 2: Fill remaining slots from distinct origin squares if available
  for (const entry of rotated) {
    if (chosen.length >= maxCount) break
    if (chosen.some((c) => c.san === entry.move.san)) continue
    if (usedFromSquares.has(entry.move.from) && rotated.length > maxCount) continue
    chosen.push(entry.move)
    usedFromSquares.add(entry.move.from)
  }

  // Pass 3: Absolute fallback if very few legal pieces exist (e.g., King endgame)
  for (const entry of rotated) {
    if (chosen.length >= maxCount) break
    if (!chosen.some((c) => c.san === entry.move.san)) {
      chosen.push(entry.move)
    }
  }

  return chosen.map((mv) => {
    const desc = describePlanOption(mv, isBeginner)
    return {
      san: mv.san,
      from: mv.from,
      to: mv.to,
      piece: mv.piece,
      styleTag: desc.styleTag,
      summaryId: desc.summaryId
    }
  })
}

function derivePlanRadar(
  game: Chess,
  perspective: Color,
  lens: AdaptiveLensId,
  hangingItems: Array<{ square: Square; attacker: Square; value: number }>,
  variationSeed = 0
): {
  summary: PlanRadarSummary
  options: AdaptivePlanOption[]
  arrows: TacticalArrow[]
} {
  const board = game.board()
  const legal = game.turn() === perspective ? game.moves({ verbose: true }) : []
  let nonPawnMaterial = 0
  let uncastledKingInCenter = false
  let undevelMinors = 0
  const friendlyRooks: Square[] = []
  const friendlyPawnsByFile = new Set<string>()
  const truePassedPawns: Square[] = []

  const homeRank = perspective === 'w' ? '1' : '8'
  const isBeginner = lens === 'apprentice'

  for (let r = 0; r < 8; r++) {
    const row = board[r]
    if (!row) continue
    for (let c = 0; c < 8; c++) {
      const cell = row[c]
      if (!cell) continue
      if (cell.type !== 'p' && cell.type !== 'k') {
        nonPawnMaterial += PIECE_SCORE[cell.type]
      }
      if (cell.color === perspective) {
        if (cell.type === 'k' && (cell.square === 'e1' || cell.square === 'e8')) {
          uncastledKingInCenter = true
        }
        if ((cell.type === 'n' || cell.type === 'b') && cell.square.endsWith(homeRank)) {
          undevelMinors += 1
        }
        if (cell.type === 'r') {
          friendlyRooks.push(cell.square)
        }
        if (cell.type === 'p') {
          friendlyPawnsByFile.add(cell.square[0]!)
          if (isTruePassedPawn(board, cell.square, perspective)) {
            truePassedPawns.push(cell.square)
          }
        }
      }
    }
  }

  const toArrows = (opts: AdaptivePlanOption[]): TacticalArrow[] =>
    opts.map((o) => ({ from: o.from, to: o.to, tone: 'plan' }))

  // Priority 1: In Check (only suggest real legal escapes/blocks/captures!)
  if (game.inCheck() && game.turn() === perspective) {
    const options = collectDiversePlanOptions(game, legal, perspective, isBeginner, variationSeed, 2)
    return {
      summary: {
        focusZone: 'safety',
        zoneLabelId: 'Keselamatan Raja',
        headline: isBeginner
          ? 'Awas! Rajamu sedang di-skak lawan.'
          : 'Rajamu sedang dalam ancaman skak langsung.',
        rationale: isBeginner
          ? 'Kamu wajib menyelamatkan Raja dulu: geser Raja ke petak aman, tutup jalur serang, atau makan bidak yang menyerang.'
          : 'Prioritaskan menangkis skak dengan menutup jalur serang, menangkap perwira penyerang, atau menggeser Raja ke petak aman.'
      },
      options,
      arrows: toArrows(options.slice(0, 2))
    }
  }

  // Priority 2: Save a genuinely hanging friendly piece
  if (hangingItems.length > 0 && game.turn() === perspective) {
    const urgent = hangingItems[0]!
    const urgentPiece = game.get(urgent.square)
    const urgentName = urgentPiece ? PIECE_NAME_ID[urgentPiece.type] : 'Bidak'
    const options = collectDiversePlanOptions(
      game,
      legal,
      perspective,
      isBeginner,
      variationSeed,
      2,
      (m) => m.from === urgent.square || m.to === urgent.attacker
    )
    return {
      summary: {
        focusZone: 'safety',
        zoneLabelId: isBeginner ? 'Selamatkan Bidak' : 'Pertahanan Taktis',
        headline: isBeginner
          ? `${urgentName} di ${urgent.square} sedang diincar lawan!`
          : `${urgentName} di ${urgent.square} berada dalam tekanan langsung.`,
        rationale: isBeginner
          ? `Sebelum menyerang, pindahkan ${urgentName} di ${urgent.square} ke petak yang aman atau lindungi dengan bidak lain.`
          : `Amankan ${urgentName} di ${urgent.square}, tutup jalur serang, atau cari serangan balik yang lebih kuat.`
      },
      options,
      arrows: toArrows(options.slice(0, 2))
    }
  }

  // Priority 3: Endgame — diverse legal passed-pawn, King activity, and piece plans
  if (nonPawnMaterial <= 14) {
    const options = collectDiversePlanOptions(
      game,
      legal,
      perspective,
      isBeginner,
      variationSeed,
      3,
      (m) => (m.piece === 'p' && truePassedPawns.includes(m.from)) || m.piece === 'k'
    )
    return {
      summary: {
        focusZone: 'endgame',
        zoneLabelId: isBeginner ? 'Babak Akhir' : 'Transisi Babak Akhir',
        headline: isBeginner
          ? 'Ajak Raja maju ke tengah dan kawal pion sampai jadi Menteri.'
          : 'Aktifkan Raja ke pusat dan kawal laju pion bebas.',
        rationale: isBeginner
          ? 'Saat bidak tinggal sedikit, Raja tidak perlu bersembunyi lagi. Gunakan Raja untuk membantu pion maju atau memakan pion lawan.'
          : 'Di babak akhir, Raja berubah menjadi perwira tempur aktif. Dekatkan Raja ke pusat papan untuk mengawal promosi pion.'
      },
      options,
      arrows: toArrows(options)
    }
  }

  // Priority 4: Opening freedom & development (NEVER locks move 1 to Knights only!)
  if (undevelMinors >= 2 || uncastledKingInCenter) {
    const centerTargets = perspective === 'w' ? ['e4', 'd4', 'c4'] : ['e5', 'd5', 'c5']
    const options = collectDiversePlanOptions(
      game,
      legal,
      perspective,
      isBeginner,
      variationSeed,
      3,
      (m) =>
        m.san === 'O-O' ||
        m.san === 'O-O-O' ||
        centerTargets.includes(m.to) ||
        ((m.piece === 'n' || m.piece === 'b') && m.from.endsWith(homeRank))
    )

    return {
      summary: {
        focusZone: 'center',
        zoneLabelId: isBeginner ? 'Pilihan Pembukaan Bebas' : 'Ragam Jalur Pembukaan',
        headline: isBeginner
          ? 'Banyak cara bagus untuk memulai: dorong pion pusat, buka sayap, atau keluarkan perwira.'
          : 'Bebas memilih gaya permainan: pusat terbuka, struktur klasik, sayap, atau pengembangan fleksibel.',
        rationale: isBeginner
          ? 'Tidak harus selalu mulai dari Kuda! Pilih panah mana saja yang cocok dengan gayamu, atau klik Variasi Lain untuk melihat ide baru.'
          : 'Setiap posisi membuka banyak cabang sah. Bandingkan variasi pion pusat, sayap, dan pengembangan perwira sesuai rencana yang kamu inginkan.'
      },
      options,
      arrows: toArrows(options)
    }
  }

  // Priority 5: Open-file Rook & multi-sector middlegame plans
  const files = ['c', 'd', 'e', 'f']
  const openFile = files.find((f) => !friendlyPawnsByFile.has(f))
  if (openFile && friendlyRooks.length > 0) {
    const options = collectDiversePlanOptions(
      game,
      legal,
      perspective,
      isBeginner,
      variationSeed,
      3,
      (m) => m.piece === 'r' && m.to.startsWith(openFile) && !m.from.startsWith(openFile)
    )
    if (options.length > 0) {
      return {
        summary: {
          focusZone: openFile === 'c' ? 'queenside' : 'center',
          zoneLabelId: isBeginner
            ? `Jalur Terbuka ${openFile.toUpperCase()}`
            : `Kontrol Lajur ${openFile.toUpperCase()}`,
          headline: isBeginner
            ? `Kamu bisa menggeser Benteng ke jalur ${openFile.toUpperCase()} atau memilih rencana lain di papan.`
            : `Pertimbangkan Benteng ke lajur ${openFile} terbuka bersama alternatif taktis dan manuver perwira.`,
          rationale: isBeginner
            ? 'Benteng paling kuat saat berdiri di jalur lurus yang tidak terhalang pion sendiri, namun tetap bebas berkreasi sesuai peluang.'
            : 'Gabungkan kendali lajur terbuka dengan manuver perwira atau dobrakan pion untuk menciptakan tekanan ganda.'
        },
        options,
        arrows: toArrows(options)
      }
    }
  }

  // Fallback: Rich multi-branch middlegame/maneuvering options
  const options = collectDiversePlanOptions(game, legal, perspective, isBeginner, variationSeed, 3)
  return {
    summary: {
      focusZone: 'kingside',
      zoneLabelId: isBeginner ? 'Ragam Rencana' : 'Koordinasi & Manuver',
      headline: isBeginner
        ? 'Pilih satu dari beberapa rencana aman di papan sesuai gaya mainmu.'
        : 'Bandingkan beberapa cabang strategis: perbaiki perwira pasif, tekan pusat, atau siapkan dobrakan pion.',
      rationale: isBeginner
        ? 'Setiap langkah sah membuka alur baru. Klik Variasi Lain kapan saja jika ingin melihat pilihan kombinasi yang berbeda.'
        : 'Ketika posisi seimbang, kamu bebas memilih jalur manuver posisional atau memicu komplikasi taktis sesuai preferensi.'
    },
    options,
    arrows: toArrows(options)
  }
}

export function analyzeBoardVision(
  fen: string,
  perspectiveColor: Color,
  lens: AdaptiveLensId,
  variationSeed = 0
): BoardVisionState {
  const preset = getLensPreset(lens)
  let game: Chess
  try {
    game = new Chess(fen)
  } catch {
    game = new Chess()
  }

  const legalTurnMoves =
    game.turn() === perspectiveColor ? game.moves({ verbose: true }) : []

  if (lens === 'master') {
    return {
      lens,
      hangingSquares: [],
      tensionSquares: [],
      threatArrows: [],
      planArrows: [],
      planOptions: [],
      legalMoveCount: legalTurnMoves.length,
      planSummary: {
        focusZone: 'center',
        zoneLabelId: 'Mode Pro',
        headline: 'Papan bersih aktif untuk fokus kalkulasi mandiri.',
        rationale: 'Evaluasi mendalam tersedia pada panel Ulasan Permainan usai pertandingan.'
      },
      showEvalByDefault: false
    }
  }

  const enemyColor: Color = perspectiveColor === 'w' ? 'b' : 'w'
  const board = game.board()

  // Build map of REAL LEGAL captures by enemy (excludes pinned enemy pieces that cannot legally capture!)
  const enemyLegalCaptures = getLegalMovesForColor(game, enemyColor).filter((m) => Boolean(m.captured))
  const enemyLegalCaptureMap = new Map<Square, Move[]>()
  for (const cap of enemyLegalCaptures) {
    const arr = enemyLegalCaptureMap.get(cap.to) ?? []
    arr.push(cap)
    enemyLegalCaptureMap.set(cap.to, arr)
  }

  const friendlyLegalCaptures = getLegalMovesForColor(game, perspectiveColor).filter((m) =>
    Boolean(m.captured)
  )
  const friendlyLegalTargets = new Set<Square>(friendlyLegalCaptures.map((m) => m.to))

  const hangingItems: Array<{ square: Square; attacker: Square; value: number }> = []
  const tensionSet = new Set<string>()

  for (let r = 0; r < 8; r++) {
    const row = board[r]
    if (!row) continue
    for (let c = 0; c < 8; c++) {
      const cell = row[c]
      if (!cell || cell.type === 'k') continue

      const sq = cell.square
      const pieceVal = PIECE_SCORE[cell.type]

      if (cell.color === perspectiveColor) {
        const legalThreats = enemyLegalCaptureMap.get(sq) ?? []
        const rawAttackers = game.attackers(sq, enemyColor)
        if (legalThreats.length === 0 && rawAttackers.length === 0) continue

        // Prefer legally verified attacker square; fall back to rawAttackers only if turn flip failed due to check
        const effectiveAttackers: Square[] =
          legalThreats.length > 0 ? legalThreats.map((m) => m.from) : rawAttackers

        const defenders = game.attackers(sq, perspectiveColor)
        let minAttackerVal = 99
        let minAttackerSq: Square = effectiveAttackers[0]!

        for (const attSq of effectiveAttackers) {
          const attPiece = game.get(attSq)
          if (!attPiece) continue
          const v = PIECE_SCORE[attPiece.type]
          if (v < minAttackerVal) {
            minAttackerVal = v
            minAttackerSq = attSq
          }
        }

        const isUndefended = defenders.length === 0
        const isAttackedByCheaper = minAttackerVal < pieceVal
        const isOutnumberedMinorOrMajor =
          pieceVal >= 3 && effectiveAttackers.length > defenders.length && minAttackerVal <= pieceVal

        if (isUndefended || isAttackedByCheaper || isOutnumberedMinorOrMajor) {
          hangingItems.push({ square: sq, attacker: minAttackerSq, value: pieceVal })
        }

        if (defenders.length > 0 && minAttackerVal <= pieceVal) {
          tensionSet.add(sq)
        }
      } else {
        // Enemy piece attacked legally by us
        if (friendlyLegalTargets.has(sq)) {
          const enemyDefenders = game.attackers(sq, enemyColor)
          if (enemyDefenders.length === 0 || pieceVal >= 1) {
            tensionSet.add(sq)
          }
        }
      }
    }
  }

  hangingItems.sort((a, b) => b.value - a.value)

  const hangingSquares: string[] = preset.showHangingPieces ? hangingItems.map((h) => h.square) : []
  const threatArrows: TacticalArrow[] = preset.showThreatArrows
    ? hangingItems.slice(0, 3).map((h) => ({
        from: h.attacker,
        to: h.square,
        tone: 'threat'
      }))
    : []

  const tensionSquares = preset.showTensionSquares
    ? Array.from(tensionSet)
        .filter((sq) => !hangingSquares.includes(sq))
        .slice(0, 6)
    : []

  const plan = derivePlanRadar(game, perspectiveColor, lens, hangingItems, variationSeed)

  // Final ironclad guard: filter planArrows & planOptions to guarantee EVERY suggestion is 100% legal
  const validatedPlanOptions = preset.showPlanRadar
    ? plan.options.filter((opt) =>
        legalTurnMoves.some((m) => m.from === opt.from && m.to === opt.to && m.san === opt.san)
      )
    : []
  const validatedPlanArrows = preset.showPlanRadar
    ? plan.arrows.filter((arrow) =>
        legalTurnMoves.some((m) => m.from === arrow.from && m.to === arrow.to)
      )
    : []

  return {
    lens,
    hangingSquares,
    tensionSquares,
    threatArrows,
    planArrows: validatedPlanArrows,
    planOptions: validatedPlanOptions,
    legalMoveCount: legalTurnMoves.length,
    planSummary: plan.summary,
    showEvalByDefault: preset.showEvalByDefault
  }
}

export interface TieredHintResult {
  tier: 1 | 2 | 3
  hintFrom: string | null
  hintTo: string | null
  bestSan: string
  headline: string
  message: string
}

export function computeTieredHint(
  fen: string,
  tier: 1 | 2 | 3,
  lens: AdaptiveLensId = 'apprentice',
  variationSeed = 0
): TieredHintResult {
  let game: Chess
  try {
    game = new Chess(fen)
  } catch {
    game = new Chess()
  }

  let move: Move | null = null
  const legal = game.moves({ verbose: true })
  // On untouched move 1, rotate among top classical openings (e4, d4, c4, Nf3) instead of rigidly forcing Knight
  if (game.moveNumber() === 1 && game.turn() === 'w' && legal.length === 20) {
    const classicalFirst = ['e4', 'd4', 'c4', 'Nf3']
    const preferredSan = classicalFirst[Math.abs(variationSeed) % classicalFirst.length]!
    move = legal.find((m) => m.san === preferredSan) ?? null
  }
  if (!move) {
    const coachProfile = buildCustomEngineBot(2500)
    const result = computeBotMove(fen, { ...coachProfile, timeBudgetMs: 180, randomness: 0 }, [])
    move = result.move
  }

  if (!move) {
    return {
      tier,
      hintFrom: null,
      hintTo: null,
      bestSan: '',
      headline: 'Tidak Ada Langkah Tersedia',
      message: 'Permainan pada posisi ini sudah berakhir.'
    }
  }

  const pieceLabel = PIECE_NAME_ID[move.piece]
  const isCapture = Boolean(move.captured)
  const isCheck = move.san.includes('+') || move.san.includes('#')
  const isCastle = move.san === 'O-O' || move.san === 'O-O-O'
  const isBeginner = lens === 'apprentice'

  if (tier === 1) {
    let socraticClue = isBeginner
      ? 'Coba lihat bidakmu yang masih diam di belakang, lalu arahkan ke petak aman di tengah papan.'
      : 'Coba cari perwira milikmu yang paling pasif dan arahkan ke petak pusat.'
    if (game.inCheck()) {
      socraticClue = isBeginner
        ? 'Rajamu sedang di-skak! Coba cek apakah bidak yang menyerang bisa dimakan, ditutup jalannya, atau Rajamu digeser.'
        : 'Rajamu sedang diserang. Periksa apakah penyerang bisa ditangkap atau jalurnya bisa ditutup.'
    } else if (isCheck && isCapture) {
      socraticClue = isBeginner
        ? 'Ada kesempatan bagus! Kamu bisa memakan bidak lawan sambil langsung memberi skak ke Rajanya.'
        : 'Ada peluang taktis memukul perwira lawan sekaligus memberikan skak. Amati petak di sekitar Raja lawan.'
    } else if (isCapture) {
      const targetName = move.captured ? PIECE_NAME_ID[move.captured] : 'bidak'
      socraticClue = isBeginner
        ? `Coba lihat ${targetName} lawan yang kurang dijaga. Kamu punya peluang memakannya!`
        : `Perhatikan ${targetName} lawan yang posisinya rentan atau kurang penjagaan.`
    } else if (isCastle) {
      socraticClue = isBeginner
        ? 'Jalur antara Raja dan Benteng sudah kosong. Yuk lakukan rokade supaya Rajamu jauh lebih aman!'
        : 'Jalur antara Raja dan Benteng sudah bersih. Saat yang tepat mengamankan Raja sekaligus mengaktifkan Benteng.'
    } else if (move.to === 'd4' || move.to === 'e4' || move.to === 'd5' || move.to === 'e5') {
      socraticClue = isBeginner
        ? 'Tengah papan sangat penting! Langkah mana yang membuat bidakmu menguasai petak tengah?'
        : 'Lihat empat petak pusat papan: langkah mana yang langsung memperkuat kendalimu di sana?'
    }

    return {
      tier: 1,
      hintFrom: null,
      hintTo: null,
      bestSan: move.san,
      headline: isBeginner ? 'Petunjuk 1: Arah Pikiran' : 'Petunjuk Tahap 1: Pertanyaan Sokratik',
      message: socraticClue
    }
  }

  if (tier === 2) {
    return {
      tier: 2,
      hintFrom: move.from,
      hintTo: null,
      bestSan: move.san,
      headline: isBeginner
        ? `Petunjuk 2: Perhatikan ${pieceLabel} di ${move.from}`
        : `Petunjuk Tahap 2: Fokus pada ${pieceLabel}`,
      message: isBeginner
        ? `Coba gerakkan ${pieceLabel} milikmu yang ada di petak ${move.from}. Menurutmu petak tujuan mana yang paling aman dan berguna?`
        : `Perhatikan ${pieceLabel} di petak ${move.from}. Ke petak mana ia bisa berpindah untuk memberi dampak terbesar?`
    }
  }

  let reason = isBeginner
    ? `memindahkan ${pieceLabel} ke petak ${move.to} yang lebih aktif dan aman.`
    : `mengaktifkan ${pieceLabel} ke petak strategis ${move.to}.`
  if (isCastle) {
    reason = isBeginner
      ? 'melakukan rokade agar Raja berlindung di balik pion dan Benteng bisa ikut bermain.'
      : 'mengamankan Raja lewat rokade dan menghubungkan kedua Benteng.'
  } else if (isCapture && move.captured) {
    reason = isBeginner
      ? `memakan ${PIECE_NAME_ID[move.captured]} lawan di ${move.to} untuk menambah keunggulan bidakmu.`
      : `merebut ${PIECE_NAME_ID[move.captured]} di ${move.to} dan memperbaiki keseimbangan materi.`
  } else if (isCheck) {
    reason = isBeginner
      ? `memberikan skak dari ${move.to} sehingga lawan terpaksa bertahan dulu.`
      : `melancarkan skak dari ${move.to} untuk merebut tempo permainan.`
  }

  return {
    tier: 3,
    hintFrom: move.from,
    hintTo: move.to,
    bestSan: move.san,
    headline: isBeginner
      ? `Petunjuk 3: Coba ${pieceLabel} ke ${move.to} (${move.san})`
      : `Petunjuk Tahap 3: Mainkan ${move.san}`,
    message: isBeginner
      ? `Saran terbaik: pindahkan ${pieceLabel} dari ${move.from} ke ${move.to} (${move.san}), tujuannya ${reason}`
      : `Langkah terkuat adalah ${move.san} (${move.from} ke ${move.to}), bertujuan ${reason}`
  }
}

export interface MoveRiskAssessment {
  shouldWarn: boolean
  severity: 'safe' | 'inaccuracy' | 'blunder'
  attemptedSan: string
  evalDropPawns: number
  opponentPunishmentSan: string
  punishmentFrom: string | null
  punishmentTo: string | null
  warningTitle: string
  socraticPrompt: string
}

export function evaluateMoveRisk(
  beforeFen: string,
  movePayload: { from: Square; to: Square; promotion?: PieceSymbol },
  lens: AdaptiveLensId
): MoveRiskAssessment {
  const emptySafe: MoveRiskAssessment = {
    shouldWarn: false,
    severity: 'safe',
    attemptedSan: '',
    evalDropPawns: 0,
    opponentPunishmentSan: '',
    punishmentFrom: null,
    punishmentTo: null,
    warningTitle: '',
    socraticPrompt: ''
  }

  const preset = getLensPreset(lens)
  if (!preset.enableBlunderGuard) {
    return emptySafe
  }

  let game: Chess
  try {
    game = new Chess(beforeFen)
  } catch {
    return emptySafe
  }

  const moverColor = game.turn()
  const evalBeforeWhite = evaluateBoard(game, 0.5, true) / 100

  let played
  try {
    played = game.move({
      from: movePayload.from,
      to: movePayload.to,
      promotion: movePayload.promotion ?? 'q'
    })
  } catch {
    return emptySafe
  }

  // If the move delivers checkmate, it's never a blunder!
  if (game.isCheckmate()) {
    return emptySafe
  }

  const guardProfile = buildCustomEngineBot(2250)
  const reply = computeBotMove(
    game.fen(),
    { ...guardProfile, maxDepth: 3, timeBudgetMs: 110, randomness: 0, blunderRate: 0 },
    []
  )

  const evalAfterWhite = reply.evaluation
  const evalDropForMover =
    moverColor === 'w' ? evalBeforeWhite - evalAfterWhite : evalAfterWhite - evalBeforeWhite

  const alreadyHopeless =
    (moverColor === 'w' && evalBeforeWhite < -6.0) ||
    (moverColor === 'b' && evalBeforeWhite > 6.0)

  if (alreadyHopeless || evalDropForMover < 2.4 || !reply.move) {
    return {
      ...emptySafe,
      attemptedSan: played.san,
      evalDropPawns: Math.max(0, Math.round(evalDropForMover * 10) / 10)
    }
  }

  const replyMove = reply.move
  const movedLabel = PIECE_NAME_ID[played.piece]
  const replyPieceLabel = PIECE_NAME_ID[replyMove.piece]
  let socraticPrompt = `Hati-hati! Jika kamu memindahkan ${movedLabel} ke ${played.to} (${played.san}), lawan bisa langsung membalas dengan ${replyPieceLabel} dari ${replyMove.from} ke ${replyMove.to} (${replyMove.san}).`
  if (replyMove.san.includes('#')) {
    socraticPrompt = `Tunggu dulu! Langkah ${played.san} membuat Rajamu langsung kena skakmat oleh ${replyMove.san}. Yuk cari langkah untuk melindungi Raja terlebih dahulu.`
  } else if (replyMove.captured) {
    const lostPiece = PIECE_NAME_ID[replyMove.captured]
    socraticPrompt = `Tunggu sebentar! Kalau kamu main ${played.san}, ${lostPiece} milikmu di ${replyMove.to} bisa langsung dimakan lawan pakai ${replyPieceLabel} (${replyMove.san}).`
  }

  return {
    shouldWarn: true,
    severity: 'blunder',
    attemptedSan: played.san,
    evalDropPawns: Math.round(evalDropForMover * 10) / 10,
    opponentPunishmentSan: replyMove.san,
    punishmentFrom: replyMove.from,
    punishmentTo: replyMove.to,
    warningTitle: `Tahan Dulu: ${played.san} Berisiko!`,
    socraticPrompt
  }
}
