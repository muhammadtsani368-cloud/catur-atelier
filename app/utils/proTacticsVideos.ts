import { Chess } from 'chess.js'
import type { PreviewMoveMotion } from '~/utils/repertoirePreview'

export type TacticVideoCategory =
  | 'Pengorbanan'
  | 'Skakmat'
  | 'Taktik Pembukaan'
  | 'Babak Akhir'

export interface ProTacticsVideo {
  id: string
  title: string
  player: string
  opponent: string
  year: number
  category: TacticVideoCategory
  youtubeId: string
  duration: string
  summaryId: string
  fen: string
  keyMoveSan: string
  orientation: 'w' | 'b'
  demoStartFen: string
  demoMoves: string[]
  demoKeyPly: number // 1-based ply index of the signature brilliant move inside demoMoves
}

export const TACTIC_VIDEO_CATEGORIES: TacticVideoCategory[] = [
  'Pengorbanan',
  'Skakmat',
  'Taktik Pembukaan',
  'Babak Akhir'
]

export const PRO_TACTICS_VIDEOS: ProTacticsVideo[] = [
  {
    id: 'carlsen-karjakin-2016',
    title: 'Pengorbanan Menteri Penentu Juara Dunia (50. Qh6+!!)',
    player: 'Magnus Carlsen',
    opponent: 'Sergey Karjakin',
    year: 2016,
    category: 'Skakmat',
    youtubeId: 'UwIe74Xue7E',
    duration: '08:14',
    summaryId:
      'Pada tiebreak final Kejuaraan Dunia 2016 di New York, Carlsen menutup partai secara artistik lewat 50. Qh6+!! yang memaksa skakmat dalam dua langkah, baik setelah Kxh6 (Rh8#) maupun gxh6 (Rxf7#).',
    fen: '2R5/2R2ppk/4p3/p2pPP2/3P1Q1P/q5P1/r7/7K w - - 0 50',
    keyMoveSan: 'Qh6+',
    orientation: 'w',
    demoStartFen: '2R5/2R2ppk/4p3/p2pPP2/3P1Q1P/q5P1/r7/7K w - - 0 50',
    demoMoves: ['Qh6+', 'Kxh6', 'Rh8#'],
    demoKeyPly: 1
  },
  {
    id: 'kasparov-topalov-1999',
    title: 'Kasparov Immortal: Pengorbanan Benteng 24. Rxd4!!',
    player: 'Garry Kasparov',
    opponent: 'Veselin Topalov',
    year: 1999,
    category: 'Pengorbanan',
    youtubeId: 'uDi6s89ooak',
    duration: '14:26',
    summaryId:
      'Salah satu kombinasi serangan terdalam dalam sejarah catur di Wijk aan Zee. Pengorbanan benteng 24. Rxd4!! menarik Raja Hitam keluar dari perlindungan untuk perburuan raja melintasi seluruh papan.',
    fen: 'b2r3r/k4p1p/p2q1np1/NppP4/3p1Q2/P4PPB/1PP4P/1K1RR3 w - - 1 24',
    keyMoveSan: 'Rxd4',
    orientation: 'w',
    demoStartFen: 'b2r3r/k3qp1p/pn3np1/Npp5/3pPQ2/P1N2PPB/1PP4P/1K1RR3 w - - 0 22',
    demoMoves: [
      'Nd5', 'Nbxd5', 'exd5', 'Qd6', 'Rxd4', 'cxd4', 'Re7+', 'Kb6',
      'Qxd4+', 'Kxa5', 'b4+', 'Ka4', 'Qc3', 'Qxd5', 'Ra7'
    ],
    demoKeyPly: 5
  },
  {
    id: 'fischer-byrne-1956',
    title: 'Game of the Century: Pengorbanan Menteri 17... Be6!!',
    player: 'Bobby Fischer',
    opponent: 'Donald Byrne',
    year: 1956,
    category: 'Pengorbanan',
    youtubeId: 'A82NI_42kgY',
    duration: '12:48',
    summaryId:
      'Di usia 13 tahun, Bobby Fischer membiarkan Menterinya di b6 tetap terancam lewat 17... Be6!! demi memicu kincir angin taktis (windmill) yang menghancurkan seluruh pertahanan Putih.',
    fen: 'r3r1k1/pp3pbp/1qp3p1/2B5/2BP2b1/Q1n2N2/P4PPP/3R1K1R b - - 3 17',
    keyMoveSan: 'Be6',
    orientation: 'b',
    demoStartFen: 'r4rk1/pp2Bpbp/1qp3p1/8/3Pn1b1/Q1P2N2/P4PPP/3RKB1R w K - 1 15',
    demoMoves: [
      'Bc4', 'Nxc3', 'Bc5', 'Rfe8+', 'Kf1', 'Be6', 'Bxb6', 'Bxc4+',
      'Kg1', 'Ne2+', 'Kf1', 'Nxd4+', 'Kg1', 'Ne2+', 'Kf1', 'Nc3+', 'Kg1', 'axb6'
    ],
    demoKeyPly: 6
  },
  {
    id: 'tal-tringov-1964',
    title: 'Mikhail Tal Menghancurkan Pertahanan Modern dengan Bxf7+!',
    player: 'Mikhail Tal',
    opponent: 'Georgi Tringov',
    year: 1964,
    category: 'Taktik Pembukaan',
    youtubeId: '7sAILzAWTUw',
    duration: '09:35',
    summaryId:
      'Saat Hitam terlalu serakah memakan pion b2 dan c3 di pembukaan, Sang Penyihir dari Riga meledakkan petak lemah f7 dengan 15. Bxf7+! untuk membongkar Raja yang belum rokade.',
    fen: 'r1b1k1nr/1p1n1pbp/p1pQ2p1/4p3/2B1PB2/2q2N2/P1P2PPP/1R1R2K1 w kq - 2 15',
    keyMoveSan: 'Bxf7+',
    orientation: 'w',
    demoStartFen: 'rnb1k1nr/1p3pbp/p1p3p1/q3p3/2B1PB2/2N2N2/P1PQ1PPP/1R2R1K1 w kq - 0 13',
    demoMoves: ['Qd6', 'Qxc3', 'Red1', 'Nd7', 'Bxf7+', 'Kxf7', 'Ng5+', 'Ke8', 'Qe6+', 'Kd8', 'Nf7+'],
    demoKeyPly: 5
  },
  {
    id: 'tal-toran-1961',
    title: 'Serangan Badai Sayap Raja Mikhail Tal (Nf5!)',
    player: 'Mikhail Tal',
    opponent: 'Roman Toran Albero',
    year: 1961,
    category: 'Pengorbanan',
    youtubeId: 'agbdHNV-g4w',
    duration: '10:18',
    summaryId:
      'Menolak hasil remis yang membosankan, Tal mengorbankan materi di sayap raja melalui lompatan kuda 19. Nf5! untuk membuka lajur g dan memaksa seluruh perwira Hitam bertahan pasif.',
    fen: 'r1b2rk1/2q1bnnp/p2p1pp1/1ppPp3/4P1P1/2P2NNP/PPB2P1K/R1BQ2R1 w - - 2 19',
    keyMoveSan: 'Nf5',
    orientation: 'w',
    demoStartFen: 'r1bn1rk1/2q1b1np/p2p1pp1/1ppPp3/4P1P1/2P2NNP/PPB2P1K/R1BQR3 w - - 0 18',
    demoMoves: ['Rg1', 'Nf7', 'Nf5', 'gxf5', 'gxf5', 'Kh8', 'Nh4', 'Rg8', 'Ng6+'],
    demoKeyPly: 3
  },
  {
    id: 'polgar-kasparov-2002',
    title: 'Judit Polgar Menaklukkan Kasparov di Babak Akhir Benteng',
    player: 'Judit Polgar',
    opponent: 'Garry Kasparov',
    year: 2002,
    category: 'Babak Akhir',
    youtubeId: 'uX5lGf4jUyg',
    duration: '11:42',
    summaryId:
      'Momen bersejarah di Moskow saat Judit Polgar mendominasi babak akhir benteng dari Pertahanan Berlin dan menutup ruang Raja Kasparov dengan skak presisi 36. Rc6+.',
    fen: '2k4r/p5p1/1p1R4/2pR1P2/2P1K3/7r/PP3P2/8 w - - 0 36',
    keyMoveSan: 'Rc6+',
    orientation: 'w',
    demoStartFen: '2k4r/pp4p1/3R4/2pR1P2/2P5/8/PP3PKr/8 w - - 5 34',
    demoMoves: ['Kf3', 'R2h3+', 'Ke4', 'b6', 'Rc6+', 'Kb7', 'Rcd6', 'R3h4+', 'Ke5', 'Re8+', 'Re6'],
    demoKeyPly: 5
  },
  {
    id: 'polgar-kasparov-1994',
    title: 'Duel Tajam Sisilia Najdorf: Gelombang Pion 17. g5!',
    player: 'Judit Polgar',
    opponent: 'Garry Kasparov',
    year: 1994,
    category: 'Taktik Pembukaan',
    youtubeId: 'j5ut_uytScA',
    duration: '13:05',
    summaryId:
      'Pada Linares 1994, Judit Polgar melancarkan serangan sayap raja klasik Sisilia dengan 17. g5! untuk mengusir Kuda f6 dan merebut kendali diagonal gelap menuju benteng rokade Hitam.',
    fen: 'r2q1rk1/4bpp1/p3bn1p/3pp3/1p2P1PP/4BP2/PPPQN3/1K1R1B1R w - - 0 17',
    keyMoveSan: 'g5',
    orientation: 'w',
    demoStartFen: 'r2q1rk1/4bpp1/p2pbn1p/4p3/1p2P1P1/4BP2/PPPQN2P/1K1R1B1R w - - 2 16',
    demoMoves: ['h4', 'd5', 'g5', 'hxg5', 'hxg5', 'Nh5', 'exd5', 'Bf5', 'Ng3'],
    demoKeyPly: 3
  },
  {
    id: 'nakamura-rapport-tactic',
    title: 'Taktik Kilat Hikaru Nakamura: Lompatan Kuda Pusat Ne5!',
    player: 'Hikaru Nakamura',
    opponent: 'Richard Rapport',
    year: 2022,
    category: 'Taktik Pembukaan',
    youtubeId: 'TjJy7-_4OTQ',
    duration: '07:50',
    summaryId:
      'Hikaru Nakamura memanfaatkan pos terdepan (outpost) e5 dengan 11. Ne5! yang langsung menekan petak c6, membuka jalur diagonal gajah, dan menyiapkan ancaman taktis beruntun.',
    fen: 'r2q1rk1/pp2bppp/2n1bn2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 11',
    keyMoveSan: 'Ne5',
    orientation: 'w',
    demoStartFen: 'r2q1rk1/pp2bppp/2n1bn2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 11',
    demoMoves: ['Ne5', 'Nxe5', 'dxe5', 'Nd7', 'Qh5', 'g6', 'Qh6', 'Nxe5', 'Bc2'],
    demoKeyPly: 1
  },
  {
    id: 'nakamura-carlsen-2020',
    title: 'Grand Final 2020: Aktivasi Raja Babak Akhir Benteng',
    player: 'Hikaru Nakamura',
    opponent: 'Magnus Carlsen',
    year: 2020,
    category: 'Babak Akhir',
    youtubeId: 'YtuyBf40FmY',
    duration: '15:10',
    summaryId:
      'Pertarungan saraf babak akhir antara Nakamura dan Carlsen yang memperlihatkan prinsip emas endgame benteng: aktifkan Raja ke pusat (Ke3) sebelum mendorong pion bebas.',
    fen: '8/5pk1/4p1p1/3pP2p/1r1P1P2/3R2P1/5K1P/8 w - - 0 42',
    keyMoveSan: 'Ke3',
    orientation: 'w',
    demoStartFen: '8/5pk1/4p1p1/3pP2p/1r1P1P2/3R2P1/5K1P/8 w - - 0 42',
    demoMoves: ['Ke3', 'Rb2', 'Rd2', 'Rb3+', 'Rd3', 'Rb2', 'Rd2', 'Rb1', 'Kd3'],
    demoKeyPly: 1
  }
]

/**
 * Computes the exact from/to squares for MiniBoardPreview hover glide animation.
 */
export function getTacticVideoHoverMove(video: ProTacticsVideo): {
  hoverMove: PreviewMoveMotion | null
  highlights: string[]
} {
  try {
    const g = new Chess(video.fen)
    const m = g.move(video.keyMoveSan)
    return {
      hoverMove: { from: m.from, to: m.to, afterFen: g.fen() },
      highlights: [m.from, m.to]
    }
  } catch {
    return { hoverMove: null, highlights: [] }
  }
}

export interface DemoReplaySnapshot {
  ply: number
  fen: string
  lastMove: { from: string; to: string } | null
  san: string
  isKeyMove: boolean
}

/**
 * Generates full step-by-step snapshots for the interactive Demo Partai replay player.
 */
export function buildDemoReplaySnapshots(video: ProTacticsVideo): DemoReplaySnapshot[] {
  const g = new Chess(video.demoStartFen)
  const list: DemoReplaySnapshot[] = [
    {
      ply: 0,
      fen: g.fen(),
      lastMove: null,
      san: 'Posisi Awal',
      isKeyMove: false
    }
  ]

  video.demoMoves.forEach((san, idx) => {
    try {
      const m = g.move(san)
      list.push({
        ply: idx + 1,
        fen: g.fen(),
        lastMove: { from: m.from, to: m.to },
        san: m.san,
        isKeyMove: idx + 1 === video.demoKeyPly
      })
    } catch {
      // Skip any unexpected move gracefully
    }
  })

  return list
}
