import { Chess, type Color, type Square } from 'chess.js'
import type { TacticalArrow } from '~/components/TacticalArrowOverlay.vue'
import {
  PIECE_NAME_ID,
  analyzeBoardVision,
  type AdaptiveLensId
} from '~/utils/adaptiveLensEngine'
import { buildCustomEngineBot } from '~/utils/botCatalog'
import { computeBotMove } from '~/utils/chessBotEngine'
import type { AnalyzedMove } from '~/utils/gameReviewEngine'

export interface SocraticReviewInsight {
  socraticQuestion: string
  humanExplanation: string
  bestPlanNarrative: string
  lensNote: string
  opponentThreatSan: string | null
  refutationArrow: TacticalArrow | null
  suggestedCandidates: string[]
  whatIfStartsOnAfterFen: boolean
  suggestRewindToHumanTurn: boolean
}

export interface LiveCoPilotBrief {
  visibleOnStage: boolean
  badgeLabel: string
  headline: string
  promptText: string
}

function inspectBestLegalMoveOnFen(fen: string): {
  san: string | null
  from: string | null
  to: string | null
  pieceName: string | null
  capturedName: string | null
  isCheck: boolean
  isMate: boolean
} {
  let game: Chess
  try {
    game = new Chess(fen)
  } catch {
    return {
      san: null,
      from: null,
      to: null,
      pieceName: null,
      capturedName: null,
      isCheck: false,
      isMate: false
    }
  }

  if (game.isGameOver()) {
    return {
      san: null,
      from: null,
      to: null,
      pieceName: null,
      capturedName: null,
      isCheck: false,
      isMate: false
    }
  }

  const profile = buildCustomEngineBot(2350)
  const res = computeBotMove(
    fen,
    { ...profile, maxDepth: 3, timeBudgetMs: 95, randomness: 0, blunderRate: 0 },
    []
  )

  if (!res.move) {
    return {
      san: null,
      from: null,
      to: null,
      pieceName: null,
      capturedName: null,
      isCheck: false,
      isMate: false
    }
  }

  return {
    san: res.move.san,
    from: res.move.from,
    to: res.move.to,
    pieceName: PIECE_NAME_ID[res.move.piece],
    capturedName: res.move.captured ? PIECE_NAME_ID[res.move.captured] : null,
    isCheck: res.move.san.includes('+') || res.move.san.includes('#'),
    isMate: res.move.san.includes('#')
  }
}

function collectCandidateMoves(
  fen: string,
  excludedSan: string | null,
  preferredBestSan: string | null,
  limit = 6
): string[] {
  const candidates: string[] = []
  let game: Chess
  try {
    game = new Chess(fen)
  } catch {
    return []
  }

  const legal = game.moves({ verbose: true })
  if (legal.length === 0) return []

  if (
    preferredBestSan &&
    preferredBestSan !== excludedSan &&
    legal.some((m) => m.san === preferredBestSan)
  ) {
    candidates.push(preferredBestSan)
  }

  const prioritized = legal
    .filter((m) => m.san !== excludedSan && !candidates.includes(m.san))
    .map((m) => {
      // Penalize candidates that allow immediate opponent checkmate-in-1!
      game.move(m)
      let allowsMateIn1 = false
      if (!game.isGameOver()) {
        for (const opp of game.moves({ verbose: true })) {
          if (opp.san.includes('#')) {
            allowsMateIn1 = true
            break
          }
        }
      }
      game.undo()

      let s = allowsMateIn1 ? -50 : 0
      if (m.san.includes('#')) s += 30
      if (m.san === 'O-O' || m.san === 'O-O-O') s += 10
      if (m.captured) s += 8
      if (m.san.includes('+')) s += 6
      if (m.to === 'd4' || m.to === 'e4' || m.to === 'd5' || m.to === 'e5') s += 5
      if (m.piece === 'n' || m.piece === 'b') s += 3
      if (m.piece === 'q' || m.piece === 'r') s += 2
      return { move: m, score: s }
    })
    .sort((a, b) => b.score - a.score)

  for (const entry of prioritized) {
    if (candidates.length >= limit) break
    candidates.push(entry.move.san)
  }

  return candidates
}

export function suggestCandidatesForFen(fen: string, limit = 8): string[] {
  let game: Chess
  try {
    game = new Chess(fen)
  } catch {
    return []
  }

  const legal = game.moves({ verbose: true })
  if (legal.length === 0) return []

  const coachProfile = buildCustomEngineBot(2300)
  const best = computeBotMove(
    fen,
    { ...coachProfile, timeBudgetMs: 90, randomness: 0, blunderRate: 0 },
    []
  )
  const bestSan = best.move?.san ?? null

  return collectCandidateMoves(fen, null, bestSan, limit)
}

export function getAllLegalSansForFen(fen: string): string[] {
  try {
    return new Chess(fen).moves()
  } catch {
    return []
  }
}

export function formatMoveCommentForLens(
  move: AnalyzedMove,
  lens: AdaptiveLensId,
  humanSide?: Color
): string {
  const isHumanMove = humanSide ? move.color === humanSide : true
  const actor = isHumanMove ? 'Kamu' : move.color === 'w' ? 'Putih' : 'Hitam'

  if (lens === 'master') {
    return move.commentId
  }

  let movedPieceName = 'Bidak'
  try {
    const g = new Chess(move.beforeFen)
    const p = g.get(move.from as Square)
    if (p) movedPieceName = PIECE_NAME_ID[p.type]
  } catch {
    // fallback
  }

  if (move.isMate) {
    return isHumanMove
      ? `Hebat! ${movedPieceName} ke ${move.to} (${move.san}) langsung skakmat dan memenangkan permainan!`
      : `${actor} memainkan ${move.san} yang langsung mengakhiri permainan dengan skakmat.`
  }

  if (lens === 'apprentice') {
    switch (move.classification) {
      case 'brilliant':
        return `Keren sekali! ${actor} menemukan langkah mengejutkan ${move.san} (${movedPieceName} ke ${move.to}) yang sangat menyulitkan lawan.`
      case 'great':
        return `Tepat sekali! ${move.san} adalah pilihan terkuat ${actor} di posisi kritis ini.`
      case 'book':
        return `${move.san} adalah langkah pembukaan klasik yang rapi dan aman untuk memulai permainan.`
      case 'best':
        return move.isCapture
          ? `Bagus! ${actor} memakan bidak lawan dengan ${move.san} di saat yang paling tepat.`
          : `Mantap! Memindahkan ${movedPieceName} ke ${move.to} (${move.san}) adalah langkah paling kuat di sini.`
      case 'excellent':
        return `Langkah bagus! ${move.san} menjaga posisi ${actor} tetap aman dan aktif.`
      case 'good':
        return `${move.san} sudah cukup aman, walaupun langkah ${move.bestMoveSan} sedikit lebih membantu.`
      case 'inaccuracy':
        return `${move.san} agak kurang pas. Coba bandingkan dengan ${move.bestMoveSan} yang membuat bidakmu lebih aman dan aktif.`
      case 'mistake':
        return `Hati-hati, ${move.san} memberi peluang balik ke lawan. Pilihan yang lebih aman adalah ${move.bestMoveSan}.`
      case 'miss':
        return `Sayang sekali! Sebenarnya ada kesempatan besar lewat ${move.bestMoveSan}, tapi terlewat karena memilih ${move.san}.`
      case 'blunder':
        return `Waduh, ${move.san} adalah kesalahan berat yang membuat posisi langsung terancam! Seharusnya mainkan ${move.bestMoveSan}.`
    }
  }

  // Club (Menengah): balanced tactical Indonesian
  return move.commentId
}

export function generateSocraticReview(
  move: AnalyzedMove,
  lens: AdaptiveLensId,
  humanSide?: Color
): SocraticReviewInsight {
  const actorLabel = move.color === 'w' ? 'Putih' : 'Hitam'
  const isHumanMove = humanSide ? move.color === humanSide : true
  const isBeginner = lens === 'apprentice'
  const isError =
    move.classification === 'blunder' ||
    move.classification === 'mistake' ||
    move.classification === 'miss' ||
    move.classification === 'inaccuracy'

  let movedPieceName = 'Perwira'
  try {
    const beforeGame = new Chess(move.beforeFen)
    const p = beforeGame.get(move.from as Square)
    if (p) movedPieceName = PIECE_NAME_ID[p.type]
  } catch {
    // fallback
  }

  // =========================================================================
  // CASE 1: OPPONENT'S MOVE — Always guide the HUMAN PLAYER'S perspective!
  // =========================================================================
  if (!isHumanMove) {
    const opponentMoveLabel = `${actorLabel} memainkan ${move.san}`

    // Subcase 1A: Opponent delivered CHECKMATE (e.g. f5#) — No legal replies exist!
    if (move.isMate) {
      const socraticQuestion = isBeginner
        ? `${opponentMoveLabel} langsung skakmat! Menurutmu, pada langkahmu sebelumnya, apa yang bisa dilakukan untuk melindungi Raja?`
        : `${opponentMoveLabel} menutup partai dengan skakmat. Pada giliranmu sebelumnya, pertahanan mana yang seharusnya mencegah pola mat ini?`

      const humanExplanation = isBeginner
        ? `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) langsung skakmat karena Rajamu tidak punya jalan keluar lagi. Permainan selesai di sini.`
        : `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) mengunci seluruh petak pelarian Raja dan langsung mengakhiri partai dengan skakmat.`

      const bestPlanNarrative = isBeginner
        ? 'Karena sudah skakmat, kamu tidak bisa membalas di posisi ini. Klik tombol mundur ke langkahmu sebelumnya untuk mencoba cara bertahan!'
        : 'Tidak ada langkah legal balasan setelah skakmat. Mundur satu langkah ke giliranmu sebelumnya untuk menguji pertahanan terbaik di Simulator What-If.'

      const lensNote =
        lens === 'apprentice'
          ? 'Refleksi Pemula: Langkah lawan ini berujung skakmat. Mundur satu langkah ke giliranmu agar kamu bisa berlatih menutup jalur serangannya.'
          : lens === 'club'
            ? 'Refleksi Klub: Ini adalah langkah lawan yang mengakhiri partai. Tinjau satu ply sebelumnya untuk menemukan pertahanan aktif atau sumber counterplay.'
            : 'Refleksi Pro (sudut pandangmu): Langkah lawan mengeksekusi skakmat paksa. Kembalilah ke giliranmu sebelumnya untuk mengevaluasi profilaksis yang terlewat.'

      return {
        socraticQuestion,
        humanExplanation,
        bestPlanNarrative,
        lensNote,
        opponentThreatSan: null,
        refutationArrow: null,
        suggestedCandidates: [],
        whatIfStartsOnAfterFen: false,
        suggestRewindToHumanTurn: true
      }
    }

    // Subcase 1B: Opponent's normal/error move — Suggest the HUMAN'S BEST LEGAL REPLIES on afterFen!
    const playerBestReply = inspectBestLegalMoveOnFen(move.afterFen)
    const playerCandidates = collectCandidateMoves(
      move.afterFen,
      null,
      playerBestReply.san,
      6
    )

    const bestReplyArrow: TacticalArrow | null =
      playerBestReply.from && playerBestReply.to
        ? { from: playerBestReply.from, to: playerBestReply.to, tone: 'plan' }
        : null

    let socraticQuestion: string
    if (isError) {
      socraticQuestion = isBeginner
        ? `${opponentMoveLabel} membuat kesalahan! Bisakah kamu menemukan balasan terbaik untuk memanfaatkan celah ini?`
        : `${opponentMoveLabel} menciptakan celah. Bagaimana kamu bisa memanfaatkan momentum ini pada giliran berikutnya?`
    } else if (move.isCheck) {
      socraticQuestion = isBeginner
        ? `${opponentMoveLabel} memberi skak ke Rajamu! Cara paling aman mana yang akan kamu pilih untuk keluar dari skak?`
        : `${opponentMoveLabel} melancarkan skak. Respons bertahan mana yang tetap menjaga koordinasi perwiramu?`
    } else {
      socraticQuestion = isBeginner
        ? `${opponentMoveLabel}. Coba cek dulu apakah ada bidakmu yang terancam, lalu pilih balasan terbaikmu!`
        : `${opponentMoveLabel}. Apa ancaman atau rencana lawan yang harus kamu antisipasi sebelum membalas?`
    }

    let humanExplanation: string
    if (isError) {
      humanExplanation = isBeginner
        ? `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) kurang teliti dan membuka kesempatan bagus untukmu membalas.`
        : `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) melemahkan posisinya dan menyerahkan inisiatif ke pihakmu.`
    } else if (move.isCapture) {
      humanExplanation = isBeginner
        ? `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) memakan bidak di ${move.to}. Perhatikan apakah kamu bisa memukul balik atau mengamankan bidak lain.`
        : `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) mengubah keseimbangan materi di petak ${move.to}.`
    } else {
      humanExplanation = isBeginner
        ? `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) untuk memperbaiki posisinya. Sekarang giliranmu menentukan balasan yang tepat.`
        : `${opponentMoveLabel} (${movedPieceName} dari ${move.from} ke ${move.to}) memperkuat kontrol ruangnya tanpa meninggalkan kelemahan mencolok.`
    }

    let bestPlanNarrative: string
    if (playerBestReply.san && playerBestReply.from && playerBestReply.to) {
      const pName = playerBestReply.pieceName ?? 'bidak'
      if (playerBestReply.isMate) {
        bestPlanNarrative = isBeginner
          ? `Kesempatan emas! Balasan terbaikmu adalah ${playerBestReply.san} (${pName} ke ${playerBestReply.to}) yang langsung skakmat!`
          : `Hukum langsung dengan balasan ${playerBestReply.san} (${playerBestReply.from} ke ${playerBestReply.to}) untuk skakmat paksa!`
      } else if (playerBestReply.capturedName) {
        bestPlanNarrative = isBeginner
          ? `Balasan terbaikmu di posisi ini adalah ${playerBestReply.san}: pindahkan ${pName} dari ${playerBestReply.from} ke ${playerBestReply.to} untuk memakan ${playerBestReply.capturedName} lawan.`
          : `Respons terkuatmu adalah ${playerBestReply.san} (${playerBestReply.from} ke ${playerBestReply.to}), langsung memukul ${playerBestReply.capturedName} lawan dan merebut inisiatif.`
      } else {
        bestPlanNarrative = isBeginner
          ? `Balasan terbaik untukmu sekarang adalah ${playerBestReply.san} (pindahkan ${pName} dari ${playerBestReply.from} ke ${playerBestReply.to}) agar posisimu tetap aman dan aktif.`
          : `Fokus pada responsmu: balasan paling akurat adalah ${playerBestReply.san} (${playerBestReply.from} ke ${playerBestReply.to}) untuk meredam rencana ${actorLabel}.`
      }
    } else {
      bestPlanNarrative =
        'Fokus pada responsmu: cari langkah legal yang menjaga keselamatan Raja dan mengaktifkan perwiramu.'
    }

    let lensNote: string
    if (lens === 'apprentice') {
      lensNote =
        'Catatan Pemula (sudut pandangmu): Ini adalah langkah lawan, jadi tombol di bawah adalah pilihan balasan milikmu sendiri yang bisa langsung kamu coba.'
    } else if (lens === 'club') {
      lensNote =
        'Catatan Klub (sudut pandangmu): Ini langkah lawan. Klik salah satu tombol balasan di bawah untuk menguji rencana serangan balikmu di Simulator What-If.'
    } else {
      const swing = Math.round((move.evalAfter - move.evalBefore) * 10) / 10
      const swingText = swing >= 0 ? `+${swing}` : `${swing}`
      lensNote = `Refleksi Pro (sudut pandangmu): Ini adalah langkah lawan (pergeseran evaluasi ${swingText}). Uji kandidat balasan terbaikmu di cabang What-If.`
    }

    return {
      socraticQuestion,
      humanExplanation,
      bestPlanNarrative,
      lensNote,
      opponentThreatSan: null,
      refutationArrow: bestReplyArrow,
      suggestedCandidates: playerCandidates,
      whatIfStartsOnAfterFen: true,
      suggestRewindToHumanTurn: false
    }
  }

  // =========================================================================
  // CASE 2: HUMAN PLAYER'S OWN MOVE — Alternatives on move.beforeFen
  // =========================================================================
  if (move.isMate) {
    return {
      socraticQuestion: isBeginner
        ? `Selamat! Langkah ${move.san} langsung menutup permainan dengan skakmat. Apa yang membuat Raja lawan tidak bisa kabur?`
        : `Skakmat presisi melalui ${move.san}! Perwira mana saja yang berkoordinasi menutup seluruh petak pelarian Raja lawan?`,
      humanExplanation: isBeginner
        ? `Kamu memindahkan ${movedPieceName} dari ${move.from} ke ${move.to} (${move.san}) dan langsung menang skakmat!`
        : `${actorLabel} menyelesaikan partai secara klinis lewat ${move.san} (${movedPieceName} dari ${move.from} ke ${move.to}).`,
      bestPlanNarrative: 'Tidak perlu alternatif lagi, langkah ini sudah memastikan kemenangan mutlak.',
      lensNote:
        lens === 'apprentice'
          ? 'Tips Pemula: Keren! Pola skakmat seperti ini bagus diingat agar makin cepat terlihat di pertandingan berikutnya.'
          : lens === 'club'
            ? 'Catatan Klub: Eksekusi akhir yang bersih. Ingat pola koordinasi perwira ini untuk referensi taktik.'
            : 'Tinjauan Pro: Konversi skakmat sempurna tanpa memberi counterplay pada lawan.',
      opponentThreatSan: null,
      refutationArrow: null,
      suggestedCandidates: [],
      whatIfStartsOnAfterFen: false,
      suggestRewindToHumanTurn: false
    }
  }

  const reply = inspectBestLegalMoveOnFen(move.afterFen)
  const candidates = collectCandidateMoves(move.beforeFen, move.san, move.bestMoveSan, 6)

  let socraticQuestion = isBeginner
    ? `Setelah kamu memindahkan ${movedPieceName} ke ${move.to}, apakah semua bidakmu sudah saling menjaga dengan aman?`
    : `Apa dampak jangka menengah dari penempatan ${movedPieceName} di petak ${move.to} terhadap koordinasi perwiramu?`
  let humanExplanation = isBeginner
    ? `Kamu memindahkan ${movedPieceName} dari ${move.from} ke ${move.to} (${move.san}) untuk menjaga posisi tetap stabil.`
    : `${actorLabel} memainkan ${move.san} dengan memindahkan ${movedPieceName} dari ${move.from} ke ${move.to} sambil menjaga keseimbangan posisi.`
  let bestPlanNarrative =
    move.bestMoveSan && move.bestMoveSan !== move.san
      ? isBeginner
        ? `Pilihan lain yang lebih kuat adalah ${move.bestMoveSan}, supaya bidakmu lebih aktif dan aman.`
        : `Alternatif ${move.bestMoveSan} menjaga koordinasi perwira lebih solid sekaligus memberi ruang gerak lebih leluasa.`
      : isBeginner
        ? `Langkah ${move.san} sudah merupakan pilihan paling tepat di posisi ini!`
        : `Langkah ${move.san} sudah sejalan dengan rencana terbaik di posisi ini.`

  let refutationArrow: TacticalArrow | null = null

  if (isError) {
    if (reply.san && reply.from && reply.to) {
      refutationArrow = {
        from: reply.from,
        to: reply.to,
        tone: 'threat'
      }
    }

    if (reply.isMate && reply.san) {
      socraticQuestion = isBeginner
        ? `Sebelum main ${move.san}, coba cek petak di sekitar Rajamu: kenapa lawan jadi bisa langsung skakmat?`
        : `Sebelum melangkah ${move.san}, petak kritis mana di dekat Rajamu yang kehilangan penjagaan?`
      humanExplanation = isBeginner
        ? `Langkah ${move.san} membuka celah di dekat Rajamu sehingga lawan bisa langsung skakmat dengan ${reply.san}.`
        : `Langkah ${move.san} meninggalkan celah fatal di pertahanan Raja sehingga lawan memiliki skakmat paksa melalui ${reply.san}.`
    } else if (reply.capturedName && reply.san && reply.to) {
      socraticQuestion = isBeginner
        ? `Coba lihat ${reply.capturedName} milikmu di petak ${reply.to} setelah main ${move.san}: apakah ada yang menjaganya?`
        : `Coba amati petak ${reply.to} setelah ${move.san} dimainkan: apakah ${reply.capturedName} di sana memiliki cukup pelindung?`
      humanExplanation = isBeginner
        ? `Setelah ${movedPieceName} pindah ke ${move.to} (${move.san}), ${reply.capturedName} milikmu di ${reply.to} jadi bisa langsung dimakan lawan lewat ${reply.san}.`
        : `Setelah ${movedPieceName} melangkah ke ${move.to} (${move.san}), ${reply.capturedName} di petak ${reply.to} menjadi sasaran empuk karena lawan dapat langsung memukul lewat ${reply.san}.`
    } else if (reply.isCheck && reply.san) {
      socraticQuestion = isBeginner
        ? `Kalau lawan langsung membalas dengan skak ${reply.san}, apakah Rajamu masih punya tempat aman?`
        : `Jika lawan langsung merespons dengan skak ${reply.san}, apakah Rajamu masih punya petak aman tanpa kehilangan materi?`
      humanExplanation = isBeginner
        ? `Langkah ${move.san} membuat lawan bisa langsung memberi skak (${reply.san}) dan mengacaukan pertahananmu.`
        : `Langkah ${move.san} menyerahkan tempo penting. Lawan dapat langsung melancarkan inisiatif skak ${reply.san} yang menggoyahkan koordinasi pertahanan ${actorLabel}.`
    } else if (move.classification === 'miss' && move.bestMoveSan) {
      socraticQuestion = isBeginner
        ? `Sebelum memilih ${move.san}, coba perhatikan lagi: ada bidak lawan yang sebenarnya bisa kamu serang atau rebut lho!`
        : `Sebelum memilih ${move.san}, adakah sasaran taktis lawan yang sebenarnya sedang goyah dan siap dipetik?`
      humanExplanation = isBeginner
        ? `Di posisi ini kamu sebenarnya punya kesempatan besar lewat ${move.bestMoveSan}, tapi memilih ${move.san} membuat lawan sempat menyelamatkan diri.`
        : `Pada posisi ini terdapat peluang taktis emas yang terlewatkan. Memilih ${move.san} memberi lawan satu tempo penuh untuk merapikan pertahanannya.`
    } else {
      socraticQuestion = isBeginner
        ? `Coba bandingkan ${move.san} dengan menggerakkan bidak ke tengah papan: langkah mana yang lebih membantu?`
        : `Bandingkan aktivitas perwira setelah ${move.san} dengan rencana pengembangan ke pusat: bagian papan mana yang melemah?`
      humanExplanation = isBeginner
        ? `Langkah ${move.san} kurang efektif sehingga lawan lebih leluasa menguasai bagian tengah papan.`
        : `Langkah ${move.san} kurang selaras dengan kebutuhan posisi saat ini dan membuat lawan lebih mudah menguasai petak-petak kunci.`
    }

    if (move.bestMoveSan && move.bestMoveFrom && move.bestMoveTo) {
      let bestPieceName = 'bidak'
      try {
        const bg = new Chess(move.beforeFen)
        const bp = bg.get(move.bestMoveFrom as Square)
        if (bp) bestPieceName = PIECE_NAME_ID[bp.type]
      } catch {
        // ignore
      }
      bestPlanNarrative = isBeginner
        ? `Langkah yang lebih bagus adalah ${move.bestMoveSan}: pindahkan ${bestPieceName} dari ${move.bestMoveFrom} ke ${move.bestMoveTo} agar posisimu lebih aman dan kuat.`
        : `Rencana yang lebih tangguh adalah ${move.bestMoveSan} (${move.bestMoveFrom} ke ${move.bestMoveTo}), mengaktifkan ${bestPieceName} sekaligus meredam ancaman lawan sebelum berkembang.`
    }
  } else {
    if (move.classification === 'brilliant' || move.classification === 'great') {
      socraticQuestion = isBeginner
        ? `Langkah ${move.san} sangat tajam dan memaksa lawan bertahan! Setelah ini, bidak mana lagi yang mau kamu ajak menyerang?`
        : `Perhatikan bagaimana ${move.san} memaksa lawan bereaksi: jalur mana yang kini terbuka untuk perwiramu berikutnya?`
      humanExplanation = isBeginner
        ? `Hebat! Kamu menemukan ${move.san} yang langsung menekan lawan dan membuat mereka kesulitan mencari balasan.`
        : `${actorLabel} menemukan ${move.san}, langkah tajam yang merebut inisiatif dan memaksa lawan bertahan di petak sempit.`
    } else if (move.san === 'O-O' || move.san === 'O-O-O') {
      socraticQuestion = isBeginner
        ? `Bagus, Rajamu sudah aman lewat rokade! Selanjutnya, jalur terbuka mana yang cocok untuk Bentengmu?`
        : `Setelah Raja aman lewat rokade, lajur pusat mana yang paling ideal untuk ditempati Bentengmu?`
      humanExplanation = isBeginner
        ? `Rokade (${move.san}) membuat Rajamu berlindung dengan aman sekaligus mengaktifkan Benteng.`
        : `Rokade (${move.san}) mengamankan Raja dari garis tengah sekaligus mengaktifkan Benteng menuju pertarungan pusat.`
    } else {
      socraticQuestion = isBeginner
        ? `Langkah ${move.san} cukup rapi! Bidak mana lagi yang masih diam di belakang dan bisa kamu majukan berikutnya?`
        : `Setelah langkah solid ${move.san}, perwira mana yang sebaiknya kamu tingkatkan posisinya pada giliran berikutnya?`
      humanExplanation = isBeginner
        ? `${move.san} menjaga posisi bidakmu tetap rapi tanpa meninggalkan celah berbahaya.`
        : `${move.san} menjaga harmoni antarpion dan mempertahankan kontrol ruang tanpa meninggalkan titik lemah taktis.`
    }
  }

  let lensNote = ''
  if (lens === 'apprentice') {
    lensNote = isError
      ? 'Tips Pemula: Biasakan cek 3 hal sebelum melangkah: apakah Rajamu aman, apakah ada bidak yang bisa dimakan lawan, dan apakah kamu melewatkan bidak gratis.'
      : 'Tips Pemula: Langkah rapi! Selalu pastikan bidak yang maju tetap dijaga teman di belakangnya.'
  } else if (lens === 'club') {
    lensNote = isError
      ? 'Catatan Klub: Klik salah satu tombol uji di bawah untuk membandingkan tempo dan balasan lawan di Simulator What-If.'
      : 'Catatan Klub: Pertahankan ketegangan struktur pusat sampai lawan terpaksa melepas petak penting.'
  } else {
    const swing = Math.round((move.evalAfter - move.evalBefore) * 10) / 10
    const swingText = swing >= 0 ? `+${swing}` : `${swing}`
    lensNote = `Tinjauan Pro: Pergeseran evaluasi ${swingText} poin dengan kehilangan peluang menang ${move.winPctLoss}%. Evaluasi transisi struktur pion pada cabang What-If.`
  }

  return {
    socraticQuestion,
    humanExplanation,
    bestPlanNarrative,
    lensNote,
    opponentThreatSan: isError ? reply.san : null,
    refutationArrow,
    suggestedCandidates: candidates,
    whatIfStartsOnAfterFen: false,
    suggestRewindToHumanTurn: false
  }
}

export function generateLiveCoPilotBrief(
  fen: string,
  lastMoveSan: string | null,
  perspective: Color,
  lens: AdaptiveLensId
): LiveCoPilotBrief {
  if (lens === 'master') {
    return {
      visibleOnStage: false,
      badgeLabel: 'Mode Pro',
      headline: 'Kalkulasi Mandiri',
      promptText: ''
    }
  }

  const vision = analyzeBoardVision(fen, perspective, lens)

  if (lens === 'apprentice') {
    if (vision.hangingSquares.length > 0) {
      const targetSq = vision.hangingSquares[0]!
      let pieceName = 'Bidak'
      try {
        const g = new Chess(fen)
        const p = g.get(targetSq as Square)
        if (p) pieceName = PIECE_NAME_ID[p.type]
      } catch {
        // fallback
      }
      return {
        visibleOnStage: true,
        badgeLabel: 'Radar Ancaman',
        headline: `Awas! ${pieceName} di ${targetSq} sedang diincar`,
        promptText: lastMoveSan
          ? `Setelah lawan main ${lastMoveSan}, ${pieceName} milikmu di ${targetSq} belum cukup aman. Pindahkan atau lindungi dulu ya!`
          : `${pieceName} milikmu di petak ${targetSq} belum punya penjaga. Amankan dulu sebelum menyerang.`
      }
    }

    return {
      visibleOnStage: true,
      badgeLabel: vision.planSummary.zoneLabelId,
      headline: vision.planSummary.headline,
      promptText: lastMoveSan
        ? `Lawan baru saja melangkah ${lastMoveSan}. ${vision.planSummary.rationale}`
        : vision.planSummary.rationale
    }
  }

  // Club lens: concise strategic radar without tactical hand-holding
  const tensionHint =
    vision.tensionSquares.length > 0
      ? `Titik tegang aktif di ${vision.tensionSquares.slice(0, 3).join(', ')}. `
      : ''

  return {
    visibleOnStage: true,
    badgeLabel: `Plan Radar: ${vision.planSummary.zoneLabelId}`,
    headline: vision.planSummary.headline,
    promptText: `${tensionHint}${vision.planSummary.rationale}`
  }
}
