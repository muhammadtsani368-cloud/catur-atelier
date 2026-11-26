import type { ChessProgressState } from '~/composables/useChessProgress'

export interface MatchSummaryInput {
  gameMode: string
  opponentName: string
  opponentElo: number
  humanSide: 'w' | 'b'
  resultWinner: 'w' | 'b' | 'draw'
  resultTitle: string
  accuracyPercent: number
  totalPlies: number
  pgn?: string
}

export interface PlayerDnaAxis {
  key: 'aggressiveness' | 'tactics' | 'positional' | 'defense' | 'endgame'
  label: string
  shortLabel: string
  score: number // 0..100
  note: string
}

export interface TrainingPrescription {
  id: string
  category: string
  title: string
  reason: string
  actionLabel: string
  to: string
}

export interface PlayerDnaProfile {
  archetypeName: string
  archetypeTagline: string
  sampleSizeLabel: string
  axes: PlayerDnaAxis[]
  strongestAxis: PlayerDnaAxis
  focusAxis: PlayerDnaAxis
  prescriptions: TrainingPrescription[]
}

function clampScore(v: number): number {
  return Math.max(18, Math.min(98, Math.round(v)))
}

export function computePlayerDnaProfile(
  progress: ChessProgressState,
  matches: MatchSummaryInput[]
): PlayerDnaProfile {
  const totalAttempts = progress.totalAttempts
  const overallAcc = totalAttempts > 0 ? Math.round((progress.correctMoves / totalAttempts) * 100) : 62
  const masteredIds = progress.masteredLineIds
  const endgameMastered = masteredIds.filter((id) => id.includes('endgame')).length
  const openingMastered = masteredIds.length - endgameMastered
  const mistakeQueueLen = progress.mistakeQueue.length

  const matchCount = matches.length
  const wins = matches.filter((m) => m.resultWinner === m.humanSide).length
  const draws = matches.filter((m) => m.resultWinner === 'draw').length
  const avgMatchAcc =
    matchCount > 0
      ? matches.reduce((s, m) => s + (m.accuracyPercent || 70), 0) / matchCount
      : overallAcc
  const avgPlies =
    matchCount > 0
      ? matches.reduce((s, m) => s + (m.totalPlies || 24), 0) / matchCount
      : 28
  const quickWins = matches.filter(
    (m) => m.resultWinner === m.humanSide && m.totalPlies > 0 && m.totalPlies <= 44
  ).length
  const longGames = matches.filter((m) => m.totalPlies >= 52).length
  const winRate = matchCount > 0 ? wins / matchCount : 0.5

  // Count captures / checks in PGNs for aggressiveness heuristic
  let tacticalMarks = 0
  let pgnMoves = 0
  for (const m of matches) {
    if (!m.pgn) continue
    const tokens = m.pgn.split(/\s+/).filter((t) => t && !/^\d+\./.test(t))
    pgnMoves += tokens.length
    tacticalMarks += tokens.filter((t) => t.includes('x') || t.includes('+') || t.includes('#')).length
  }
  const sharpRatio = pgnMoves > 0 ? tacticalMarks / pgnMoves : 0.28

  const aggressiveness = clampScore(
    46 + sharpRatio * 95 + (matchCount > 0 ? (quickWins / matchCount) * 24 : 8)
  )
  const tactics = clampScore(
    overallAcc * 0.58 + avgMatchAcc * 0.36 - Math.min(18, mistakeQueueLen * 1.4) + 10
  )
  const positional = clampScore(
    44 + Math.min(28, openingMastered * 7) + (avgMatchAcc - 55) * 0.55
  )
  const defense = clampScore(
    48 +
      winRate * 16 +
      (matchCount > 0 ? (draws / matchCount) * 14 : 4) +
      Math.min(16, (avgPlies / 60) * 16) -
      Math.min(14, mistakeQueueLen * 1.2)
  )
  const endgame = clampScore(
    40 +
      Math.min(34, endgameMastered * 11) +
      (matchCount > 0 ? (longGames / matchCount) * 18 : 6) +
      (avgMatchAcc > 78 ? 10 : 0)
  )

  const axes: PlayerDnaAxis[] = [
    {
      key: 'aggressiveness',
      label: 'Agresivitas',
      shortLabel: 'Agresif',
      score: aggressiveness,
      note: 'Keberanian menekan pusat, membuka garis serangan, dan menuntaskan inisiatif.'
    },
    {
      key: 'tactics',
      label: 'Ketajaman Taktik',
      shortLabel: 'Taktik',
      score: tactics,
      note: 'Akurasi menemukan garpu, pin, skakmat, dan menghindari blunder fatal.'
    },
    {
      key: 'positional',
      label: 'Struktur Posisional',
      shortLabel: 'Posisional',
      score: positional,
      note: 'Penguasaan jalur pembukaan, koordinasi perwira, dan kontrol petak penting.'
    },
    {
      key: 'defense',
      label: 'Ketahanan Pertahanan',
      shortLabel: 'Bertahan',
      score: defense,
      note: 'Ketenangan membaca ancaman lawan dan bertahan di posisi sulit.'
    },
    {
      key: 'endgame',
      label: 'Presisi Babak Akhir',
      shortLabel: 'Akhir',
      score: endgame,
      note: 'Kemampuan mengonversi keunggulan pion dan perwira hingga tuntas.'
    }
  ]

  const sortedDesc = [...axes].sort((a, b) => b.score - a.score)
  const strongestAxis = sortedDesc[0]!
  const focusAxis = sortedDesc[sortedDesc.length - 1]!

  let archetypeName = 'Penjelajah Atelier'
  let archetypeTagline =
    'Gaya bermainmu masih membentuk karakter unik. Mainkan beberapa partai dan teka-teki agar radar makin tajam.'

  if (matchCount > 0 || totalAttempts >= 5) {
    switch (strongestAxis.key) {
      case 'aggressiveness':
        archetypeName = 'Penyerang Dinamis'
        archetypeTagline =
          'Kamu menyukai inisiatif cepat, garis terbuka, dan tekanan langsung ke Raja lawan.'
        break
      case 'tactics':
        archetypeName = 'Pemburu Taktik'
        archetypeTagline =
          'Matamu jeli melihat kombinasi tajam, garpu ganda, dan peluang hukuman blunder.'
        break
      case 'positional':
        archetypeName = 'Arsitek Posisional'
        archetypeTagline =
          'Kamu membangun keunggulan bertahap lewat pembukaan disiplin dan struktur pion rapi.'
        break
      case 'defense':
        archetypeName = 'Benteng Tangguh'
        archetypeTagline =
          'Kamu tenang di bawah tekanan, sulit ditembus, dan piawai membalikkan serangan lawan.'
        break
      case 'endgame':
        archetypeName = 'Ahli Babak Akhir'
        archetypeTagline =
          'Saat papan mulai kosong, presisi langkah dan konversi pionmu menjadi senjata utama.'
        break
    }
  }

  const prescriptions: TrainingPrescription[] = []

  // 1. Prescription for weakest axis
  if (focusAxis.key === 'endgame') {
    prescriptions.push({
      id: 'rx-endgame',
      category: 'Tambal Kelemahan',
      title: 'Latih Teknik Lucena & Philidor',
      reason: `Skor Presisi Babak Akhir (${focusAxis.score}) paling potensial dinaikkan minggu ini.`,
      actionLabel: 'Buka Latihan Akhir',
      to: '/trainer/endgame/endgame-lucena-philidor'
    })
  } else if (focusAxis.key === 'defense') {
    prescriptions.push({
      id: 'rx-defense',
      category: 'Tambal Kelemahan',
      title: 'Pelajari Pertahanan Grandmaster',
      reason: `Tonton bedah taktik bertahan di Sinema Taktik untuk mengangkat Ketahanan Pertahanan (${focusAxis.score}).`,
      actionLabel: 'Buka Sinema Taktik',
      to: '/tactics'
    })
  } else if (focusAxis.key === 'tactics') {
    prescriptions.push({
      id: 'rx-tactics',
      category: 'Tambal Kelemahan',
      title: 'Sesi Teka-Teki Taktik Tanpa Batas',
      reason: `Asah visi kombinasi untuk meningkatkan Ketajaman Taktik (${focusAxis.score}).`,
      actionLabel: 'Mulai Teka-Teki',
      to: '/puzzles?mode=unlimited'
    })
  } else if (focusAxis.key === 'positional') {
    prescriptions.push({
      id: 'rx-positional',
      category: 'Tambal Kelemahan',
      title: 'Kuasai Struktur Ruy Lopez',
      reason: `Perkuat rencana jangka panjang untuk mengangkat Struktur Posisional (${focusAxis.score}).`,
      actionLabel: 'Latih Repertoar',
      to: '/trainer/opening/ruy-lopez-morphy'
    })
  } else {
    prescriptions.push({
      id: 'rx-aggr',
      category: 'Tambal Kelemahan',
      title: 'Teka-Teki Gegas 3 Menit',
      reason: `Latih ketegasan serangan cepat untuk mengangkat Agresivitas (${focusAxis.score}).`,
      actionLabel: 'Mulai Gegas',
      to: '/puzzles?mode=rush'
    })
  }

  // 2. Recommended Bot Persona sparring partner
  const personaRec =
    focusAxis.key === 'defense'
      ? {
          persona: 'gambiteer',
          title: 'Sparring vs Si Agresif (Gambiteer)',
          reason: 'Uji ketenangan bertahan melawan bot yang terus melancarkan serangan tajam.'
        }
      : focusAxis.key === 'aggressiveness'
        ? {
            persona: 'fortress',
            title: 'Sparring vs Si Solid (Fortress)',
            reason: 'Latih cara membongkar pertahanan rapat tanpa terburu-buru.'
          }
        : {
            persona: 'trickster',
            title: 'Sparring vs Si Taktisi (Trickster)',
            reason: 'Pertajam kewaspadaan taktis melawan bot yang gemar memasang jebakan.'
          }

  prescriptions.push({
    id: 'rx-bot-persona',
    category: 'Lawan Latih Ideal',
    title: personaRec.title,
    reason: personaRec.reason,
    actionLabel: 'Tantang di Arena',
    to: `/play?persona=${personaRec.persona}`
  })

  // 3. Puzzle Duel or Sandbox Exploration
  prescriptions.push(
    mistakeQueueLen > 0
      ? {
          id: 'rx-mistakes',
          category: 'Teka-Teki Harian',
          title: 'Uji Ketajaman di Teka-Teki Harian',
          reason: `Kamu memiliki ${mistakeQueueLen} catatan kesalahan. Pemanasan teka-teki harian membantu memutus pola blunder.`,
          actionLabel: 'Buka Teka-Teki',
          to: '/puzzles?mode=daily'
        }
      : {
          id: 'rx-tactics-cinema',
          category: 'Inspirasi Grandmaster',
          title: 'Bedah Partai di Sinema Taktik',
          reason: 'Pelajari pola skakmat dan pengorbanan juara dunia lengkap dengan papan demo interaktif.',
          actionLabel: 'Buka Sinema',
          to: '/tactics'
        }
  )

  return {
    archetypeName,
    archetypeTagline,
    sampleSizeLabel:
      matchCount > 0
        ? `Berdasarkan ${matchCount} partai & ${totalAttempts} langkah latihan`
        : totalAttempts > 0
          ? `Berdasarkan ${totalAttempts} langkah latihan (mainkan 1 partai agar lebih presisi)`
          : 'Profil awal · Mulai bermain untuk kalibrasi otomatis',
    axes,
    strongestAxis,
    focusAxis,
    prescriptions
  }
}
