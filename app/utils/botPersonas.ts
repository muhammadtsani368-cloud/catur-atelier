import type { Move } from 'chess.js'

export type BotPersonaId = 'default' | 'gambiteer' | 'positional' | 'trickster' | 'fortress'

export type PersonaReactionMoment =
  | 'match_start'
  | 'gambit_or_attack'
  | 'check_delivered'
  | 'capture_made'
  | 'under_pressure'
  | 'endgame_reached'

export interface BotPersonaConfig {
  id: BotPersonaId
  nameId: string
  archetypeLabel: string
  taglineId: string
  descriptionId: string
  accentHex: string
  aggressionOverride: number | null
  sacrificeToleranceCp: number
  styleToleranceCp: number
  preferredBookMoves: string[]
  openingBook: Record<string, string[]>
  reactions: Record<PersonaReactionMoment, string[]>
}

export const BOT_PERSONAS: readonly BotPersonaConfig[] = [
  {
    id: 'default',
    nameId: 'Karakter Asli Bot',
    archetypeLabel: 'Standar Katalog',
    taglineId: 'Mengikuti profil bawaan bot yang dipilih',
    descriptionId:
      'Mempertahankan komposisi evaluasi, kedalaman kalkulasi, dan kecenderungan asli milik tokoh bot di katalog.',
    accentHex: '#718675',
    aggressionOverride: null,
    sacrificeToleranceCp: 0,
    styleToleranceCp: 0,
    preferredBookMoves: [],
    openingBook: {},
    reactions: {
      match_start: ['Mari mulai partai latihan yang jujur dan terukur.'],
      gambit_or_attack: ['Inisiatif mulai terbuka di papan tengah.'],
      check_delivered: ['Skak! Perhatikan petak pelarian Rajamu.'],
      capture_made: ['Pertukaran perwira mengubah keseimbangan ruang.'],
      under_pressure: ['Posisi yang menarik, saya harus menghitung lebih teliti.'],
      endgame_reached: ['Memasuki babak akhir, ketelitian pion menjadi penentu.']
    }
  },
  {
    id: 'gambiteer',
    nameId: 'Si Agresif',
    archetypeLabel: 'The Gambiteer',
    taglineId: 'Gemar gambit tajam, serangan Raja, dan tempo cepat',
    descriptionId:
      'Memilih pembukaan agresif (King Gambit, Serangan Italia, Sisilia Naga), mengincar sayap Raja lebih awal, dan menghindari pertukaran Menteri dini agar serangan tetap menyala.',
    accentHex: '#B85D43',
    aggressionOverride: 0.92,
    sacrificeToleranceCp: 95,
    styleToleranceCp: 120,
    preferredBookMoves: ['e4', 'f4', 'Bc4', 'c5', 'd4', 'Ng5', 'b4', 'f5'],
    openingBook: {
      '': ['e4'],
      e4: ['c5', 'e5', 'd5'],
      'e4 e5': ['f4', 'Bc4'],
      'e4 e5 f4': ['exf4'],
      'e4 e5 Nf3': ['Nc6', 'f5'],
      'e4 e5 Nf3 Nc6': ['Bc4', 'd4'],
      'e4 e5 Nf3 Nc6 Bc4': ['Bc5', 'Nf6'],
      'e4 e5 Nf3 Nc6 Bc4 Bc5': ['b4', 'c3'],
      'e4 e5 Nf3 Nc6 Bc4 Nf6': ['Ng5', 'd4'],
      'e4 c5': ['d4', 'f4', 'Nf3'],
      'e4 c5 Nf3': ['d6', 'Nc6'],
      d4: ['f5', 'c5', 'Nf6'],
      'd4 d5': ['c4', 'e4'],
      'd4 Nf6': ['c4', 'Bg5'],
      'd4 Nf6 c4': ['c5', 'e5']
    },
    reactions: {
      match_start: [
        'Satu bidak bukan masalah selama lajur menuju Rajamu terbuka lebar.',
        'Jangan berharap permainan tenang, saya datang untuk memburu inisiatif!'
      ],
      gambit_or_attack: [
        'Materi bisa dicari nanti, tempo serangan adalah segalanya.',
        'Perhatikan sayap Rajamu, badai perwira baru saja dimulai.'
      ],
      check_delivered: [
        'Skak! Rajamu tidak boleh duduk nyaman terlalu lama.',
        'Skak langsung! Pertahanan pasif hanya akan mengundang kombinasi.'
      ],
      capture_made: [
        'Membuka lajur dan menyingkirkan penjaga petak kunci!',
        'Satu penghalang menuju jantung pertahananmu telah tumbang.'
      ],
      under_pressure: [
        'Serangan balik yang berani! Mari kita lihat siapa yang lebih tajam menghitung.',
        'Tekanan bagus, tetapi saya masih mencari celah serangan balik.'
      ],
      endgame_reached: [
        'Meski masuk babak akhir, perwiraku tetap akan bermain aktif menekan.',
        'Pertarungan belum usai, pion bebas ini siap berlari cepat.'
      ]
    }
  },
  {
    id: 'positional',
    nameId: 'Si Posisional',
    archetypeLabel: 'The Grinder',
    taglineId: 'Kuasai pusat, jaga pasangan Gajah, dan tekan perlahan',
    descriptionId:
      'Memilih pembukaan klasik terstruktur (Queen Gambit, English, Ruy Lopez, QGD), menjaga pasangan Gajah serta rantai pion sehat untuk menekan menuju babak akhir.',
    accentHex: '#526857',
    aggressionOverride: 0.35,
    sacrificeToleranceCp: 0,
    styleToleranceCp: 90,
    preferredBookMoves: ['d4', 'c4', 'Nf3', 'e6', 'c6', 'd5', 'Bb5', 'Be2'],
    openingBook: {
      '': ['d4', 'c4'],
      d4: ['d5', 'e6', 'Nf6'],
      'd4 d5': ['c4', 'Nf3'],
      'd4 d5 c4': ['e6'],
      'd4 d5 c4 e6': ['Nc3', 'Nf3'],
      'd4 d5 c4 e6 Nc3': ['Nf6', 'Be7'],
      'd4 Nf6': ['c4', 'Nf3'],
      'd4 Nf6 c4': ['e6'],
      e4: ['e6', 'c6'],
      'e4 e5': ['Nf3'],
      'e4 e5 Nf3': ['Nc6'],
      'e4 e5 Nf3 Nc6': ['Bb5'],
      'e4 e6': ['d4'],
      'e4 e6 d4': ['d5'],
      'e4 c6': ['d4'],
      'e4 c6 d4': ['d5']
    },
    reactions: {
      match_start: [
        'Catur dimenangkan dari petak pusat dan struktur pion yang rapi.',
        'Tidak perlu terburu-buru, keunggulan kecil akan bertumpuk seiring waktu.'
      ],
      gambit_or_attack: [
        'Saya perkuat dulu koordinasi pusat sebelum melangkah lebih jauh.',
        'Ruang gerak yang sempit perlahan akan memaksa lawan membuat konsesi.'
      ],
      check_delivered: [
        'Skak terukur untuk mengganggu koordinasi perwiramu.',
        'Skak. Setiap paksaan kecil mengurangi pilihan petak aktifmu.'
      ],
      capture_made: [
        'Menyederhanakan posisi untuk memperjelas keunggulan struktur pion.',
        'Pertukaran yang menguntungkan keseimbangan jangka panjang.'
      ],
      under_pressure: [
        'Posisi menuntut kesabaran ekstra, mari perbaiki perwira yang paling pasif.',
        'Tekanan yang rapi. Saya harus menjaga keutuhan struktur pion.'
      ],
      endgame_reached: [
        'Inilah fase favorit saya: saatnya teknik babak akhir berbicara.',
        'Di babak akhir, kelemahan pion sekecil apa pun akan terasa nyata.'
      ]
    }
  },
  {
    id: 'trickster',
    nameId: 'Si Taktisi',
    archetypeLabel: 'The Trickster',
    taglineId: 'Gemar komplikasi taktis, Kuda aktif, dan jebakan garpuan',
    descriptionId:
      'Memilih garis asimetris penuh komplikasi (Sisilia, Scotch, King Indian), mengutamakan Kuda di petak aktif untuk memancing garpuan, paku, dan serangan ganda.',
    accentHex: '#8B6F56',
    aggressionOverride: 0.74,
    sacrificeToleranceCp: 55,
    styleToleranceCp: 100,
    preferredBookMoves: ['e4', 'c5', 'Nf6', 'Nc6', 'd4', 'g6', 'Bg7', 'Nb5'],
    openingBook: {
      '': ['e4', 'Nf3'],
      e4: ['c5', 'Nf6'],
      'e4 c5': ['Nf3', 'Nc3'],
      'e4 c5 Nf3': ['Nc6', 'd6'],
      'e4 c5 Nf3 d6': ['d4'],
      'e4 c5 Nf3 Nc6': ['d4'],
      'e4 e5': ['Nf3'],
      'e4 e5 Nf3': ['Nc6'],
      'e4 e5 Nf3 Nc6': ['d4', 'Nc3'],
      d4: ['Nf6', 'g6'],
      'd4 Nf6': ['c4', 'Nc3'],
      'd4 Nf6 c4': ['g6'],
      'd4 Nf6 c4 g6': ['Nc3'],
      'd4 Nf6 c4 g6 Nc3': ['Bg7']
    },
    reactions: {
      match_start: [
        'Semakin rumit posisi di papan, semakin banyak jebakan tersembunyi.',
        'Mari kita uji seberapa jeli matamu membaca motif taktis!'
      ],
      gambit_or_attack: [
        'Ada ketegangan menarik di beberapa petak sekaligus, hati-hati melangkah.',
        'Kuda saya mulai mengincar petak garpuan yang empuk.'
      ],
      check_delivered: [
        'Skak! Awas jangan sampai salah pilih petak dan terkena garpuan.',
        'Kejutan taktis! Periksa semua perwiramu sebelum menutup skak ini.'
      ],
      capture_made: [
        'Memetik keuntungan dari komplikasi taktis di tengah papan.',
        'Satu taktik kecil berhasil masuk ke dalam perhitungan.'
      ],
      under_pressure: [
        'Wah, matamu tajam juga! Saya harus menyiapkan trik cadangan.',
        'Posisi rumit begini justru membuat permainan makin hidup.'
      ],
      endgame_reached: [
        'Jangan lengah di babak akhir, jebakan tusuk sate dan garpuan Kuda masih mengintai.',
        'Masih ada ruang untuk trik promosi dan manuver tak terduga.'
      ]
    }
  },
  {
    id: 'fortress',
    nameId: 'Si Solid',
    archetypeLabel: 'The Fortress',
    taglineId: 'Sistem London/Slav rapat, rokade cepat, anti ceroboh',
    descriptionId:
      'Memilih sistem super kokoh (London System, Slav, Petrov), memprioritaskan rokade cepat, perisai pion utuh, dan pertukaran aman untuk meredam serangan lawan.',
    accentHex: '#4A5550',
    aggressionOverride: 0.2,
    sacrificeToleranceCp: 0,
    styleToleranceCp: 90,
    preferredBookMoves: ['d4', 'Bf4', 'Nf3', 'e3', 'c3', 'c6', 'e6', 'O-O'],
    openingBook: {
      '': ['d4', 'Nf3'],
      d4: ['d5', 'c6'],
      'd4 d5': ['Bf4', 'Nf3'],
      'd4 d5 Bf4': ['Nf6', 'Bf5', 'e6'],
      'd4 d5 Bf4 Nf6': ['e3'],
      'd4 d5 c4': ['c6'],
      'd4 d5 c4 c6': ['Nf3', 'e3'],
      'd4 Nf6': ['Bf4', 'Nf3'],
      e4: ['c6', 'e5'],
      'e4 e5': ['Nf3'],
      'e4 e5 Nf3': ['Nf6'],
      'e4 c6': ['d4', 'Nf3'],
      'e4 c6 d4': ['d5']
    },
    reactions: {
      match_start: [
        'Keselamatan Raja dan koordinasi perwira selalu menjadi hukum pertama.',
        'Silakan menyerang jika mau, benteng pertahanan saya sudah siap.'
      ],
      gambit_or_attack: [
        'Semua titik lemah sudah diperkuat sebelum melangkah maju.',
        'Serangan tanpa persiapan hanya akan memantul di dinding pertahanan.'
      ],
      check_delivered: [
        'Skak yang aman tanpa meninggalkan celah di garis belakang.',
        'Skak sambil tetap menjaga keutuhan formasi bertahan.'
      ],
      capture_made: [
        'Mengamankan materi sambil menjaga seluruh perwira tetap terlindungi.',
        'Menyingkirkan potensi ancaman sebelum berkembang menjadi bahaya.'
      ],
      under_pressure: [
        'Saatnya merapatkan barisan dan menutup semua lajur terbuka.',
        'Pertahanan yang tenang akan meredam badai serangan paling tajam.'
      ],
      endgame_reached: [
        'Struktur yang utuh sejak awal kini menjadi modal berharga di babak akhir.',
        'Raja dan pion saling menjaga menuju hasil yang pasti.'
      ]
    }
  }
] as const

export function getBotPersona(id: BotPersonaId): BotPersonaConfig {
  return BOT_PERSONAS.find((p) => p.id === id) ?? BOT_PERSONAS[0]!
}

export function getPersonaLiveReaction(
  personaId: BotPersonaId,
  moment: PersonaReactionMoment,
  seedIndex = 0
): string {
  const persona = getBotPersona(personaId)
  const lines = persona.reactions[moment]
  if (!lines || lines.length === 0) return ''
  const idx = Math.abs(seedIndex) % lines.length
  return lines[idx] ?? lines[0]!
}

export function scoreMoveStyleAffinity(move: Move, personaId: BotPersonaId): number {
  if (personaId === 'default') return 0

  let bonus = 0
  const isCenter = move.to === 'd4' || move.to === 'e4' || move.to === 'd5' || move.to === 'e5'
  const isExtendedCenter =
    move.to === 'c4' || move.to === 'f4' || move.to === 'c5' || move.to === 'f5'
  const isCastle = move.san === 'O-O' || move.san === 'O-O-O'
  const isCheck = move.san.includes('+') || move.san.includes('#')
  const toRank = Number(move.to[1] ?? 4)
  const fromRank = Number(move.from[1] ?? 4)
  const isAdvancing = move.color === 'w' ? toRank > fromRank : toRank < fromRank
  const inEnemyHalf = move.color === 'w' ? toRank >= 5 : toRank <= 4

  if (personaId === 'gambiteer') {
    if (isCheck) bonus += 72
    if (move.captured) bonus += 42
    if (move.piece === 'q' && isAdvancing) bonus += 34
    if ((move.piece === 'n' || move.piece === 'b') && inEnemyHalf) bonus += 38
    if (move.piece === 'p' && (move.from[0] === 'f' || move.from[0] === 'g' || move.from[0] === 'h') && isAdvancing) {
      bonus += 32
    }
    if (isExtendedCenter || isCenter) bonus += 24
    // Strongly avoid trading Queens unless forced
    if (move.piece === 'q' && move.captured === 'q') bonus -= 85
  } else if (personaId === 'positional') {
    if (isCenter) bonus += 62
    if (isExtendedCenter) bonus += 34
    if (isCastle) bonus += 56
    if (move.piece === 'b' || move.piece === 'r') bonus += 26
    // Value keeping bishop pair; avoid pointless edge pawn thrusts
    if (move.piece === 'b' && move.captured === 'n') bonus -= 28
    if (move.piece === 'p' && (move.from[0] === 'a' || move.from[0] === 'h') && !move.captured) {
      bonus -= 30
    }
  } else if (personaId === 'trickster') {
    if (move.piece === 'n' && isAdvancing) bonus += 64
    if (move.piece === 'n' && inEnemyHalf) bonus += 40
    if (isCheck) bonus += 56
    if (move.captured && move.piece !== move.captured) bonus += 38
    // Dislike sterile symmetrical trades
    if (move.captured && move.piece === move.captured && move.piece !== 'p') bonus -= 32
  } else if (personaId === 'fortress') {
    if (isCastle) bonus += 95
    // Fortress loves trading Queens to neutralize enemy attacks!
    if (move.piece === 'q' && move.captured === 'q') bonus += 62
    if (move.piece === 'p' && (move.to === 'c3' || move.to === 'd3' || move.to === 'e3' || move.to === 'c6' || move.to === 'd6' || move.to === 'e6')) {
      bonus += 34
    }
    // Heavily penalize weakening kingside pawn shield
    if (move.piece === 'p' && (move.from[0] === 'f' || move.from[0] === 'g' || move.from[0] === 'h') && !move.captured) {
      bonus -= 65
    }
    if (isCenter) bonus += 24
  }

  return bonus
}
