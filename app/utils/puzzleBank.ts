import type { Color } from 'chess.js'

export type PuzzleThemeKey = 'Skakmat' | 'Garpu' | 'Pin' | 'Pengorbanan' | 'Babak Akhir'

export type PuzzleModeKey = 'daily' | 'unlimited' | 'rush' | 'battle' | 'custom'

export interface TacticalPuzzleItem {
  id: string
  number: number
  title: string
  theme: PuzzleThemeKey
  themeSubtitle: string
  rating: number
  side: Color
  fen: string
  solutionSan: string
  prompt: string
  explanation: string
  hint: string
}

export interface BattleRivalProfile {
  id: string
  name: string
  elo: number
  tagline: string
  avgSecondsPerSolve: number
}

export const PUZZLE_THEMES: ReadonlyArray<{ key: PuzzleThemeKey; label: string; subtitle: string }> = [
  { key: 'Skakmat', label: 'Skakmat', subtitle: 'CHECKMATE' },
  { key: 'Garpu', label: 'Garpu', subtitle: 'FORK' },
  { key: 'Pin', label: 'Pin', subtitle: 'PIN & SKEWER' },
  { key: 'Pengorbanan', label: 'Pengorbanan', subtitle: 'SACRIFICE' },
  { key: 'Babak Akhir', label: 'Babak Akhir', subtitle: 'ENDGAME' }
] as const

export const BATTLE_RIVALS: readonly BattleRivalProfile[] = [
  {
    id: 'rival-raka',
    name: 'Raka Pratama',
    elo: 1150,
    tagline: 'Cepat di pola skakmat dasar',
    avgSecondsPerSolve: 19
  },
  {
    id: 'rival-citra',
    name: 'Citra Maheswari',
    elo: 1450,
    tagline: 'Tajam dalam garpu & paku',
    avgSecondsPerSolve: 14
  },
  {
    id: 'rival-arya',
    name: 'Master Arya',
    elo: 1850,
    tagline: 'Kalkulasi cepat & pengorbanan',
    avgSecondsPerSolve: 10
  }
] as const

export const PUZZLE_BANK: TacticalPuzzleItem[] = [
  {
    id: 'pz-01-back-rank',
    number: 1,
    title: 'Skakmat Baris Belakang',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating: 850,
    side: 'w',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionSan: 'Rd8#',
    prompt: 'Raja Hitam terkurung oleh tiga pionnya sendiri. Tuntaskan dalam satu langkah!',
    explanation: 'Rd8#! Skakmat baris belakang klasik saat pion f7-g7-h7 menutup jalan napas Raja.',
    hint: 'Dorong Benteng d1 langsung ke baris ke-8.'
  },
  {
    id: 'pz-02-queen-kiss',
    number: 2,
    title: 'Skakmat Ciuman Menteri',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating: 900,
    side: 'w',
    fen: '6k1/5p1p/6p1/8/8/5B2/5PPP/4Q1K1 w - - 0 1',
    solutionSan: 'Qe8+',
    prompt: 'Manfaatkan kelemahan petak gelap di baris belakang Hitam!',
    explanation: 'Qe8+! Memaksa Raja Hitam terpojok ke g7 di bawah kendali Menteri dan Gajah.',
    hint: 'Terobos baris ke-8 menggunakan Menteri e1.'
  },
  {
    id: 'pz-03-royal-fork',
    number: 3,
    title: 'Garpu Kerajaan (Royal Fork)',
    theme: 'Garpu',
    themeSubtitle: 'FORK',
    rating: 950,
    side: 'w',
    fen: 'r3k3/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQq - 0 1',
    solutionSan: 'Nxc7+',
    prompt: 'Serang Raja dan Benteng Hitam sekaligus dengan satu lompatan kuda!',
    explanation: 'Nxc7+! Garpu ganda klasik yang memaksa Raja bergeser dan langsung merebut Benteng a8.',
    hint: 'Lompatkan Kuda d5 ke petak c7 yang tidak terjaga.'
  },
  {
    id: 'pz-04-scholar-finish',
    number: 4,
    title: 'Serangan Kilat Petak f7',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating: 1000,
    side: 'w',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solutionSan: 'Qxf7#',
    prompt: 'Petak lemah f7 hanya dijaga Raja Hitam. Selesaikan partai sekarang!',
    explanation: 'Qxf7#! Menteri dilindungi penuh oleh Gajah c4 sehingga Raja Hitam tidak bisa membalas.',
    hint: 'Ambil pion f7 dengan Menteri h5.'
  },
  {
    id: 'pz-05-opera-mate',
    number: 5,
    title: 'Skakmat Opera Paul Morphy',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating: 1100,
    side: 'w',
    fen: '1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 1',
    solutionSan: 'Rd8#',
    prompt: 'Manfaatkan Gajah g5 yang menjaga petak pelarian e7!',
    explanation: 'Rd8#! Pola Opera Mate legendaris dari partai Paul Morphy di Paris 1858.',
    hint: 'Lunurkan Benteng d1 ke petak d8.'
  },
  {
    id: 'pz-06-knight-queen-fork',
    number: 6,
    title: 'Garpu Kuda Merebut Menteri',
    theme: 'Garpu',
    themeSubtitle: 'FORK',
    rating: 1150,
    side: 'w',
    fen: '4k3/ppp2ppp/8/2q5/3N4/8/PPP2PPP/4R1K1 w - - 0 1',
    solutionSan: 'Nb3+',
    prompt: 'Temukan langkah kuda berskak terbuka yang mengancam Menteri c5!',
    explanation: 'Nb3+! Benteng e1 memberi skak terbuka pada Raja e8 sementara Kuda b3 langsung menyerang Menteri c5.',
    hint: 'Pindahkan Kuda d4 agar membuka lajur e sekaligus menyerang Menteri c5.'
  },
  {
    id: 'pz-07-pin-queen',
    number: 7,
    title: 'Paku Benteng Memenangkan Menteri',
    theme: 'Pin',
    themeSubtitle: 'PIN & SKEWER',
    rating: 1200,
    side: 'w',
    fen: '3k4/ppp2ppp/8/3q4/8/2P5/PP3PPP/4RBK1 w - - 0 1',
    solutionSan: 'Rd1',
    prompt: 'Menteri dan Raja Hitam sejajar pada lajur d. Kunci posisinya!',
    explanation: 'Rd1! Paku absolut pada lajur d membuat Menteri d5 terikat mati ke Raja d8.',
    hint: 'Geser Benteng e1 ke lajur d.'
  },
  {
    id: 'pz-08-black-back-rank',
    number: 8,
    title: 'Balasan Baris Belakang Hitam',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating: 1250,
    side: 'b',
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/5RK1 b - - 0 1',
    solutionSan: 'Re1',
    prompt: 'Giliran Hitam! Paksa pertukaran atau rebut baris pertama dengan langkah taktis.',
    explanation: 'Re1! Memaku Benteng f1 secara mutlak; jika Putih lengah, baris pertama langsung runtuh.',
    hint: 'Turunkan Benteng e8 ke petak e1.'
  },
  {
    id: 'pz-09-skewer-rook',
    number: 9,
    title: 'Tusuk Sate Gajah (Skewer)',
    theme: 'Pin',
    themeSubtitle: 'PIN & SKEWER',
    rating: 1300,
    side: 'w',
    fen: '6k1/5pp1/7p/8/8/2B5/5PPP/r5K1 w - - 0 1',
    solutionSan: 'Bxa1',
    prompt: 'Benteng Hitam terlalu rakus di baris pertama. Hukum segera!',
    explanation: 'Bxa1! Gajah c3 mengawasi diagonal panjang a1-h8 dan langsung merebut Benteng gratis.',
    hint: 'Periksa diagonal panjang dari Gajah c3 menuju sudut a1.'
  },
  {
    id: 'pz-10-endgame-promotion',
    number: 10,
    title: 'Terobosan Pion Promosi',
    theme: 'Babak Akhir',
    themeSubtitle: 'ENDGAME',
    rating: 1350,
    side: 'w',
    fen: '8/4P3/8/8/8/1k6/8/4K3 w - - 0 1',
    solutionSan: 'e8=Q',
    prompt: 'Pion putih tinggal satu langkah lagi menuju promosi. Wujudkan Menteri!',
    explanation: 'e8=Q! Promosi pion menjadi Menteri langsung mengamankan kemenangan babak akhir.',
    hint: 'Majukan pion e7 ke petak promosi e8 dan pilih Menteri.'
  },
  {
    id: 'pz-11-queen-fork-double',
    number: 11,
    title: 'Garpu Menteri Diagonal Panjang',
    theme: 'Garpu',
    themeSubtitle: 'FORK',
    rating: 1400,
    side: 'w',
    fen: 'r3k2r/ppp2ppp/8/8/3Q4/8/PPP2PPP/R3K2R w KQkq - 0 1',
    solutionSan: 'Qxg7',
    prompt: 'Serang pion g7 sekaligus mengancam Benteng di sudut h8!',
    explanation: 'Qxg7! Menghancurkan struktur sayap raja Hitam dan mengancam Benteng h8 secara langsung.',
    hint: 'Menteri d4 memiliki jalur bebas menuju pion g7.'
  },
  {
    id: 'pz-12-smothered-mate',
    number: 12,
    title: 'Skakmat Tercekik (Smothered Mate)',
    theme: 'Skakmat',
    themeSubtitle: 'CHECKMATE',
    rating: 1450,
    side: 'w',
    fen: '5r1k/6pp/7N/8/8/8/5PPP/6K1 w - - 0 1',
    solutionSan: 'Nf7+',
    prompt: 'Mulai jaring skakmat klasik di sudut papan dengan lompatan kuda!',
    explanation: 'Nf7+! Memaksa Raja keluar ke g8 dan merebut kendali mutlak atas petak kritis di sekitar Benteng f8.',
    hint: 'Lompatkan Kuda h6 ke f7 dengan skak.'
  },
  {
    id: 'pz-13-black-knight-fork',
    number: 13,
    title: 'Garpu Kuda Hitam di c2',
    theme: 'Garpu',
    themeSubtitle: 'FORK',
    rating: 1500,
    side: 'b',
    fen: '4k3/ppp2ppp/8/8/3n4/8/PPP2PPP/R3K2R b KQ - 0 1',
    solutionSan: 'Nxc2+',
    prompt: 'Giliran Hitam! Serang Raja dan Benteng a1 Putih dalam satu gerakan.',
    explanation: 'Nxc2+! Garpu ganda terhadap Raja e1 dan Benteng a1 yang langsung memenangkan kualitas penuh.',
    hint: 'Lompatkan Kuda d4 ke pion c2.'
  },
  {
    id: 'pz-14-lucena-bridge',
    number: 14,
    title: 'Kunci Posisi Lucena',
    theme: 'Babak Akhir',
    themeSubtitle: 'ENDGAME',
    rating: 1550,
    side: 'w',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    solutionSan: 'Rd1+',
    prompt: 'Usir Raja Hitam menjauh dari lajur d agar Raja Putih bisa keluar mendukung promosi!',
    explanation: 'Rd1+! Langkah kunci posisi Lucena untuk mendorong Raja Hitam ke lajur e sebelum membangun jembatan.',
    hint: 'Berikan skak dari lajur d dengan Benteng c1.'
  },
  {
    id: 'pz-15-bishop-pin-knight',
    number: 15,
    title: 'Paku Diagonal Mematikan',
    theme: 'Pin',
    themeSubtitle: 'PIN & SKEWER',
    rating: 1600,
    side: 'w',
    fen: 'r2qk2r/ppp2ppp/2n2n2/3p4/1b1P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 6',
    solutionSan: 'Bg5',
    prompt: 'Paku Kuda f6 Hitam ke Menterinya di d8 untuk membatasi gerak pusat!',
    explanation: 'Bg5! Paku klasik yang melumpuhkan Kuda f6 dan menciptakan tekanan berat pada pusat d5.',
    hint: 'Kembangkan Gajah c1 ke petak g5.'
  },
  {
    id: 'pz-16-greek-gift',
    number: 16,
    title: 'Pengorbanan Hadiah Yunani (Bxh7+)',
    theme: 'Pengorbanan',
    themeSubtitle: 'SACRIFICE',
    rating: 1650,
    side: 'w',
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/3P4/2PBPN2/PP3PPP/R1BQ1RK1 w - - 0 8',
    solutionSan: 'Bxh7+',
    prompt: 'Bongkar benteng Raja Hitam dengan pengorbanan gajah klasik!',
    explanation: 'Bxh7+! Memaksa Kxh7 lalu disusul Ng5+ yang membuka serangan mematikan ke sayap raja.',
    hint: 'Korbankan Gajah d3 langsung ke pion h7.'
  },
  {
    id: 'pz-17-carlsen-qh6',
    number: 17,
    title: 'Pengorbanan Menteri Carlsen',
    theme: 'Pengorbanan',
    themeSubtitle: 'SACRIFICE',
    rating: 1750,
    side: 'w',
    fen: '2R5/2R2ppk/4p3/p2pPP2/3P1Q1P/q5P1/r7/7K w - - 0 50',
    solutionSan: 'Qh6+',
    prompt: 'Temukan pengorbanan menteri penentu gelar Juara Dunia 2016!',
    explanation: '50. Qh6+!! Memaksa 50... Kxh6 51. Rh8# atau 50... gxh6 51. Rxf7# tanpa pertahanan.',
    hint: 'Tawarkan Menteri f4 di samping Raja Hitam pada petak h6.'
  },
  {
    id: 'pz-18-endgame-opposition',
    number: 18,
    title: 'Dorongan Pion Oposisi',
    theme: 'Babak Akhir',
    themeSubtitle: 'ENDGAME',
    rating: 1800,
    side: 'w',
    fen: '8/8/8/5k2/8/4PK2/8/8 w - - 0 1',
    solutionSan: 'e4+',
    prompt: 'Dorong pion pusat dengan tempo skak untuk memaksa Raja Hitam mundur!',
    explanation: 'e4+! Memaksa Raja Hitam menjauh sambil merebut ruang krusial di depan pion promosi.',
    hint: 'Majukan pion e3 satu petak ke e4 dengan skak.'
  },
  {
    id: 'pz-19-rook-endgame-cutoff',
    number: 19,
    title: 'Eksekusi Benteng Babak Akhir',
    theme: 'Babak Akhir',
    themeSubtitle: 'ENDGAME',
    rating: 1900,
    side: 'w',
    fen: '8/8/2k5/4P3/3K4/8/8/1R4r1 w - - 0 1',
    solutionSan: 'Rxg1',
    prompt: 'Benteng Hitam lengah di g1 tanpa perlindungan. Segera eksekusi!',
    explanation: 'Rxg1! Menghilangkan satu-satunya perwira pertahanan Hitam dan menjamin promosi pion e5.',
    hint: 'Ambil Benteng g1 langsung dengan Benteng b1.'
  },
  {
    id: 'pz-20-kasparov-rxd4',
    number: 20,
    title: 'Pengorbanan Benteng Kasparov 24. Rxd4!!',
    theme: 'Pengorbanan',
    themeSubtitle: 'SACRIFICE',
    rating: 2100,
    side: 'w',
    fen: 'b2r3r/k4p1p/p2q1np1/NppP4/3p1Q2/P4PPB/1PP4P/1K1RR3 w - - 1 24',
    solutionSan: 'Rxd4',
    prompt: 'Temukan pengorbanan benteng legendaris Garry Kasparov melawan Topalov (Wijk aan Zee 1999)!',
    explanation: '24. Rxd4!! Membongkar pusat secara paksa dan memulai perburuan Raja paling abadi dalam sejarah catur.',
    hint: 'Hancurkan pion d4 langsung dengan Benteng d1.'
  }
]

export function getDailyPuzzleForToday(): TacticalPuzzleItem {
  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return PUZZLE_BANK[seed % PUZZLE_BANK.length] ?? PUZZLE_BANK[0]!
}
