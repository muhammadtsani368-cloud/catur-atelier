import type { Color, PieceSymbol } from 'chess.js'

export type BotTierName =
  | 'Baru Bermain Catur'
  | 'Menengah'
  | 'Lanjutan'
  | 'Master'
  | 'Pemain Papan Atas'

export interface BotAvatarPiece {
  type: PieceSymbol
  color: Color
}

export interface BotCatalogEntry {
  id: string
  name: string
  elo: number
  tier: BotTierName
  playstyle: string
  taglineId: string
  descriptionId: string
  avatarPiece: BotAvatarPiece
  accentColor: string
  depth: number
  randomness: number // 0 (presisi penuh) .. 1 (sangat acak)
  aggression: number // 0 (solid posisional) .. 1 (sangat agresif)
  timeBudgetMs: number
  blunderRate: number // 0 .. 0.65
  useBook: boolean
  useQuiescence: boolean
}

export interface BotTierGroup {
  tier: BotTierName
  shortLabel: string
  eloRange: string
  summaryId: string
}

export const BOT_TIER_GROUPS: BotTierGroup[] = [
  {
    tier: 'Baru Bermain Catur',
    shortLabel: 'Pemula',
    eloRange: '250–600 ELO',
    summaryId: 'Ramah untuk melatih aturan dasar, melihat ancaman langsung, dan menghindari blunder sederhana.'
  },
  {
    tier: 'Menengah',
    shortLabel: 'Menengah',
    eloRange: '800–1300 ELO',
    summaryId: 'Mulai menerapkan prinsip pembukaan, menangkap bidak gratis, dan mengenali taktik dua langkah.'
  },
  {
    tier: 'Lanjutan',
    shortLabel: 'Lanjutan',
    eloRange: '1500–1900 ELO',
    summaryId: 'Pemain klub kuat dengan kalkulasi taktis tajam, struktur pion teratur, dan serangan terencana.'
  },
  {
    tier: 'Master',
    shortLabel: 'Master',
    eloRange: '2100–2400 ELO',
    summaryId: 'Disiplin teoretis tingkat master dengan evaluasi ruang, koordinasi perwira, dan teknik babak akhir.'
  },
  {
    tier: 'Pemain Papan Atas',
    shortLabel: 'Papan Atas',
    eloRange: '2600–2850 ELO',
    summaryId: 'Kekuatan Super-GM dengan buku pembukaan elit, quiescence mendalam, dan akurasi posisional tinggi.'
  }
]

export const CUSTOM_ELO_PRESETS = [500, 1200, 2000, 3200] as const

export const BOT_CATALOG: BotCatalogEntry[] = [
  // 1. Baru Bermain Catur (250 - 600)
  {
    id: 'bot-raka-250',
    name: 'Raka',
    elo: 250,
    tier: 'Baru Bermain Catur',
    playstyle: 'Eksploratif',
    taglineId: 'Baru mengenal langkah bidak',
    descriptionId:
      'Sering melangkah secara spontan tanpa menghitung ancaman balik. Cocok untuk pemanasan atau latihan pola skakmat dasar.',
    avatarPiece: { type: 'p', color: 'w' },
    accentColor: '#7B8E7F',
    depth: 1,
    randomness: 0.92,
    aggression: 0.35,
    timeBudgetMs: 45,
    blunderRate: 0.56,
    useBook: false,
    useQuiescence: false
  },
  {
    id: 'bot-nadia-400',
    name: 'Nadia',
    elo: 400,
    tier: 'Baru Bermain Catur',
    playstyle: 'Santai',
    taglineId: 'Ramah pemula & mudah ditebak',
    descriptionId:
      'Sudah memahami nilai bidak dasar namun sering melewatkan pin atau garpu sederhana. Ideal untuk melatih ketelitian menangkap perwira gratis.',
    avatarPiece: { type: 'p', color: 'b' },
    accentColor: '#718675',
    depth: 1,
    randomness: 0.78,
    aggression: 0.3,
    timeBudgetMs: 60,
    blunderRate: 0.38,
    useBook: false,
    useQuiescence: false
  },
  {
    id: 'bot-tito-600',
    name: 'Tito',
    elo: 600,
    tier: 'Baru Bermain Catur',
    playstyle: 'Pemberani',
    taglineId: 'Suka menyerang sejak awal',
    descriptionId:
      'Gemar mendorong pion dan mengeluarkan Menteri lebih awal. Serangannya bisa merepotkan jika lengah, namun mudah dihukum dengan pengembangan rapi.',
    avatarPiece: { type: 'n', color: 'w' },
    accentColor: '#667C6B',
    depth: 1,
    randomness: 0.62,
    aggression: 0.68,
    timeBudgetMs: 75,
    blunderRate: 0.24,
    useBook: false,
    useQuiescence: false
  },

  // 2. Menengah (800 - 1300)
  {
    id: 'bot-bima-800',
    name: 'Bima',
    elo: 800,
    tier: 'Menengah',
    playstyle: 'Seimbang',
    taglineId: 'Paham nilai materi & rokade',
    descriptionId:
      'Aktif menangkap perwira yang tidak terjaga dan menjaga keamanan raja, meski masih terkecoh oleh kombinasi garpu atau tusuk sate 2 langkah.',
    avatarPiece: { type: 'n', color: 'b' },
    accentColor: '#5D7463',
    depth: 2,
    randomness: 0.45,
    aggression: 0.42,
    timeBudgetMs: 95,
    blunderRate: 0.14,
    useBook: false,
    useQuiescence: false
  },
  {
    id: 'bot-citra-1050',
    name: 'Citra',
    elo: 1050,
    tier: 'Menengah',
    playstyle: 'Solid',
    taglineId: 'Rapi di pembukaan klasik',
    descriptionId:
      'Mengembangkan kuda dan gajah secara disiplin sebelum menyerang. Cocok untuk menguji kestabilan repertoar pembukaan Anda.',
    avatarPiece: { type: 'b', color: 'w' },
    accentColor: '#526857',
    depth: 2,
    randomness: 0.3,
    aggression: 0.35,
    timeBudgetMs: 120,
    blunderRate: 0.08,
    useBook: true,
    useQuiescence: false
  },
  {
    id: 'bot-saras-1300',
    name: 'Saras',
    elo: 1300,
    tier: 'Menengah',
    playstyle: 'Taktis',
    taglineId: 'Cepat menghukum blunder kecil',
    descriptionId:
      'Menguasai jalur utama pembukaan populer dan sigap menghukum perwira gantung maupun ancaman baris belakang.',
    avatarPiece: { type: 'b', color: 'b' },
    accentColor: '#495E4E',
    depth: 2,
    randomness: 0.2,
    aggression: 0.58,
    timeBudgetMs: 150,
    blunderRate: 0.03,
    useBook: true,
    useQuiescence: false
  },

  // 3. Lanjutan (1500 - 1900)
  {
    id: 'bot-dimas-1500',
    name: 'Dimas',
    elo: 1500,
    tier: 'Lanjutan',
    playstyle: 'Agresif',
    taglineId: 'Tajam dalam taktik sayap raja',
    descriptionId:
      'Menghitung pertukaran taktis dengan quiescence search dan gemar membuka lajur untuk menyerang posisi rokade lawan.',
    avatarPiece: { type: 'r', color: 'w' },
    accentColor: '#8B6F56',
    depth: 3,
    randomness: 0.14,
    aggression: 0.74,
    timeBudgetMs: 190,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },
  {
    id: 'bot-bagas-1700',
    name: 'Bagas',
    elo: 1700,
    tier: 'Lanjutan',
    playstyle: 'Posisional',
    taglineId: 'Pengendali lajur terbuka & ruang',
    descriptionId:
      'Menghargai pasangan gajah, struktur pion sehat, dan penempatan benteng pada lajur terbuka untuk menekan perlahan.',
    avatarPiece: { type: 'r', color: 'b' },
    accentColor: '#7D6048',
    depth: 3,
    randomness: 0.09,
    aggression: 0.45,
    timeBudgetMs: 240,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },
  {
    id: 'bot-rania-1900',
    name: 'Rania',
    elo: 1900,
    tier: 'Lanjutan',
    playstyle: 'Dinamis',
    taglineId: 'Kalkulasi kombinasi 3 langkah',
    descriptionId:
      'Pemain turnamen tangguh yang memadukan teori pembukaan tajam dengan serangan balik cepat saat lawan terlalu pasif.',
    avatarPiece: { type: 'q', color: 'w' },
    accentColor: '#9E5840',
    depth: 3,
    randomness: 0.06,
    aggression: 0.66,
    timeBudgetMs: 280,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },

  // 4. Master (2100 - 2400)
  {
    id: 'bot-hendra-2100',
    name: 'FM Hendra',
    elo: 2100,
    tier: 'Master',
    playstyle: 'Klasik',
    taglineId: 'FIDE Master berdisiplin tinggi',
    descriptionId:
      'Memainkan jalur pembukaan utama secara akurat, menjaga koordinasi perwira, dan sangat teliti dalam transisi menuju babak akhir.',
    avatarPiece: { type: 'q', color: 'b' },
    accentColor: '#B85D43',
    depth: 3,
    randomness: 0.03,
    aggression: 0.52,
    timeBudgetMs: 320,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },
  {
    id: 'bot-kartika-2250',
    name: 'IM Kartika',
    elo: 2250,
    tier: 'Master',
    playstyle: 'Penyerang',
    taglineId: 'International Master taktis',
    descriptionId:
      'Selalu mencari inisiatif aktif, memanfaatkan kelemahan warna petak dan pion bebas untuk mendikte ritme permainan.',
    avatarPiece: { type: 'k', color: 'w' },
    accentColor: '#A24B34',
    depth: 4,
    randomness: 0.02,
    aggression: 0.72,
    timeBudgetMs: 360,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },
  {
    id: 'bot-arjuna-2400',
    name: 'GM Arjuna',
    elo: 2400,
    tier: 'Master',
    playstyle: 'Universal',
    taglineId: 'Grandmaster presisi penuh',
    descriptionId:
      'Menggabungkan evaluasi pion bebas, keamanan raja, dan pencarian alpha-beta dalam tanpa kompromi pada kesalahan taktis.',
    avatarPiece: { type: 'k', color: 'b' },
    accentColor: '#2F3531',
    depth: 4,
    randomness: 0.01,
    aggression: 0.6,
    timeBudgetMs: 400,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },

  // 5. Pemain Papan Atas (2600 - 2850)
  {
    id: 'bot-iskandar-2600',
    name: 'GM Iskandar',
    elo: 2600,
    tier: 'Pemain Papan Atas',
    playstyle: 'Strategis',
    taglineId: 'Elit 2600+ spesialis tekanan panjang',
    descriptionId:
      'Menumpuk keunggulan mikro posisional dari pembukaan hingga babak akhir dengan akurasi taktis nyaris sempurna.',
    avatarPiece: { type: 'r', color: 'b' },
    accentColor: '#272B29',
    depth: 4,
    randomness: 0,
    aggression: 0.56,
    timeBudgetMs: 430,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },
  {
    id: 'bot-larasati-2750',
    name: 'Super-GM Larasati',
    elo: 2750,
    tier: 'Pemain Papan Atas',
    playstyle: 'Tajam & Klinis',
    taglineId: 'Top 10 dunia gaya agresif modern',
    descriptionId:
      'Menguasai buku teori elit dan menghukum setiap ketidakakuratan sekecil apa pun dengan kalkulasi taktis beruntun.',
    avatarPiece: { type: 'q', color: 'b' },
    accentColor: '#1E211F',
    depth: 4,
    randomness: 0,
    aggression: 0.78,
    timeBudgetMs: 460,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  },
  {
    id: 'bot-pratama-2850',
    name: 'Apex Pratama',
    elo: 2850,
    tier: 'Pemain Papan Atas',
    playstyle: 'Puncak Dunia',
    taglineId: 'Standar Juara Dunia tanpa celah',
    descriptionId:
      'Puncak katalog Grandmaster Atelier. Pencarian alpha-beta mendalam, evaluasi struktur pion lengkap, dan konversi endgame klinis.',
    avatarPiece: { type: 'k', color: 'w' },
    accentColor: '#141615',
    depth: 5,
    randomness: 0,
    aggression: 0.65,
    timeBudgetMs: 490,
    blunderRate: 0,
    useBook: true,
    useQuiescence: true
  }
]

export function getTierForElo(elo: number): BotTierName {
  if (elo <= 650) return 'Baru Bermain Catur'
  if (elo <= 1350) return 'Menengah'
  if (elo <= 1950) return 'Lanjutan'
  if (elo <= 2450) return 'Master'
  return 'Pemain Papan Atas'
}

export function getBotsByTier(tier: BotTierName): BotCatalogEntry[] {
  return BOT_CATALOG.filter((b) => b.tier === tier)
}

export function getCatalogBotById(id: string): BotCatalogEntry {
  return BOT_CATALOG.find((b) => b.id === id) ?? BOT_CATALOG[4]!
}

/**
 * Generates a dynamically calibrated engine profile for any custom ELO from 250 to 3200.
 */
export function buildCustomEngineBot(rawElo: number): BotCatalogEntry {
  const elo = Math.max(250, Math.min(3200, Math.round(rawElo / 50) * 50))
  const tier = getTierForElo(elo)

  let depth = 1
  if (elo >= 2800) depth = 5
  else if (elo >= 2150) depth = 4
  else if (elo >= 1450) depth = 3
  else if (elo >= 750) depth = 2

  const blunderRate =
    elo >= 1450
      ? 0
      : Math.max(0, Math.min(0.6, ((1450 - elo) / 1200) ** 1.65 * 0.58))

  const randomness =
    elo >= 2400
      ? 0
      : Math.max(0, Math.min(0.95, ((2400 - elo) / 2150) ** 1.45 * 0.92))

  const timeBudgetMs = Math.round(
    elo <= 700
      ? 60
      : elo <= 1400
        ? 140
        : elo <= 2000
          ? 260
          : elo <= 2600
            ? 390
            : 500
  )

  const labelLevel =
    elo >= 2900
      ? 'Super-Engine Maksimum'
      : elo >= 2500
        ? 'Kalibrasi Super-GM'
        : elo >= 2000
          ? 'Kalibrasi Master'
          : elo >= 1400
            ? 'Kalibrasi Klub Kuat'
            : elo >= 800
              ? 'Kalibrasi Menengah'
              : 'Kalibrasi Pemula'

  return {
    id: `custom-engine-${elo}`,
    name: `Mesin Atelier ${elo}`,
    elo,
    tier,
    playstyle: labelLevel,
    taglineId: `Kekuatan mesin bebas yang dikalibrasi pada ${elo} ELO`,
    descriptionId: `Engine kustom ${elo} ELO dengan kedalaman pencarian ${depth} ply, evaluasi posisional penuh, dan batas waktu non-blocking ${timeBudgetMs} ms.`,
    avatarPiece: {
      type: elo >= 2500 ? 'k' : elo >= 1800 ? 'q' : elo >= 1200 ? 'r' : elo >= 700 ? 'n' : 'p',
      color: 'b'
    },
    accentColor: elo >= 2500 ? '#18181B' : elo >= 1800 ? '#B85D43' : '#526857',
    depth,
    randomness,
    aggression: elo >= 2200 ? 0.65 : 0.5,
    timeBudgetMs,
    blunderRate,
    useBook: elo >= 1050,
    useQuiescence: elo >= 1400
  }
}
