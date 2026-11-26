import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import type { TacticalArrow } from '~/components/TacticalArrowOverlay.vue'
import { PIECE_NAME_ID, type AdaptiveLensId } from '~/utils/adaptiveLensEngine'
import { buildCustomEngineBot } from '~/utils/botCatalog'
import { computeBotMove, evaluateBoard } from '~/utils/chessBotEngine'

export type WhatIfVerdictTone = 'strong' | 'playable' | 'risky' | 'refuted'

export interface WhatIfBranchMove {
  plyOffset: number
  san: string
  from: string
  to: string
  fen: string
  color: Color
  byCoachReply: boolean
}

export interface PendingOpponentReply {
  san: string
  from: Square
  to: Square
  promotion?: PieceSymbol
}

export interface WhatIfSessionState {
  originFen: string
  originLabel: string
  originalMoveSan: string | null
  currentFen: string
  moverPerspective: Color
  originEvalWhite: number
  currentEvalWhite: number
  branchMoves: WhatIfBranchMove[]
  pendingOpponentReply: PendingOpponentReply | null
  verdictTone: WhatIfVerdictTone | null
  verdictBadge: string
  coachSummaryId: string
  refutationArrow: TacticalArrow | null
  planArrow: TacticalArrow | null
}

export interface WhatIfStepOutcome {
  valid: boolean
  errorMessage?: string
  verdictTone: WhatIfVerdictTone
  verdictBadge: string
  coachSummaryId: string
  opponentReplySan: string | null
  refutationArrow: TacticalArrow | null
  planArrow: TacticalArrow | null
  nextSession: WhatIfSessionState
}

export function createWhatIfSession(
  originFen: string,
  originLabel: string,
  originalMoveSan?: string | null,
  lens: AdaptiveLensId = 'apprentice'
): WhatIfSessionState {
  let game: Chess
  try {
    game = new Chess(originFen)
  } catch {
    game = new Chess()
  }

  const originEvalWhite = Math.round((evaluateBoard(game, 0.5, true) / 100) * 10) / 10
  const introCopy =
    lens === 'apprentice'
      ? 'Pilih salah satu tombol langkah di bawah atau langsung geser bidakmu di papan untuk melihat bagaimana lawan akan membalas.'
      : 'Pilih salah satu kandidat langkah di bawah atau gerakkan bidak langsung di papan untuk menguji skenario alternatif.'

  return {
    originFen: game.fen(),
    originLabel,
    originalMoveSan: originalMoveSan ?? null,
    currentFen: game.fen(),
    moverPerspective: game.turn(),
    originEvalWhite,
    currentEvalWhite: originEvalWhite,
    branchMoves: [],
    pendingOpponentReply: null,
    verdictTone: null,
    verdictBadge: 'Siap Uji Coba',
    coachSummaryId: introCopy,
    refutationArrow: null,
    planArrow: null
  }
}

export function stepWhatIfMove(
  session: WhatIfSessionState,
  moveInput: string | { from: Square; to: Square; promotion?: PieceSymbol },
  lens: AdaptiveLensId = 'apprentice'
): WhatIfStepOutcome {
  const isBeginner = lens === 'apprentice'
  let game: Chess
  try {
    game = new Chess(session.currentFen)
  } catch {
    return {
      valid: false,
      errorMessage: 'Posisi awal simulasi tidak valid.',
      verdictTone: 'risky',
      verdictBadge: 'Langkah Tidak Sah',
      coachSummaryId: 'Posisi papan tidak dapat dimuat.',
      opponentReplySan: null,
      refutationArrow: null,
      planArrow: null,
      nextSession: session
    }
  }

  const moverColor = game.turn()
  if (moverColor !== session.moverPerspective) {
    return {
      valid: false,
      errorMessage: 'Sekarang giliran lawan membalas. Tunggu atau klik "Jalankan Balasan Lawan" terlebih dahulu.',
      verdictTone: session.verdictTone ?? 'playable',
      verdictBadge: 'Menunggu Balasan Lawan',
      coachSummaryId: 'Lawan belum menjalankan balasannya pada posisi ini.',
      opponentReplySan: null,
      refutationArrow: session.refutationArrow,
      planArrow: session.planArrow,
      nextSession: session
    }
  }
  const beforeStepEvalWhite = Math.round((evaluateBoard(game, 0.5, true) / 100) * 10) / 10

  let played
  try {
    if (typeof moveInput === 'string') {
      played = game.move(moveInput)
    } else {
      played = game.move({
        from: moveInput.from,
        to: moveInput.to,
        promotion: moveInput.promotion ?? 'q'
      })
    }
  } catch {
    return {
      valid: false,
      errorMessage: isBeginner
        ? 'Bidak itu tidak bisa berjalan ke petak tersebut menurut aturan catur.'
        : 'Langkah tersebut tidak sah menurut aturan catur pada posisi ini.',
      verdictTone: 'risky',
      verdictBadge: 'Langkah Tidak Sah',
      coachSummaryId: 'Coba pilih petak tujuan yang sah untuk bidak tersebut.',
      opponentReplySan: null,
      refutationArrow: null,
      planArrow: null,
      nextSession: session
    }
  }

  const nextFen = game.fen()
  const newBranchMove: WhatIfBranchMove = {
    plyOffset: session.branchMoves.length + 1,
    san: played.san,
    from: played.from,
    to: played.to,
    fen: nextFen,
    color: moverColor,
    byCoachReply: false
  }

  if (game.isCheckmate()) {
    const winEval = moverColor === 'w' ? 99 : -99
    const nextSession: WhatIfSessionState = {
      ...session,
      currentFen: nextFen,
      currentEvalWhite: winEval,
      branchMoves: [...session.branchMoves, newBranchMove],
      pendingOpponentReply: null,
      verdictTone: 'strong',
      verdictBadge: 'Skakmat Paksa!',
      coachSummaryId: isBeginner
        ? `Hebat sekali! Langkah ${played.san} langsung mengunci kemenangan lewat skakmat tanpa jalan keluar!`
        : `Luar biasa! Langkah ${played.san} langsung mengunci kemenangan lewat skakmat tanpa memberi ruang pelarian bagi Raja lawan.`,
      refutationArrow: null,
      planArrow: { from: played.from, to: played.to, tone: 'plan' }
    }
    return {
      valid: true,
      verdictTone: 'strong',
      verdictBadge: nextSession.verdictBadge,
      coachSummaryId: nextSession.coachSummaryId,
      opponentReplySan: null,
      refutationArrow: null,
      planArrow: nextSession.planArrow,
      nextSession
    }
  }

  const coachBot = buildCustomEngineBot(2400)
  const replyResult = computeBotMove(
    nextFen,
    { ...coachBot, maxDepth: 3, timeBudgetMs: 130, randomness: 0, blunderRate: 0 },
    []
  )

  const afterEvalWhite = replyResult.evaluation
  const deltaForMover =
    moverColor === 'w' ? afterEvalWhite - beforeStepEvalWhite : beforeStepEvalWhite - afterEvalWhite

  let verdictTone: WhatIfVerdictTone = 'playable'
  let verdictBadge = isBeginner ? 'Cukup Bagus' : 'Layak Dimainkan'
  if (deltaForMover >= -0.25) {
    verdictTone = 'strong'
    verdictBadge = isBeginner ? 'Pilihan Bagus!' : 'Rencana Kuat'
  } else if (deltaForMover >= -0.95) {
    verdictTone = 'playable'
    verdictBadge = isBeginner ? 'Masih Aman' : 'Cukup Solid'
  } else if (deltaForMover >= -2.1) {
    verdictTone = 'risky'
    verdictBadge = isBeginner ? 'Agak Berbahaya' : 'Agak Berisiko'
  } else {
    verdictTone = 'refuted'
    verdictBadge = isBeginner ? 'Bisa Dihukum Lawan' : 'Terbantahkan Lawan'
  }

  const replyMove = replyResult.move
  let refutationArrow: TacticalArrow | null = null
  const planArrow: TacticalArrow = { from: played.from, to: played.to, tone: 'plan' }
  let coachSummaryId = isBeginner
    ? `Langkah ${played.san} cukup aman dan menjaga posisimu tetap rapi.`
    : `Langkah ${played.san} menjaga struktur permainan tetap terkendali.`

  if (replyMove) {
    const replyPieceName = PIECE_NAME_ID[replyMove.piece]
    if (verdictTone === 'refuted' || verdictTone === 'risky') {
      refutationArrow = {
        from: replyMove.from,
        to: replyMove.to,
        tone: 'threat'
      }

      if (replyMove.san.includes('#')) {
        coachSummaryId = `Hati-hati, ${played.san} justru membuka jalan bagi lawan untuk skakmat langsung lewat ${replyMove.san}.`
      } else if (replyMove.captured) {
        const lostPiece = PIECE_NAME_ID[replyMove.captured]
        coachSummaryId = isBeginner
          ? `Kalau kamu main ${played.san}, lawan bisa langsung memakan ${lostPiece} milikmu di ${replyMove.to} pakai ${replyPieceName} (${replyMove.san}).`
          : `Jika kamu memainkan ${played.san}, lawan memiliki bantahan tajam ${replyMove.san} yang langsung memukul ${lostPiece} di petak ${replyMove.to}.`
      } else if (replyMove.san.includes('+')) {
        coachSummaryId = isBeginner
          ? `Setelah ${played.san}, lawan bisa langsung memberi skak pakai ${replyPieceName} (${replyMove.san}) dari ${replyMove.from} ke ${replyMove.to}.`
          : `Setelah ${played.san}, lawan dapat merebut inisiatif lewat skak ${replyMove.san} dari petak ${replyMove.from} ke ${replyMove.to}.`
      } else {
        coachSummaryId = isBeginner
          ? `Langkah ${played.san} memberi ruang bagi lawan untuk menekan dengan ${replyMove.san} (${replyPieceName} ke ${replyMove.to}).`
          : `Langkah ${played.san} memberi lawan kesempatan menekan lewat ${replyMove.san} (${replyMove.from} ke ${replyMove.to}) dan mengambil alih kendali ruang.`
      }
    } else {
      const compareNote =
        session.originalMoveSan && session.originalMoveSan !== played.san && session.branchMoves.length === 0
          ? isBeginner
            ? ` Dibandingkan langkah aslimu (${session.originalMoveSan}), ini jauh lebih aman.`
            : ` Dibandingkan langkah asli (${session.originalMoveSan}), pilihan ini jauh lebih sehat bagi koordinasi perwiramu.`
          : ''
      coachSummaryId = isBeginner
        ? `Pilihan bagus (${played.san})! Balasan terbaik lawan adalah ${replyMove.san}, dan bidakmu tetap aman.${compareNote}`
        : `Langkah ${played.san} solid! Respons terbaik lawan adalah ${replyMove.san}, dan posisimu tetap harmonis tanpa kelemahan taktis.${compareNote}`
    }
  }

  const pendingOpponentReply: PendingOpponentReply | null = replyMove
    ? {
        san: replyMove.san,
        from: replyMove.from,
        to: replyMove.to,
        promotion: replyMove.promotion
      }
    : null

  const nextSession: WhatIfSessionState = {
    ...session,
    currentFen: nextFen,
    currentEvalWhite: afterEvalWhite,
    branchMoves: [...session.branchMoves, newBranchMove],
    pendingOpponentReply,
    verdictTone,
    verdictBadge,
    coachSummaryId,
    refutationArrow,
    planArrow
  }

  return {
    valid: true,
    verdictTone,
    verdictBadge,
    coachSummaryId,
    opponentReplySan: replyMove?.san ?? null,
    refutationArrow,
    planArrow,
    nextSession
  }
}

export function applyOpponentReplyInWhatIf(
  session: WhatIfSessionState,
  lens: AdaptiveLensId = 'apprentice'
): WhatIfSessionState {
  if (!session.pendingOpponentReply) return session

  let game: Chess
  try {
    game = new Chess(session.currentFen)
  } catch {
    return session
  }

  const replyColor = game.turn()
  // Never allow opponent reply to move the human player's own pieces!
  if (replyColor === session.moverPerspective) {
    return {
      ...session,
      pendingOpponentReply: null
    }
  }
  let played
  try {
    played = game.move({
      from: session.pendingOpponentReply.from,
      to: session.pendingOpponentReply.to,
      promotion: session.pendingOpponentReply.promotion ?? 'q'
    })
  } catch {
    return session
  }

  const nextFen = game.fen()
  const replyBranch: WhatIfBranchMove = {
    plyOffset: session.branchMoves.length + 1,
    san: played.san,
    from: played.from,
    to: played.to,
    fen: nextFen,
    color: replyColor,
    byCoachReply: true
  }

  const replyPiece = PIECE_NAME_ID[played.piece]
  const summary =
    lens === 'apprentice'
      ? `Lawan membalas dengan ${played.san} (${replyPiece} ke ${played.to}). Sekarang giliranmu lagi: pilih langkah berikutnya di bawah atau geser bidak di papan.`
      : `Lawan merespons dengan ${played.san}. Sekarang giliranmu: lanjutkan uji langkah berikutnya di papan atau kembali ke langkah awal.`

  return {
    ...session,
    currentFen: nextFen,
    branchMoves: [...session.branchMoves, replyBranch],
    pendingOpponentReply: null,
    coachSummaryId: summary,
    refutationArrow: null,
    planArrow: { from: played.from, to: played.to, tone: 'threat' }
  }
}

export function rewindWhatIfPly(
  session: WhatIfSessionState,
  lens: AdaptiveLensId = 'apprentice'
): WhatIfSessionState {
  if (session.branchMoves.length === 0) return session

  // Always rewind back to the human player's own turn (`session.moverPerspective`)!
  // If the last move was the opponent's reply (`byCoachReply`), step back 2 plies (opponent reply + user move).
  const lastMove = session.branchMoves[session.branchMoves.length - 1]
  const stepsBack = lastMove?.byCoachReply ? 2 : 1
  const nextLength = session.branchMoves.length - stepsBack

  if (nextLength <= 0) {
    return createWhatIfSession(session.originFen, session.originLabel, session.originalMoveSan, lens)
  }

  const trimmed = session.branchMoves.slice(0, nextLength)
  const last = trimmed[trimmed.length - 1]!
  let evalWhite = session.originEvalWhite
  try {
    const g = new Chess(last.fen)
    evalWhite = Math.round((evaluateBoard(g, 0.5, true) / 100) * 10) / 10
  } catch {
    // ignore
  }

  return {
    ...session,
    currentFen: last.fen,
    currentEvalWhite: evalWhite,
    branchMoves: trimmed,
    pendingOpponentReply: null,
    coachSummaryId:
      lens === 'apprentice'
        ? `Mundur kembali ke giliranmu (setelah ${last.san}). Silakan coba langkah lain.`
        : `Mundur ke giliranmu (setelah ${last.san}). Silakan uji percabangan alternatif.`,
    refutationArrow: null,
    planArrow: { from: last.from, to: last.to, tone: 'plan' }
  }
}
