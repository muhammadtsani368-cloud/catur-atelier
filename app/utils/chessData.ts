export type ChessSide = 'w' | 'b'
export type ModuleCategory = 'opening' | 'endgame'
export type DifficultyLevel = 'Pemula' | 'Menengah' | 'Lanjutan'

export interface OpeningMoveNode {
  san: string
  explanation: string
  mistakeHint?: string
}

export interface OpeningLine {
  id: string
  name: string
  description: string
  moves: OpeningMoveNode[]
}

export interface OpeningModule {
  id: string
  title: string
  subtitle: string
  category: 'opening'
  side: ChessSide
  eco: string
  difficulty: DifficultyLevel
  summary: string
  keyThemes: string[]
  startingFen?: string
  lines: OpeningLine[]
  isCustom?: boolean
}

export interface EndgameScenario {
  id: string
  title: string
  side: ChessSide
  fen: string
  objective: string
  goalType: 'win' | 'draw'
  targetDrawPlies?: number
  recommendedFirstMoves: string[]
  coachingHint: string
  principles: string[]
}

export interface EndgameModule {
  id: string
  title: string
  subtitle: string
  category: 'endgame'
  side: ChessSide
  difficulty: DifficultyLevel
  summary: string
  keyThemes: string[]
  scenarios: EndgameScenario[]
}

export type RepertoireModule = OpeningModule | EndgameModule

export const CURATED_OPENINGS: OpeningModule[] = [
  {
    id: 'ruy-lopez-morphy',
    title: 'Ruy Lopez: Morphy Defense',
    subtitle: 'Jalur Utama & Variasi Berlin',
    category: 'opening',
    side: 'w',
    eco: 'C78 / C67',
    difficulty: 'Menengah',
    summary:
      'Pembukaan klasik para juara dunia. Putih menekan pusat secara sistematis dengan 3. Bb5, menciptakan keunggulan ruang jangka panjang sekaligus siap menghadapi tembok Berlin.',
    keyThemes: ['Tekanan Pusat e5', 'Struktur c3–d4', 'Profilaksis h3', 'Babak Akhir Berlin'],
    lines: [
      {
        id: 'ruy-morphy-main',
        name: 'Jalur Utama (Morphy Tertutup)',
        description: 'Menghadapi 3...a6 dengan manuver klasik Ba4–Bb3, c3, dan profilaksis h3.',
        moves: [
          {
            san: 'e4',
            explanation:
              'Klaim pusat secara langsung, membuka diagonal menteri dan gajah terang untuk pengembangan cepat.',
            mistakeHint: 'Mulailah dengan pion pusat klasik e4 untuk memasuki kompleks Ruy Lopez.'
          },
          {
            san: 'e5',
            explanation: 'Hitam membalas secara simetris demi memperebutkan petak d4 dan f4.'
          },
          {
            san: 'Nf3',
            explanation:
              'Mengembangkan kuda ke petak terbaiknya sambil menyerang pion e5 Hitam dengan tempo.',
            mistakeHint: 'Kembangkan kuda sayap raja untuk menekan pion e5 sekaligus menyiapkan rokade.'
          },
          {
            san: 'Nc6',
            explanation: 'Hitam mempertahankan pion e5 secara alami dengan mengembangkan kuda.'
          },
          {
            san: 'Bb5',
            explanation:
              'Langkah ciri khas Ruy Lopez! Gajah menekan kuda c6 yang menjaga pusat e5 dan mempersiapkan rokade cepat.',
            mistakeHint: 'Cari pengembangan gajah terang yang langsung menekan penjaga pion e5 di c6.'
          },
          {
            san: 'a6',
            explanation: 'Pertahanan Morphy: Hitam langsung menanyakan niat gajah Putih.'
          },
          {
            san: 'Ba4',
            explanation:
              'Mempertahankan ketegangan di diagonal a4–e8 tanpa menyerahkan pasangan gajah terlalu cepat.',
            mistakeHint: 'Pertahankan gajah aktif Anda dengan mundur satu petak menjaga pin diagonal.'
          },
          {
            san: 'Nf6',
            explanation: 'Hitam mengembangkan kuda sekaligus menyerang balik pion e4.'
          },
          {
            san: 'O-O',
            explanation:
              'Mengamankan raja terlebih dahulu! Pion e4 dilindungi secara taktis karena benteng siap menduduki lajur e.',
            mistakeHint: 'Jangan terlalu defensif terhadap pion e4; amankan raja dengan rokade pendek.'
          },
          {
            san: 'Be7',
            explanation: 'Hitam menutup lajur e dan bersiap rokade pendek.'
          },
          {
            san: 'Re1',
            explanation:
              'Melindungi pion e4 secara kokoh sehingga ancaman Bxc6 diikuti Nxe5 kini benar-benar nyata.',
            mistakeHint: 'Aktifkan benteng ke lajur e untuk melindungi pion e4 secara permanen.'
          },
          {
            san: 'b5',
            explanation: 'Hitam mengusir gajah untuk menetralkan ancaman taktis pada pion e5.'
          },
          {
            san: 'Bb3',
            explanation:
              'Gajah menempati diagonal strategis a2–g8 yang membidik langsung titik lemah f7 Hitam.',
            mistakeHint: 'Tarik gajah ke petak aman yang tetap membidik petak lemah f7.'
          },
          {
            san: 'd6',
            explanation: 'Hitam memperkuat pusat e5 secara solid.'
          },
          {
            san: 'c3',
            explanation:
              'Mempersiapkan dorongan pusat kuat d4 sekaligus menyediakan petak mundur c2 yang aman bagi gajah terang.',
            mistakeHint: 'Dukung rencana dorongan d4 sekaligus buka tempat perlindungan c2 untuk gajah.'
          },
          {
            san: 'O-O',
            explanation: 'Hitam mengamankan rajanya ke sayap raja.'
          },
          {
            san: 'h3',
            explanation:
              'Profilaksis penting! Mencegah Bg4 yang dapat mengganggu kuda f3 dan melemahkan kontrol Putih atas petak d4.',
            mistakeHint: 'Cegah gajah petak terang Hitam mendarat di g4 sebelum mendorong d4.'
          }
        ]
      },
      {
        id: 'ruy-berlin',
        name: 'Variasi Berlin (3...Nf6)',
        description: 'Membongkar Pertahanan Berlin dan memasuki babak akhir dengan mayoritas pion sayap raja.',
        moves: [
          {
            san: 'e4',
            explanation: 'Membuka permainan dengan kendali langsung di pusat.',
            mistakeHint: 'Mulai dengan 1. e4.'
          },
          {
            san: 'e5',
            explanation: 'Hitam menjawab secara simetris.'
          },
          {
            san: 'Nf3',
            explanation: 'Mengembangkan kuda sambil menekan pion e5.',
            mistakeHint: 'Kembangkan kuda ke f3.'
          },
          {
            san: 'Nc6',
            explanation: 'Hitam melindungi pion e5.'
          },
          {
            san: 'Bb5',
            explanation: 'Memasuki Ruy Lopez dengan tekanan ke c6.',
            mistakeHint: 'Mainkan 3. Bb5 untuk menekan kuda c6.'
          },
          {
            san: 'Nf6',
            explanation: 'Pertahanan Berlin: pilihan solid para Grandmaster untuk langsung menekan e4.'
          },
          {
            san: 'O-O',
            explanation:
              'Mengorbankan pion e4 secara sementara demi membuka lajur e terhadap raja Hitam yang belum rokade.',
            mistakeHint: 'Amankan raja dengan rokade pendek dan undang Hitam merebut e4.'
          },
          {
            san: 'Nxe4',
            explanation: 'Hitam menerima pion e4 untuk masuk ke struktur Berlin.'
          },
          {
            san: 'd4',
            explanation:
              'Langkah krusial! Membuka pusat dengan tempo saat kuda Hitam rentan di lajur e.',
            mistakeHint: 'Bongkar pusat segera dengan dorongan pion d untuk mengaktifkan perwira.'
          },
          {
            san: 'Nd6',
            explanation: 'Hitam menarik kuda sambil menyerang gajah b5.'
          },
          {
            san: 'Bxc6',
            explanation:
              'Menciptakan struktur pion tumpuk di sayap menteri Hitam sebelum merebut kembali pion e5.',
            mistakeHint: 'Tukar gajah dengan kuda c6 untuk merusak struktur pion lawan.'
          },
          {
            san: 'dxc6',
            explanation: 'Hitam merebut balik ke arah pusat dan membuka lajur d.'
          },
          {
            san: 'dxe5',
            explanation:
              'Merebut kembali pion dengan tempo serangan ke kuda d6 serta meraih mayoritas pion 4 vs 3 di sayap raja.',
            mistakeHint: 'Rebut pion e5 dengan pion d agar kuda Hitam terpaksa berpindah lagi.'
          },
          {
            san: 'Nf5',
            explanation: 'Kuda Hitam menuju petak aktif f5 dan menantang pertukaran menteri.'
          },
          {
            san: 'Qxd8+',
            explanation:
              'Memaksa raja Hitam kehilangan hak rokade dan memasuki Babak Akhir Berlin yang kaya nuansa strategis.',
            mistakeHint: 'Tukar menteri di d8 untuk menghilangkan hak rokade raja Hitam.'
          },
          {
            san: 'Kxd8',
            explanation: 'Raja Hitam terpaksa merebut di d8.'
          },
          {
            san: 'Nc3',
            explanation:
              'Mengembangkan kuda dengan cepat menuju pusat dan menyiapkan benteng Rd1+.',
            mistakeHint: 'Kembangkan perwira minor sayap menteri agar benteng segera terkoneksi.'
          }
        ]
      }
    ]
  },
  {
    id: 'sicilian-najdorf',
    title: 'Sicilian Defense: Najdorf',
    subtitle: 'Struktur Dinamis & Terobosan ...e5',
    category: 'opening',
    side: 'b',
    eco: 'B90 / B92',
    difficulty: 'Lanjutan',
    summary:
      'Senjata paling tajam dan ambisius bagi Hitam melawan 1. e4. Langkah 5...a6 mengamankan petak b5 sekaligus menyiapkan pukulan pusat ...e5 yang dinamis.',
    keyThemes: ['Kontrol Petak b5', 'Terobosan Pusat ...e5', 'Serangan Balik Lajur c', 'Pertarungan Petak d5'],
    lines: [
      {
        id: 'najdorf-english',
        name: 'Melawan Serangan Inggris (6. Be3)',
        description: 'Menjawab skema agresif Be3–f3–Qd2 dengan terobosan klasik 6...e5.',
        moves: [
          {
            san: 'e4',
            explanation: 'Putih membuka dengan langkah paling populer.'
          },
          {
            san: 'c5',
            explanation:
              'Pertahanan Sisilia! Memperebutkan petak d4 secara asimetris dengan pion sayap untuk menciptakan pertarungan dinamis.',
            mistakeHint: 'Lawan kendali pusat d4 Putih secara asimetris dengan pion c.'
          },
          {
            san: 'Nf3',
            explanation: 'Putih mengembangkan kuda dan menyiapkan pembukaan pusat d4.'
          },
          {
            san: 'd6',
            explanation:
              'Mengamankan petak e5 agar kuda f6 kelak tidak diusir, sekaligus membuka jalur gajah c8.',
            mistakeHint: 'Cegah dorongan e5 Putih dengan memajukan pion d satu petak.'
          },
          {
            san: 'd4',
            explanation: 'Putih membuka pusat memasuki Sisilia Terbuka.'
          },
          {
            san: 'cxd4',
            explanation:
              'Menukar pion sayap dengan pion pusat Putih agar Hitam mendapat mayoritas pion pusat serta lajur setengah terbuka c.',
            mistakeHint: 'Jangan biarkan Putih menguasai pusat; tukar pion c dengan pion d4.'
          },
          {
            san: 'Nxd4',
            explanation: 'Kuda Putih menempati posisi sentral yang kuat.'
          },
          {
            san: 'Nf6',
            explanation:
              'Mengembangkan kuda sambil menyerang pion e4 dengan tempo memaksa.',
            mistakeHint: 'Kembangkan kuda sayap raja dengan ancaman langsung pada pion e4.'
          },
          {
            san: 'Nc3',
            explanation: 'Putih mempertahankan e4 sekaligus mengawal petak d5.'
          },
          {
            san: 'a6',
            explanation:
              'Langkah legendaris Najdorf! Mengambil kendali petak b5 dari perwira Putih dan membuka fleksibilitas penuh bagi ...e5 maupun ...b5.',
            mistakeHint: 'Amankan petak b5 terlebih dahulu agar kuda dan gajah Putih tidak bisa menyerbu.'
          },
          {
            san: 'Be3',
            explanation: 'Putih memulai skema Serangan Inggris (Be3, f3, Qd2, O-O-O).'
          },
          {
            san: 'e5',
            explanation:
              'Pukulan pusat klasik Najdorf! Mengusir kuda dominan dari d4 dan merebut ruang pusat aktif walau harus mewaspadai petak d5.',
            mistakeHint: 'Langkah ini membiarkan kuda Putih terlalu nyaman di d4. Coba dorongan pusat yang langsung mengusir kuda tersebut.'
          },
          {
            san: 'Nb3',
            explanation: 'Kuda Putih mundur ke sayap menteri.'
          },
          {
            san: 'Be6',
            explanation:
              'Mengembangkan gajah ke diagonal aktif untuk menantang kontrol petak d5 dan mendukung rencana terobosan ...d5.',
            mistakeHint: 'Kembangkan gajah terang untuk membantu menjaga petak kritis d5.'
          },
          {
            san: 'f3',
            explanation: 'Putih mengokohkan e4 dan menyiapkan badai pion g4.'
          },
          {
            san: 'Be7',
            explanation:
              'Pengembangan harmonis yang mengawal g5 serta mempersiapkan rokade pendek secara aman.',
            mistakeHint: 'Kembangkan gajah gelap secara fleksibel untuk segera membuka jalan rokade.'
          },
          {
            san: 'Qd2',
            explanation: 'Putih menghubungkan benteng dan bersiap rokade panjang.'
          },
          {
            san: 'O-O',
            explanation:
              'Raja Hitam aman dan siap meluncurkan serangan balik cepat melalui ...Nbd7, ...b5, dan tekanan di lajur c.',
            mistakeHint: 'Amankan raja Anda sebelum memulai operasi balasan di sayap menteri.'
          }
        ]
      },
      {
        id: 'najdorf-classical',
        name: 'Melawan Variasi Klasik (6. Be2)',
        description: 'Mengambil ruang pusat dengan ...e5 terhadap pendekatan posisional 6. Be2.',
        moves: [
          { san: 'e4', explanation: 'Putih membuka permainan.' },
          {
            san: 'c5',
            explanation: 'Memasuki Pertahanan Sisilia.',
            mistakeHint: 'Mainkan 1...c5.'
          },
          { san: 'Nf3', explanation: 'Putih mengembangkan kuda.' },
          {
            san: 'd6',
            explanation: 'Mengawal petak e5.',
            mistakeHint: 'Mainkan 2...d6.'
          },
          { san: 'd4', explanation: 'Putih menantang pusat.' },
          {
            san: 'cxd4',
            explanation: 'Menukar pion sayap demi mayoritas pusat.',
            mistakeHint: 'Tukar pion di d4.'
          },
          { san: 'Nxd4', explanation: 'Kuda Putih merebut balik.' },
          {
            san: 'Nf6',
            explanation: 'Menyerang e4 dengan tempo pengembangan.',
            mistakeHint: 'Kembangkan kuda ke f6.'
          },
          { san: 'Nc3', explanation: 'Putih mempertahankan e4.' },
          {
            san: 'a6',
            explanation: 'Mengunci petak b5 khas Najdorf.',
            mistakeHint: 'Mainkan langkah profilaksis 5...a6.'
          },
          { san: 'Be2', explanation: 'Putih memilih jalur posisional klasik dengan 6. Be2.' },
          {
            san: 'e5',
            explanation:
              'Mengusir kuda dari pusat dan merebut ruang luas; struktur Boleslavsky memberi Hitam aktivitas perwira yang luar biasa.',
            mistakeHint: 'Usir kuda d4 dan klaim ruang pusat dengan pion e.'
          },
          { san: 'Nb3', explanation: 'Kuda mundur menjauh dari pusat.' },
          {
            san: 'Be7',
            explanation:
              'Mengembangkan gajah gelap sekaligus mengawal g5 dan mempersiapkan rokade cepat.',
            mistakeHint: 'Kembangkan gajah gelap ke petak solid untuk persiapan rokade.'
          },
          { san: 'O-O', explanation: 'Putih rokade pendek.' },
          {
            san: 'O-O',
            explanation:
              'Hitam ikut mengamankan raja agar benteng f8 siap mendukung posisi tengah.',
            mistakeHint: 'Amankan raja dengan rokade pendek.'
          },
          { san: 'Be3', explanation: 'Putih mengembangkan gajah menuju sayap menteri.' },
          {
            san: 'Be6',
            explanation:
              'Menetralkan pengaruh gajah Putih dan menjaga petak kunci d5 agar siap mendorong ...d5 pada momen tepat.',
            mistakeHint: 'Aktifkan gajah terang ke e6 untuk mengimbangi tekanan petak d5.'
          }
        ]
      }
    ]
  },
  {
    id: 'queens-gambit-declined',
    title: "Queen's Gambit Declined",
    subtitle: 'Serangan Minoritas & Kontrol Pusat',
    category: 'opening',
    side: 'w',
    eco: 'D35 / D53',
    difficulty: 'Pemula',
    summary:
      'Fondasi permainan posisional klasik bagi Putih. Pelajari cara membangun Struktur Carlsbad untuk Serangan Minoritas serta mempertahankan tekanan pusat yang konsisten.',
    keyThemes: ['Struktur Carlsbad', 'Serangan Minoritas b4–b5', 'Pin Gajah Bg5', 'Kontrol Petak e4'],
    lines: [
      {
        id: 'qgd-exchange',
        name: 'Variasi Pertukaran (Struktur Carlsbad)',
        description: 'Menciptakan struktur ideal untuk Serangan Minoritas di sayap menteri.',
        moves: [
          {
            san: 'd4',
            explanation:
              'Menguasai pusat dengan dukungan langsung menteri dan mengarahkan permainan ke strategi terstruktur.',
            mistakeHint: 'Mulailah dengan pion menteri 1. d4.'
          },
          { san: 'd5', explanation: 'Hitam mengimbangi ruang di pusat.' },
          {
            san: 'c4',
            explanation:
              'Gambit Menteri! Menekan pion d5 Hitam untuk merebut dominasi pusat penuh atau merusak struktur pion lawan.',
            mistakeHint: 'Tantang pion d5 Hitam dengan pion sayap c.'
          },
          { san: 'e6', explanation: 'Hitam menolak gambit dan mempertahankan d5 secara kokoh.' },
          {
            san: 'Nc3',
            explanation:
              'Menambah tekanan ke pusat d5 sekaligus menyiapkan kendali atas petak e4.',
            mistakeHint: 'Kembangkan kuda sayap menteri untuk menekan d5.'
          },
          { san: 'Nf6', explanation: 'Hitam memperkuat pertahanan petak d5.' },
          {
            san: 'cxd5',
            explanation:
              'Variasi Pertukaran! Menetapkan Struktur Carlsbad yang memberi Putih rencana jangka panjang sangat jelas: Serangan Minoritas b4–b5.',
            mistakeHint: 'Tukar pion c dengan d5 untuk mengunci Struktur Carlsbad.'
          },
          { san: 'exd5', explanation: 'Hitam merebut balik sambil membuka jalur gajah c8.' },
          {
            san: 'Bg5',
            explanation:
              'Mengeluarkan gajah gelap di luar rantai pion sebelum mendorong e3, sembari mengikat kuda f6.',
            mistakeHint: 'Keluarkan gajah gelap keluar dari rantai pion untuk mengikat kuda f6.'
          },
          { san: 'Be7', explanation: 'Hitam melepas pin secara solid.' },
          {
            san: 'e3',
            explanation:
              'Memperkuat pusat d4 dan membuka diagonal aktif bagi gajah terang di f1.',
            mistakeHint: 'Kokohkan pion d4 dan buka jalur bagi gajah terang.'
          },
          { san: 'c6', explanation: 'Hitam mempertebal pertahanan pion d5.' },
          {
            san: 'Bd3',
            explanation:
              'Menempatkan gajah terang di diagonal mematikan b1–h7 yang mengincar sayap raja Hitam.',
            mistakeHint: 'Kembangkan gajah terang ke diagonal aktif yang mengarah ke h7.'
          },
          { san: 'Nbd7', explanation: 'Hitam mengembangkan kuda dengan tetap membuka jalan bagi pion c.' },
          {
            san: 'Qc2',
            explanation:
              'Langkah posisional kelas atas: mengontrol petak e4 dan mencegah Hitam menukar gajah buruknya lewat ...Bf5.',
            mistakeHint: 'Tempatkan menteri pada diagonal b1–h7 untuk mengontrol e4 dan mencegah ...Bf5.'
          },
          { san: 'O-O', explanation: 'Hitam mengamankan rajanya.' },
          {
            san: 'Nf3',
            explanation:
              'Mengembangkan kuda sayap raja ke petak paling harmonis sambil mengawal e5.',
            mistakeHint: 'Selesaikan pengembangan kuda sayap raja untuk mempersiapkan rokade.'
          },
          { san: 'Re8', explanation: 'Hitam mengaktifkan benteng dan memberi ruang untuk ...Nf8.' },
          {
            san: 'O-O',
            explanation:
              'Raja aman, seluruh perwira terkoordinasi. Putih kini siap melancarkan rencana klasik Rb1 dan b4–b5!',
            mistakeHint: 'Amankan raja dengan rokade pendek untuk menghubungkan kedua benteng.'
          }
        ]
      },
      {
        id: 'qgd-orthodox',
        name: 'Kontrol Pusat Ortodoks (4. Bg5)',
        description: 'Menjaga ketegangan pusat dan memenangkan tempo dengan langkah menunggu 7. Rc1.',
        moves: [
          { san: 'd4', explanation: 'Membuka permainan di pusat.', mistakeHint: 'Mainkan 1. d4.' },
          { san: 'd5', explanation: 'Hitam membalas di d5.' },
          { san: 'c4', explanation: 'Menantang pusat d5.', mistakeHint: 'Mainkan 2. c4.' },
          { san: 'e6', explanation: 'Hitam mempertahankan d5.' },
          { san: 'Nc3', explanation: 'Menekan d5.', mistakeHint: 'Kembangkan kuda ke c3.' },
          { san: 'Nf6', explanation: 'Hitam menambah penjagaan d5.' },
          {
            san: 'Bg5',
            explanation:
              'Mempertahankan ketegangan di pusat sambil langsung mengikat kuda f6 terhadap menteri.',
            mistakeHint: 'Ikat kuda f6 terlebih dahulu sebelum menukar pion di pusat.'
          },
          { san: 'Be7', explanation: 'Hitam melepas pin.' },
          {
            san: 'e3',
            explanation: 'Memperkokoh pion d4 dan membuka jalan bagi gajah f1.',
            mistakeHint: 'Dorong pion e3 untuk mengokohkan struktur.'
          },
          { san: 'O-O', explanation: 'Hitam mengamankan raja.' },
          {
            san: 'Nf3',
            explanation: 'Menambah kontrol atas petak pusat e5 dan d4.',
            mistakeHint: 'Kembangkan kuda sayap raja ke f3.'
          },
          { san: 'Nbd7', explanation: 'Hitam menyelesaikan pengembangan kuda.' },
          {
            san: 'Rc1',
            explanation:
              'Langkah menunggu klasik! Mengaktifkan benteng ke lajur c yang akan segera terbuka, sambil memancing Hitam menentukan sikap dulu.',
            mistakeHint: 'Aktifkan benteng sayap menteri ke lajur c sebelum memindahkan gajah f1.'
          },
          { san: 'c6', explanation: 'Hitam memperkuat struktur d5.' },
          {
            san: 'Bd3',
            explanation:
              'Gajah terang meluncur ke diagonal aktif b1–h7 dengan koordinasi penuh menuju pusat dan sayap raja.',
            mistakeHint: 'Kembangkan gajah terang ke d3 agar siap rokade pendek.'
          }
        ]
      }
    ]
  },
  {
    id: 'caro-kann-classical',
    title: 'Caro-Kann Defense: Classical',
    subtitle: 'Struktur Pion Kokoh & Transisi Babak Akhir',
    category: 'opening',
    side: 'b',
    eco: 'B18 / B12',
    difficulty: 'Pemula',
    summary:
      'Pertahanan ultra-andal bagi Hitam melawan 1. e4. Hitam memecahkan masalah gajah c8 sejak awal dan membangun struktur pion tanpa kelemahan untuk unggul di babak akhir.',
    keyThemes: ['Gajah c8 Aktif di f5', 'Struktur Tanpa Kelemahan', 'Manuver ...h6 & ...Bh7', 'Serangan Balik ...c5'],
    lines: [
      {
        id: 'ck-classical-main',
        name: 'Variasi Klasik (4...Bf5)',
        description: 'Mengeluarkan gajah terang dengan tempo dan meredam inisiatif sayap raja Putih.',
        moves: [
          { san: 'e4', explanation: 'Putih mengklaim pusat.' },
          {
            san: 'c6',
            explanation:
              'Pertahanan Caro-Kann! Mempersiapkan dorongan kokoh ...d5 dengan dukungan pion tanpa menutup diagonal gajah c8.',
            mistakeHint: 'Persiapkan dukungan untuk dorongan ...d5 menggunakan pion c.'
          },
          { san: 'd4', explanation: 'Putih membangun pusat pion penuh.' },
          {
            san: 'd5',
            explanation:
              'Langsung menantang pion e4 Putih di pusat dengan struktur yang kokoh.',
            mistakeHint: 'Lanjutkan rencana Anda dengan menantang pusat melalui ...d5.'
          },
          { san: 'Nc3', explanation: 'Putih mempertahankan pion e4 dengan pengembangan.' },
          {
            san: 'dxe4',
            explanation:
              'Membersihkan pusat lebih awal agar gajah terang c8 segera memperoleh jalur bebas ke f5.',
            mistakeHint: 'Tukar pion di e4 untuk membuka jalan bagi perwira minor Anda.'
          },
          { san: 'Nxe4', explanation: 'Kuda Putih menempati pusat.' },
          {
            san: 'Bf5',
            explanation:
              'Langkah emas Caro-Kann Klasik! Mengeluarkan gajah terang dengan tempo menyerang kuda e4 sebelum menutup rantai pion dengan ...e6.',
            mistakeHint: 'Keluarkan gajah terang keluar dari rantai pion sambil menyerang kuda e4.'
          },
          { san: 'Ng3', explanation: 'Putih menarik kuda sambil menyerang gajah f5.' },
          {
            san: 'Bg6',
            explanation:
              'Mengamankan gajah pada diagonal h7–b1 sembari menjaga tekanan halus pada petak c2.',
            mistakeHint: 'Tarik gajah ke petak aman di diagonal yang sama (g6).'
          },
          { san: 'h4', explanation: 'Putih mengancam menjebak gajah dengan h5.' },
          {
            san: 'h6',
            explanation:
              'Langkah wajib yang krusial! Membuka petak pelarian h7 sebelum Putih sempat mendorong h5.',
            mistakeHint: 'Cegah gajah Anda terjebak oleh dorongan h5! Buka jalan mundur ke h7.'
          },
          { san: 'Nf3', explanation: 'Putih mengembangkan kuda dan mengincar petak e5.' },
          {
            san: 'Nd7',
            explanation:
              'Mengontrol petak e5 sehingga kuda Putih tidak dapat mendarat di Ne5 untuk menukar gajah g6 secara gratis.',
            mistakeHint: 'Kembangkan kuda sayap menteri ke petak yang langsung mengawal e5.'
          },
          { san: 'h5', explanation: 'Putih mendorong gajah mundur.' },
          {
            san: 'Bh7',
            explanation:
              'Gajah mundur dengan tenang ke tempat perlindungan aman yang sudah disiapkan.',
            mistakeHint: 'Mundurkan gajah ke petak pelarian yang sudah Anda siapkan di h7.'
          },
          { san: 'Bd3', explanation: 'Putih menawarkan pertukaran gajah petak terang.' },
          {
            san: 'Bxd3',
            explanation:
              'Menukar gajah terang secara menguntungkan; Hitam kini terbebas dari masalah ruang dan siap menyederhanakan permainan.',
            mistakeHint: 'Terima pertukaran gajah di d3 untuk mengurangi potensi serangan Putih.'
          },
          { san: 'Qxd3', explanation: 'Menteri Putih merebut balik di d3.' },
          {
            san: 'e6',
            explanation:
              'Mengunci struktur pion batu karang, membuka jalan gajah gelap f8, dan menyiapkan transisi babak akhir yang sangat menguntungkan bagi Hitam.',
            mistakeHint: 'Kunci struktur pusat secara kokoh sekaligus buka diagonal gajah gelap f8.'
          }
        ]
      },
      {
        id: 'ck-advance',
        name: 'Variasi Advance (3. e5)',
        description: 'Menghancurkan pusat panjang Putih melalui terobosan khas ...c5.',
        moves: [
          { san: 'e4', explanation: 'Putih membuka di pusat.' },
          { san: 'c6', explanation: 'Memasuki Caro-Kann.', mistakeHint: 'Mainkan 1...c6.' },
          { san: 'd4', explanation: 'Putih mengklaim ruang.' },
          { san: 'd5', explanation: 'Menantang pusat.', mistakeHint: 'Mainkan 2...d5.' },
          { san: 'e5', explanation: 'Putih mendorong e5 untuk mengambil keunggulan ruang.' },
          {
            san: 'Bf5',
            explanation:
              'Mengeluarkan gajah terang sebelum memainkan ...e6: inilah keunggulan utama Caro-Kann atas Pertahanan Prancis!',
            mistakeHint: 'Keluarkan gajah terang ke f5 sebelum menguncinya dengan ...e6.'
          },
          { san: 'Nf3', explanation: 'Putih mengembangkan kuda secara tenang.' },
          {
            san: 'e6',
            explanation:
              'Membangun rantai pion kokoh dan menyiapkan serangan balik cepat terhadap pangkal pion d4.',
            mistakeHint: 'Kokohkan pusat dengan ...e6 agar gajah f8 bisa segera aktif.'
          },
          { san: 'Be2', explanation: 'Putih menyiapkan rokade pendek.' },
          {
            san: 'c5',
            explanation:
              'Serangan balik utama! Menyerang pangkal rantai pion Putih di d4 untuk meruntuhkan keunggulan ruangnya.',
            mistakeHint: 'Jangan bermain terlalu pasif: serang pangkal rantai pion Putih di d4 dengan ...c5.'
          },
          { san: 'Be3', explanation: 'Putih mempertahankan d4.' },
          {
            san: 'cxd4',
            explanation:
              'Membuka lajur c bagi benteng dan memberi petak aktif c6 bagi kuda Hitam.',
            mistakeHint: 'Tukar pion c dengan d4 untuk membuka lajur aktif.'
          },
          { san: 'Nxd4', explanation: 'Kuda Putih merebut balik sambil mengincar gajah f5.' },
          {
            san: 'Ne7',
            explanation:
              'Pengembangan fleksibel menuju c6 atau g6 yang menjaga kendali penuh atas petak-petak gelap pusat.',
            mistakeHint: 'Kembangkan kuda sayap raja ke e7 agar bisa melompat ke c6 atau g6.'
          }
        ]
      }
    ]
  },
  {
    id: 'italian-game-giuoco-piano',
    title: 'Italian Game: Giuoco Piano & Fried Liver',
    subtitle: 'Pengembangan Harmonis & Serangan Cepat f7',
    category: 'opening',
    side: 'w',
    eco: 'C53 / C57',
    difficulty: 'Pemula',
    summary:
      'Pembukaan tertua dan paling intuitif dalam catur. Kuasai pendekatan strategis Giuoco Pianissimo (c3–d3) sekaligus serangan tajam 4. Ng5 melawan Pertahanan Dua Kuda.',
    keyThemes: ['Target Lemah f7', 'Struktur c3–d3', 'Manuver Nbd2–Nf1–Ng3', 'Serangan 4. Ng5'],
    lines: [
      {
        id: 'italian-pianissimo',
        name: 'Giuoco Pianissimo (c3–d3)',
        description: 'Membangun struktur pusat solid dan manuver perwira menuju serangan sayap raja.',
        moves: [
          {
            san: 'e4',
            explanation: 'Mengambil kendali pusat dan membuka diagonal menteri serta gajah terang.',
            mistakeHint: 'Mulai dengan pion pusat 1. e4.'
          },
          { san: 'e5', explanation: 'Hitam menjawab secara simetris.' },
          {
            san: 'Nf3',
            explanation: 'Mengembangkan kuda sambil menekan pion e5 Hitam.',
            mistakeHint: 'Kembangkan kuda sayap raja ke f3.'
          },
          { san: 'Nc6', explanation: 'Hitam melindungi pion e5.' },
          {
            san: 'Bc4',
            explanation:
              'Langkah khas Pembukaan Italia! Gajah langsung membidik titik terlemah Hitam di f7 dan mengawal petak pusat d5.',
            mistakeHint: 'Kembangkan gajah terang ke diagonal aktif yang membidik petak lemah f7.'
          },
          { san: 'Bc5', explanation: 'Hitam membalas secara aktif memasuki Giuoco Piano.' },
          {
            san: 'c3',
            explanation:
              'Mempersiapkan kendali pusat d4 sekaligus membuka jalan mundur aman bagi gajah terang di b3 atau c2.',
            mistakeHint: 'Dorong pion c3 untuk menyiapkan pusat kuat dan ruang mundur bagi gajah.'
          },
          { san: 'Nf6', explanation: 'Hitam mengembangkan kuda dan menekan pion e4.' },
          {
            san: 'd3',
            explanation:
              'Memilih jalur Giuoco Pianissimo: mempertahankan pusat secara kokoh tanpa terburu-buru membuka posisi.',
            mistakeHint: 'Lindungi pion e4 dengan tenang menggunakan pion d3.'
          },
          { san: 'd6', explanation: 'Hitam memperkuat e5 dan membuka jalur gajah c8.' },
          {
            san: 'O-O',
            explanation: 'Mengamankan raja sebelum memulai manuver perwira di pusat dan sayap raja.',
            mistakeHint: 'Amankan raja terlebih dahulu dengan rokade pendek.'
          },
          { san: 'a6', explanation: 'Hitam membuka tempat mundur Ba7 agar gajah tidak tertukar.' },
          {
            san: 'Bb3',
            explanation:
              'Menarik gajah secara preventif sebelum Hitam sempat memainkan ...Na5 untuk menukarnya.',
            mistakeHint: 'Tarik gajah ke b3 agar aman dari serangan kuda ...Na5.'
          },
          { san: 'Ba7', explanation: 'Hitam ikut mengamankan gajah gelapnya.' },
          {
            san: 'Nbd2',
            explanation:
              'Memulai rute manuver klasik Italia (Nbd2–Nf1–Ng3) menuju sayap raja tanpa menghalangi gajah c1.',
            mistakeHint: 'Kembangkan kuda sayap menteri ke d2 untuk rute klasik menuju f1 dan g3.'
          },
          { san: 'O-O', explanation: 'Hitam menyelesaikan pengembangan dengan rokade.' },
          {
            san: 'h3',
            explanation:
              'Langkah profilaksis penting untuk mencegah ...Bg4 serta menjaga stabilitas pusat Putih.',
            mistakeHint: 'Cegah gajah Hitam mengikat kuda f3 dari petak g4.'
          }
        ]
      },
      {
        id: 'italian-two-knights',
        name: 'Serangan Dua Kuda (4. Ng5)',
        description: 'Menghukum 3...Nf6 dengan tekanan langsung ke f7 dan merebut keunggulan pion pusat.',
        moves: [
          { san: 'e4', explanation: 'Membuka permainan di pusat.', mistakeHint: 'Mainkan 1. e4.' },
          { san: 'e5', explanation: 'Hitam membalas e5.' },
          { san: 'Nf3', explanation: 'Menekan e5.', mistakeHint: 'Mainkan 2. Nf3.' },
          { san: 'Nc6', explanation: 'Hitam mempertahankan e5.' },
          { san: 'Bc4', explanation: 'Membidik f7.', mistakeHint: 'Kembangkan gajah ke c4.' },
          { san: 'Nf6', explanation: 'Pertahanan Dua Kuda: Hitam langsung menyerang balik e4.' },
          {
            san: 'Ng5',
            explanation:
              'Serangan tajam! Kuda dan gajah bersama-sama mengancam merebut f7, memaksa Hitam merespons secara akurat.',
            mistakeHint: 'Gabungkan ancaman kuda dengan gajah c4 untuk langsung menyerang titik lemah f7.'
          },
          { san: 'd5', explanation: 'Satu-satunya balasan utama Hitam untuk memutus diagonal gajah c4.' },
          {
            san: 'exd5',
            explanation: 'Merebut pion pusat sambil membuka lajur e terhadap raja Hitam.',
            mistakeHint: 'Rebut pion d5 dengan pion e4.'
          },
          { san: 'Na5', explanation: 'Variasi Polerio: Hitam menyerang gajah c4 demi inisiatif.' },
          {
            san: 'Bb5+',
            explanation:
              'Memberi skak penting untuk mengacaukan koordinasi perwira Hitam sebelum mundur.',
            mistakeHint: 'Berikan skak dengan gajah di b5 agar Hitam terpaksa memblokir dengan c6.'
          },
          { san: 'c6', explanation: 'Hitam memblokir skak dan mengorbankan satu pion.' },
          {
            san: 'dxc6',
            explanation: 'Menerima pion tambahan sambil merusak struktur sayap menteri Hitam.',
            mistakeHint: 'Rebut pion c6.'
          },
          { san: 'bxc6', explanation: 'Hitam merebut balik dan menyerang gajah b5.' },
          {
            san: 'Be2',
            explanation:
              'Menarik gajah ke petak solid e2 untuk mengawal g4 dan mengkonsolidasikan keunggulan satu pion bersih.',
            mistakeHint: 'Mundurkan gajah ke petak paling aman dan fleksibel di e2.'
          },
          { san: 'h6', explanation: 'Hitam mengusir kuda g5.' },
          {
            san: 'Nf3',
            explanation: 'Menarik kuda kembali ke petak aktif f3 dengan tekanan langsung ke pion e5.',
            mistakeHint: 'Tarik kuda kembali ke pusat f3 sambil menekan pion e5.'
          },
          { san: 'e4', explanation: 'Hitam mendorong pion untuk mengusir kuda f3.' },
          {
            san: 'Ne5',
            explanation:
              'Kuda mendarat kuat di pos terdepan e5, mengganggu konsolidasi Hitam sambil menjaga keunggulan materi Putih.',
            mistakeHint: 'Lompatkan kuda ke petak pusat aktif e5!'
          }
        ]
      }
    ]
  },
  {
    id: 'london-system',
    title: 'London System: Piramida Kokoh',
    subtitle: 'Sistem Universal & Serangan Sayap Raja',
    category: 'opening',
    side: 'w',
    eco: 'D02 / A45',
    difficulty: 'Pemula',
    summary:
      'Sistem pembukaan modern yang sangat andal dan mudah dipelajari untuk Putih. Bangun piramida pion c3–d4–e3, kuasai petak e5, dan ketahui cara menghukum setup fianchetto.',
    keyThemes: ['Piramida c3–d4–e3', 'Gajah Aktif Bf4', 'Pos Terdepan e5', 'Serangan h4–h5'],
    lines: [
      {
        id: 'london-classic',
        name: 'Piramida Klasik Melawan ...d5',
        description: 'Setup inti London System dengan kontrol penuh atas petak e5 dan lajur h terbuka.',
        moves: [
          {
            san: 'd4',
            explanation: 'Mengambil kendali pusat dengan pion menteri untuk memasuki sistem London.',
            mistakeHint: 'Mulailah dengan 1. d4.'
          },
          { san: 'd5', explanation: 'Hitam mengimbangi pusat.' },
          {
            san: 'Bf4',
            explanation:
              'Ciri khas London System! Mengeluarkan gajah gelap di luar rantai pion sebelum mendorong e3.',
            mistakeHint: 'Keluarkan gajah petak gelap ke f4 sebelum menutup diagonalnya dengan e3.'
          },
          { san: 'Nf6', explanation: 'Hitam mengembangkan kuda secara alami.' },
          {
            san: 'e3',
            explanation: 'Membentuk sisi pertama piramida pion dan membuka jalur bagi gajah terang f1.',
            mistakeHint: 'Perkuat pion d4 dengan dorongan pion e3.'
          },
          { san: 'e6', explanation: 'Hitam membangun struktur solid.' },
          {
            san: 'Nf3',
            explanation: 'Mengontrol petak kunci e5 dan d4 sekaligus menyiapkan rokade.',
            mistakeHint: 'Kembangkan kuda sayap raja ke f3 untuk mengawal e5.'
          },
          { san: 'c5', explanation: 'Hitam langsung menantang pusat d4.' },
          {
            san: 'c3',
            explanation:
              'Menyempurnakan piramida pion c3–d4–e3 sehingga d4 kebal terhadap tekanan ...c5 dan ...Qb6.',
            mistakeHint: 'Sempurnakan segitiga pion London dengan c3 untuk menjaga d4.'
          },
          { san: 'Nc6', explanation: 'Hitam menambah tekanan pada pusat.' },
          {
            san: 'Nbd2',
            explanation:
              'Mengembangkan kuda sayap menteri ke d2 agar siap mendukung lompatan Ne5 dan menjaga fleksibilitas c3.',
            mistakeHint: 'Kembangkan kuda ke d2 (bukan c3) agar struktur piramida tetap utuh.'
          },
          { san: 'Bd6', explanation: 'Hitam menantang pertukaran gajah aktif Putih di f4.' },
          {
            san: 'Bg3',
            explanation:
              'Mundur elegan ke g3! Jika Hitam menukar ...Bxg3, Putih merebut dengan hxg3 dan langsung memperoleh lajur h terbuka untuk benteng.',
            mistakeHint: 'Tarik gajah ke g3 agar pertukaran membuka lajur h bagi benteng Putih.'
          },
          { san: 'O-O', explanation: 'Hitam mengamankan rajanya.' },
          {
            san: 'Bd3',
            explanation:
              'Gajah terang menempati diagonal menyerang b1–h7, melengkapi formasi ideal London System siap rokade dan Ne5!',
            mistakeHint: 'Tempatkan gajah terang di diagonal aktif b1–h7 (Bd3).'
          }
        ]
      },
      {
        id: 'london-jobava-ki',
        name: 'Serangan h4–h5 Melawan ...g6',
        description: 'Menghukum setup King’s Indian dengan dorongan agresif h4–h5.',
        moves: [
          { san: 'd4', explanation: 'Membuka permainan dengan pion menteri.', mistakeHint: 'Mainkan 1. d4.' },
          { san: 'Nf6', explanation: 'Hitam mengontrol pusat secara hipermodern.' },
          { san: 'Bf4', explanation: 'Mengembangkan gajah London ke f4.', mistakeHint: 'Kembangkan gajah ke f4.' },
          { san: 'g6', explanation: 'Hitam menyiapkan fianchetto gajah di g7.' },
          {
            san: 'Nc3',
            explanation:
              'Setup Jobava/Agresif! Menyiapkan kendali e4 dan memancing Hitam menentukan struktur pusat.',
            mistakeHint: 'Kembangkan kuda ke c3 untuk menguasai petak e4 dan d5.'
          },
          { san: 'd5', explanation: 'Hitam mencegah e4 dan mengklaim pusat.' },
          {
            san: 'e3',
            explanation: 'Mengokohkan d4 dan membuka diagonal gajah f1 serta menteri.',
            mistakeHint: 'Dorong pion e3 untuk struktur solid.'
          },
          { san: 'Bg7', explanation: 'Hitam menyelesaikan fianchetto.' },
          {
            san: 'h4',
            explanation:
              'Rencana menyerang langsung! Memanfaatkan pion g6 sebagai "kait" (hook) untuk membuka lajur h menuju raja Hitam.',
            mistakeHint: 'Manfaatkan pion g6 Hitam sebagai target serangan dengan mendorong pion h dua petak!'
          },
          { san: 'O-O', explanation: 'Hitam rokade langsung ke arah badai pion.' },
          {
            san: 'h5',
            explanation:
              'Membongkar pelindung raja Hitam! Setelah ...Nxh5 Rxh5 atau pertukaran di g6, serangan Putih di sayap raja sangat berbahaya.',
            mistakeHint: 'Lanjutkan serangan dengan mendorong pion h5 untuk membongkar benteng pion g6.'
          }
        ]
      }
    ]
  },
  {
    id: 'french-defense-classical',
    title: 'French Defense: Advance & Winawer',
    subtitle: 'Serangan Balik Rantai Pion ...c5 & Tekanan d4',
    category: 'opening',
    side: 'b',
    eco: 'C02 / C15',
    difficulty: 'Menengah',
    summary:
      'Pertahanan strategis penuh perlawanan balik melawan 1. e4. Hitam membiarkan Putih mengambil ruang awal lalu langsung menghancurkan pangkal rantai pion d4 dengan ...c5 dan ...Qb6.',
    keyThemes: ['Hancurkan Pangkal d4', 'Tekanan ...c5 & ...Qb6', 'Pin Winawer ...Bb4', 'Pertarungan Petak Terang'],
    lines: [
      {
        id: 'french-advance',
        name: 'Melawan Variasi Advance (3. e5)',
        description: 'Menghujani pion d4 Putih dengan kombinasi klasik ...c5, ...Nc6, dan ...Qb6.',
        moves: [
          { san: 'e4', explanation: 'Putih membuka di pusat.' },
          {
            san: 'e6',
            explanation:
              'Pertahanan Prancis! Mempersiapkan dorongan kokoh ...d5 dengan dukungan pion tanpa melemahkan petak f7.',
            mistakeHint: 'Persiapkan dorongan ...d5 secara solid melalui 1...e6.'
          },
          { san: 'd4', explanation: 'Putih membangun pusat pion penuh.' },
          {
            san: 'd5',
            explanation: 'Langsung menantang pion e4 dan memaksa Putih mengambil keputusan di pusat.',
            mistakeHint: 'Tantang pusat Putih segera dengan 2...d5.'
          },
          { san: 'e5', explanation: 'Variasi Advance: Putih mengunci pusat demi keunggulan ruang.' },
          {
            san: 'c5',
            explanation:
              'Pukulan wajib Pertahanan Prancis! Menyerang pangkal rantai pion Putih di d4 untuk meruntuhkan seluruh pusatnya.',
            mistakeHint: 'Segera serang pangkal rantai pion Putih di d4 dengan pion c!'
          },
          { san: 'c3', explanation: 'Putih memperkuat pangkal d4.' },
          {
            san: 'Nc6',
            explanation: 'Menambah tekanan langsung terhadap d4 sekaligus mengawal petak e5.',
            mistakeHint: 'Kembangkan kuda sayap menteri untuk menambah tekanan ke d4.'
          },
          { san: 'Nf3', explanation: 'Putih menambah penjagaan pada d4.' },
          {
            san: 'Qb6',
            explanation:
              'Langkah khas Prancis! Menteri menekan ganda d4 sekaligus membidik pion b2 sehingga gajah c1 Putih terikat tugas bertahan.',
            mistakeHint: 'Aktifkan menteri ke b6 untuk menekan ganda pion d4 dan b2.'
          },
          { san: 'a3', explanation: 'Putih menyiapkan b4 untuk mengambil ruang di sayap menteri.' },
          {
            san: 'c4',
            explanation:
              'Mengunci sayap menteri! Mencegah rencana b4 Putih, menciptakan kelemahan permanen di petak terang b3, dan merebut ruang luas.',
            mistakeHint: 'Cegah dorongan b4 Putih dengan mengunci sayap menteri lewat ...c4!'
          },
          { san: 'Nbd2', explanation: 'Putih menyelesaikan pengembangan kuda.' },
          {
            san: 'Na5',
            explanation:
              'Menguasai petak lemah b3 dan mempersiapkan ...Bd7–...Ba4 untuk mendominasi sayap menteri.',
            mistakeHint: 'Arahkan kuda ke a5 untuk mengunci kendali petak terang b3.'
          }
        ]
      },
      {
        id: 'french-winawer',
        name: 'Variasi Winawer (3. Nc3 Bb4)',
        description: 'Mengikat kuda c3 dan menciptakan pertarungan asimetris tajam penuh peluang balik.',
        moves: [
          { san: 'e4', explanation: 'Putih membuka di pusat.' },
          { san: 'e6', explanation: 'Memasuki Pertahanan Prancis.', mistakeHint: 'Mainkan 1...e6.' },
          { san: 'd4', explanation: 'Putih mengambil pusat.' },
          { san: 'd5', explanation: 'Menantang e4.', mistakeHint: 'Mainkan 2...d5.' },
          { san: 'Nc3', explanation: 'Putih mempertahankan e4 dengan pengembangan.' },
          {
            san: 'Bb4',
            explanation:
              'Variasi Winawer! Mengikat kuda c3 sehingga ancaman ...dxe4 menjadi nyata dan merusak keharmonisan sayap menteri Putih.',
            mistakeHint: 'Ikat kuda c3 dengan gajah gelap di b4!'
          },
          { san: 'e5', explanation: 'Putih mengamankan ruang dan menutup diagonal.' },
          {
            san: 'c5',
            explanation: 'Langsung menyerang pangkal rantai pion Putih di d4.',
            mistakeHint: 'Hantam pangkal rantai pion d4 dengan 4...c5.'
          },
          { san: 'a3', explanation: 'Putih memaksa gajah b4 mengambil keputusan.' },
          {
            san: 'Bxc3+',
            explanation:
              'Menciptakan pion tumpuk permanen di lajur c Putih: kompensasi strategis jangka panjang atas pasangan gajah lawan.',
            mistakeHint: 'Tukar gajah dengan kuda c3 untuk merusak struktur pion sayap menteri Putih.'
          },
          { san: 'bxc3', explanation: 'Putih merebut balik.' },
          {
            san: 'Ne7',
            explanation:
              'Mengembangkan kuda ke e7 agar tidak menghalangi pion f dan siap menjaga g6 atau melompat ke f5/c6.',
            mistakeHint: 'Kembangkan kuda ke e7 agar fleksibel menuju f5 atau c6.'
          },
          { san: 'Qg4', explanation: 'Putih menyerang pion g7 secara agresif.' },
          {
            san: 'Qc7',
            explanation:
              'Pengorbanan pion g7 beracun khas Winawer! Hitam menekan c3 dan e5 dengan serangan balik dahsyat bila Putih serakah merebut g7.',
            mistakeHint: 'Pindahkan menteri ke c7 untuk menekan balik c3 dan e5.'
          }
        ]
      }
    ]
  },
  {
    id: 'kings-indian-defense',
    title: "King's Indian Defense",
    subtitle: 'Serangan Badai Pion Sayap Raja (...e5 & ...f5)',
    category: 'opening',
    side: 'b',
    eco: 'E97 / E81',
    difficulty: 'Lanjutan',
    summary:
      'Senjata hipermodern favorit Bobby Fischer dan Garry Kasparov melawan 1. d4. Hitam membiarkan Putih membangun pusat lebar, lalu menguncinya dan melancarkan badai pion mematikan ke raja Putih.',
    keyThemes: ['Fianchetto Gajah g7', 'Terobosan ...e5', 'Badai Pion ...f5–f4', 'Serangan Balik Sayap Raja'],
    lines: [
      {
        id: 'kid-mar-del-plata',
        name: 'Variasi Klasik Mar del Plata',
        description: 'Kunci pusat dengan ...e5, tarik kuda ke d7, lalu ledakkan sayap raja lewat ...f5!',
        moves: [
          { san: 'd4', explanation: 'Putih membuka dengan pion menteri.' },
          {
            san: 'Nf6',
            explanation: 'Mengontrol petak e4 dan d5 secara fleksibel tanpa segera mengikat struktur pion.',
            mistakeHint: 'Kembangkan kuda sayap raja ke f6.'
          },
          { san: 'c4', explanation: 'Putih mengklaim ruang tambahan di pusat.' },
          {
            san: 'g6',
            explanation: 'Mempersiapkan fianchetto gajah gelap ke diagonal panjang h8–a1.',
            mistakeHint: 'Siapkan fianchetto gajah gelap dengan 2...g6.'
          },
          { san: 'Nc3', explanation: 'Putih menyiapkan pusat lebar e4.' },
          {
            san: 'Bg7',
            explanation: 'Gajah naga King’s Indian menempati diagonal strategis menuju d4 dan b2.',
            mistakeHint: 'Tempatkan gajah di g7 untuk menguasai diagonal panjang.'
          },
          { san: 'e4', explanation: 'Putih membangun pusat pion penuh.' },
          {
            san: 'd6',
            explanation: 'Mencegah dorongan e5 dan menyiapkan terobosan balik ...e5 pada saat tepat.',
            mistakeHint: 'Cegah dorongan e5 Putih dengan 4...d6.'
          },
          { san: 'Nf3', explanation: 'Putih mengembangkan kuda secara klasik.' },
          {
            san: 'O-O',
            explanation: 'Mengamankan raja terlebih dahulu sebelum membuka konfrontasi di pusat.',
            mistakeHint: 'Rokade pendek terlebih dahulu untuk mengamankan raja.'
          },
          { san: 'Be2', explanation: 'Putih bersiap rokade pendek.' },
          {
            san: 'e5',
            explanation:
              'Terobosan inti King’s Indian! Menantang pusat Putih secara langsung untuk memancing d5.',
            mistakeHint: 'Kini saatnya menantang pusat Putih secara langsung dengan 6...e5!'
          },
          { san: 'O-O', explanation: 'Putih mengamankan raja.' },
          {
            san: 'Nc6',
            explanation: 'Menambah tekanan terhadap d4 sehingga Putih hampir terpaksa menutup pusat dengan d5.',
            mistakeHint: 'Tekan pion d4 dengan kuda c6 agar Putih terdorong menutup pusat.'
          },
          { san: 'd5', explanation: 'Putih mengunci pusat dan mulai menyerang sayap menteri.' },
          {
            san: 'Ne7',
            explanation:
              'Menarik kuda ke e7 di mana ia mendukung serangan sayap raja dan siap mengawal f5.',
            mistakeHint: 'Tarik kuda ke e7 untuk bergabung dalam rencana serangan sayap raja.'
          },
          { san: 'Ne1', explanation: 'Putih menyiapkan dorongan c5 dan f3.' },
          {
            san: 'Nd7',
            explanation:
              'Membuka jalan bagi pion f sekaligus mengawal petak c5 agar serangan sayap menteri Putih melambat.',
            mistakeHint: 'Pindahkan kuda f6 ke d7 untuk membuka jalan dorongan mematikan ...f5!'
          },
          { san: 'Be3', explanation: 'Putih mengembangkan gajah menuju sayap menteri.' },
          {
            san: 'f5',
            explanation:
              'Badai pion dimulai! Hitam merebut inisiatif eksplosif di sayap raja dengan rencana ...f4, ...g5, dan ...Ng6.',
            mistakeHint: 'Luncurkan serangan khas Mar del Plata dengan mendorong ...f5!'
          }
        ]
      },
      {
        id: 'kid-vs-samisch',
        name: 'Melawan Variasi Sämisch (5. f3)',
        description: 'Membongkar struktur agresif f3 Putih melalui reaksi pusat ...e5 dan ...c6.',
        moves: [
          { san: 'd4', explanation: 'Putih membuka dengan d4.' },
          { san: 'Nf6', explanation: 'Mengontrol pusat.', mistakeHint: 'Mainkan 1...Nf6.' },
          { san: 'c4', explanation: 'Putih mengambil ruang.' },
          { san: 'g6', explanation: 'Menyiapkan fianchetto.', mistakeHint: 'Mainkan 2...g6.' },
          { san: 'Nc3', explanation: 'Putih mengembangkan kuda.' },
          { san: 'Bg7', explanation: 'Gajah aktif di g7.', mistakeHint: 'Mainkan 3...Bg7.' },
          { san: 'e4', explanation: 'Putih membangun pusat penuh.' },
          { san: 'd6', explanation: 'Mengawal petak e5.', mistakeHint: 'Mainkan 4...d6.' },
          { san: 'f3', explanation: 'Variasi Sämisch: Putih mempertebal e4 dan menyiapkan serangan g4–h4.' },
          {
            san: 'O-O',
            explanation: 'Mengamankan raja sambil tetap menjaga fleksibilitas penuh di pusat.',
            mistakeHint: 'Amankan raja dengan rokade pendek.'
          },
          { san: 'Be3', explanation: 'Putih menyiapkan Qd2 dan O-O-O.' },
          {
            san: 'e5',
            explanation: 'Menantang pusat sebelum Putih sempat menyelesaikan konsolidasi sayap menteri.',
            mistakeHint: 'Tantang pusat segera dengan 6...e5.'
          },
          { san: 'd5', explanation: 'Putih menutup pusat.' },
          {
            san: 'c6',
            explanation:
              'Menyerang pangkal rantai pion Putih dan membuka lajur c untuk serangan balik cepat terhadap raja Putih yang akan rokade panjang!',
            mistakeHint: 'Buka lajur c melawan rencana rokade panjang Putih dengan 7...c6!'
          },
          { san: 'Qd2', explanation: 'Putih menghubungkan benteng dan menyiapkan O-O-O.' },
          {
            san: 'cxd5',
            explanation: 'Membuka lajur c secara permanen bagi benteng dan menteri Hitam.',
            mistakeHint: 'Tukar pion di d5 untuk membuka lajur serangan c.'
          },
          { san: 'cxd5', explanation: 'Putih merebut balik dengan pion c.' },
          {
            san: 'a6',
            explanation:
              'Menyiapkan ekspansi cepat ...b5 di sayap menteri untuk mendahului serangan sayap raja Putih.',
            mistakeHint: 'Siapkan serangan balik ...b5 di sayap menteri lewat ...a6.'
          }
        ]
      }
    ]
  }
]

export const CURATED_ENDGAMES: EndgameModule[] = [
  {
    id: 'endgame-lucena-philidor',
    title: 'Babak Akhir Benteng: Lucena & Philidor',
    subtitle: 'Teknik Membangun Jembatan & Pertahanan Baris ke-6',
    category: 'endgame',
    side: 'w',
    difficulty: 'Menengah',
    summary:
      'Dua posisi paling fundamental dalam seluruh teori babak akhir benteng. Kuasai teknik "Membangun Jembatan" Lucena untuk menang dan pertahanan baris ke-6 Philidor untuk menyelamatkan remis.',
    keyThemes: ['Membangun Jembatan', 'Memotong Raja Lawan', 'Pertahanan Baris ke-6', 'Skak dari Belakang'],
    scenarios: [
      {
        id: 'lucena-bridge',
        title: 'Posisi Lucena: Membangun Jembatan',
        side: 'w',
        fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
        objective: 'Putih jalan dan menang: usir raja Hitam lalu bangun jembatan benteng di baris ke-4',
        goalType: 'win',
        recommendedFirstMoves: ['Rd1+'],
        coachingHint:
          'Langkah kunci pertama adalah 1. Rd1+ untuk memotong raja Hitam satu lajur lebih jauh, diikuti 2. Rd4! guna membangun jembatan di baris ke-4.',
        principles: [
          'Usir Raja Hitam menjauh dari pion dengan 1. Rd1+ (memotong di lajur d).',
          'Bangun Jembatan di baris ke-4 (2. Rd4!) agar benteng siap memblokir skak vertikal dari bawah.',
          'Keluarkan Raja Putih (Kc7–Kb6–Kc6–Kb5) lalu tutup skak benteng Hitam dengan Rb4! untuk memastikan promosi.'
        ]
      },
      {
        id: 'philidor-defense',
        title: 'Posisi Philidor: Pertahanan Baris ke-6',
        side: 'b',
        fen: '4k3/R7/8/3PK3/8/8/8/1r6 b - - 0 1',
        objective: 'Hitam jalan dan remis: pertahankan baris ke-6 lalu serang dari belakang jika pion maju',
        goalType: 'draw',
        targetDrawPlies: 16,
        recommendedFirstMoves: ['Rb6'],
        coachingHint:
          'Segera duduki baris ke-6 dengan 1...Rb6! untuk menghalangi raja Putih maju. Begitu Putih mendorong d6, tarik benteng ke baris ke-1 (Rb1!) untuk skak tanpa henti.',
        principles: [
          'Kuasai baris ke-6 dengan 1...Rb6! agar raja Putih tidak mendapat tempat berlindung di depan pionnya.',
          'Selama pion d5 belum maju, cukup lakukan langkah menunggu di baris ke-6 (Ra6/Rb6/Rc6).',
          'Begitu Putih mendorong d6, segera pindah ke belakang (Rb1!) untuk menghujani raja Putih dengan skak jarak jauh.'
        ]
      }
    ]
  },
  {
    id: 'endgame-king-pawn-opposition',
    title: 'Babak Akhir Pion: Oposisi & Petak Kunci',
    subtitle: 'Manuver Outflanking & Pertahanan Oposisi Langsung',
    category: 'endgame',
    side: 'w',
    difficulty: 'Pemula',
    summary:
      'Setiap babak akhir catur bermuara pada babak akhir raja dan pion. Pelajari kapan harus memajukan raja mendahului pion, merebut petak kunci, dan mempertahankan oposisi.',
    keyThemes: ['Oposisi Langsung', 'Petak Kunci Baris ke-6', 'Manuver Outflanking', 'Perangkap Pat (Stalemate)'],
    scenarios: [
      {
        id: 'opposition-win',
        title: 'Petak Kunci & Outflanking (Menang)',
        side: 'w',
        fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
        objective: 'Putih jalan dan menang: rebut petak kunci di baris ke-6 sebelum mendorong pion',
        goalType: 'win',
        recommendedFirstMoves: ['Kd6', 'Kf6', 'Ke6'],
        coachingHint:
          'Jangan dorong 1. e5? terlalu cepat karena Hitam akan membalas 1...Ke7! dan meraih remis. Majukan Raja ke petak kunci baris ke-6 (Kd6, Ke6, atau Kf6)!',
        principles: [
          'Hukum Emas: Raja selalu berjalan di depan pion, bukan di belakangnya.',
          'Jika raja penyerang berhasil menguasai baris ke-6 di depan pionnya (d6, e6, atau f6), posisi selalu menang terlepas dari giliran jalan.',
          'Hindari jebakan pat (stalemate): dorong pion ke baris ke-7 hanya dengan skak atau saat raja lawan tidak dapat mengunci petak promosi.'
        ]
      },
      {
        id: 'opposition-draw',
        title: 'Pertahanan Oposisi Langsung (Remis)',
        side: 'b',
        fen: '4k3/8/8/4P3/4K3/8/8/8 b - - 0 1',
        objective: 'Hitam jalan dan remis: ambil oposisi langsung agar raja Putih gagal menembus',
        goalType: 'draw',
        targetDrawPlies: 14,
        recommendedFirstMoves: ['Ke7'],
        coachingHint:
          'Mainkan 1...Ke7! untuk menghadang raja Putih. Jika Putih melangkah ke Kd5, balas Kd7; jika Kf5, balas Kf7 untuk selalu menjaga oposisi langsung.',
        principles: [
          'Kuasai petak tepat di depan pion (e7/e8) agar raja Putih tidak bisa menembus baris ke-6.',
          'Jaga Oposisi Langsung: selalu tempatkan raja Anda berhadapan dengan raja Putih dipisahkan oleh satu petak kosong.',
          'Ketika Putih terpaksa mendorong e6, mundur lurus ke e8 agar siap meraih oposisi lagi saat raja Putih melangkah ke samping.'
        ]
      }
    ]
  },
  {
    id: 'endgame-basic-checkmates',
    title: 'Babak Akhir Dasar: Skakmat Menteri & Benteng',
    subtitle: 'Teknik Menjepit Raja & Menghindari Pat (Stalemate)',
    category: 'endgame',
    side: 'w',
    difficulty: 'Pemula',
    summary:
      'Keterampilan wajib setiap pecatur sebelum naik tingkat. Latih eksekusi skakmat bersih menggunakan Menteri tunggal dan Benteng tunggal tanpa terjebak pat.',
    keyThemes: ['Jarak Kuda (Queen Mate)', 'Teknik Kotak Mengecil', 'Kerja Sama Raja', 'Anti-Stalemate'],
    scenarios: [
      {
        id: 'queen-checkmate',
        title: 'Skakmat Raja + Menteri vs Raja',
        side: 'w',
        fen: '4k3/8/8/8/8/4K3/8/3Q4 w - - 0 1',
        objective: 'Putih jalan dan skakmat: jepit raja Hitam ke tepi papan lalu dekatkan raja Putih',
        goalType: 'win',
        recommendedFirstMoves: ['Qd6', 'Qd5', 'Qh5'],
        coachingHint:
          'Gunakan Menteri untuk mempersempit ruang gerak Raja Hitam (mis. Qd6 atau Qh5), lalu bawa Raja Putih mendekat. Hati-hati jangan sampai membuat Hitam pat (stalemate)!',
        principles: [
          'Gunakan pola "jarak kuda": letakkan Menteri satu langkah kuda dari Raja lawan untuk mendorongnya perlahan ke tepi papan.',
          'Begitu Raja lawan terjebak di baris atau lajur tepi, hentikan pergerakan Menteri dan dekatkan Raja Anda.',
          'Sisakan selalu minimal 2 petak gerak bagi Raja lawan saat mendekatkan Raja Anda agar tidak terjadi pat (stalemate).'
        ]
      },
      {
        id: 'rook-checkmate',
        title: 'Skakmat Raja + Benteng vs Raja',
        side: 'w',
        fen: '4k3/8/8/8/8/4K3/8/R7 w - - 0 1',
        objective: 'Putih jalan dan skakmat: potong raja Hitam dengan benteng dan paksa oposisi',
        goalType: 'win',
        recommendedFirstMoves: ['Ra7', 'Ra6', 'Kd4'],
        coachingHint:
          'Potong ruang gerak Raja Hitam di baris ke-7 (1. Ra7!) sehingga ia terkurung di baris ke-8, lalu majukan Raja Anda untuk meraih oposisi dan memberi skakmat!',
        principles: [
          'Gunakan Benteng untuk memotong Raja lawan ke area sekecil mungkin (mis. 1. Ra7!).',
          'Bawa Raja Anda berhadapan langsung (oposisi) dengan Raja lawan: ketika lawan terpaksa berdiri tepat di depan Raja Anda, berikan skak dari samping!',
          'Jika giliran tidak pas (tempo salah), lakukan satu langkah tunggu kecil dengan Benteng di baris yang sama.'
        ]
      }
    ]
  },
  {
    id: 'endgame-pawn-breakthrough',
    title: 'Babak Akhir Pion Lanjutan: Terobosan & Pion Jauh',
    subtitle: 'Pengorbanan Terobosan 3 vs 3 & Outside Passed Pawn',
    category: 'endgame',
    side: 'w',
    difficulty: 'Lanjutan',
    summary:
      'Dua motif kemenangan paling memukau dalam babak akhir pion. Temukan pengorbanan pion terobosan yang mengejutkan dan pelajari kekuatan pion bebas jauh sebagai pengalih perhatian.',
    keyThemes: ['Terobosan 3 vs 3 (g6!!)', 'Aturan Kotak (Rule of the Square)', 'Pion Bebas Jauh', 'Penetrasi Raja'],
    scenarios: [
      {
        id: 'pawn-breakthrough-3v3',
        title: 'Terobosan 3 Pion vs 3 Pion (Putih Menang)',
        side: 'w',
        fen: '8/5ppp/8/5PPP/8/k7/8/K7 w - - 0 1',
        objective: 'Putih jalan dan menang: temukan pengorbanan pion terobosan untuk promosi tak terhentikan!',
        goalType: 'win',
        recommendedFirstMoves: ['g6'],
        coachingHint:
          'Kunci kemenangan spektakuler adalah 1. g6!! Jika Hitam merebut 1...hxg6 balas 2. f6!; jika 1...fxg6 balas 2. h6! Salah satu pion Anda akan lolos promosi jauh dari jangkauan Raja Hitam.',
        principles: [
          'Korbankan pion tengah (1. g6!!) untuk menghancurkan koordinasi tiga pion penjaga lawan.',
          'Jika lawan memakan dengan pion sisi (hxg6), korbankan pion sisi berlawanan (2. f6!) agar pion ketiga meluncur bebas.',
          'Pastikan Raja lawan berada di luar "Aturan Kotak" sehingga mustahil mengejar pion yang lolos.'
        ]
      },
      {
        id: 'outside-passed-pawn',
        title: 'Pion Bebas Jauh: Hitam Menang',
        side: 'b',
        fen: '8/p5pp/8/2k5/8/2K5/5PPP/8 b - - 0 1',
        objective: 'Hitam jalan dan menang: gunakan pion bebas a7 untuk menarik raja Putih lalu serbu sayap raja',
        goalType: 'win',
        recommendedFirstMoves: ['a5', 'Kd5', 'Kb5'],
        coachingHint:
          'Dorong pion a7 (1...a5!) atau aktifkan Raja (1...Kd5). Begitu Raja Putih terpaksa pergi ke lajur a untuk menghentikan pion a, Raja Hitam bebas menyerbu dan memakan seluruh pion sayap raja Putih!',
        principles: [
          'Pion bebas yang paling jauh dari pusat pertarungan adalah umpan pengalih perhatian paling mematikan.',
          'Jangan takut mengorbankan pion a Anda pada momen tepat jika itu memaksa Raja lawan terseret jauh ke tepi papan.',
          'Segera arahkan Raja Anda menuju kelompok pion lawan di sayap berlawanan begitu Raja lawan terikat menjaga pion bebas.'
        ]
      }
    ]
  }
]

export const ALL_CURATED_MODULES: RepertoireModule[] = [
  ...CURATED_OPENINGS,
  ...CURATED_ENDGAMES
]

export function findOpeningById(id: string, customOpenings: OpeningModule[] = []): OpeningModule | undefined {
  return [...CURATED_OPENINGS, ...customOpenings].find((m) => m.id === id)
}

export function findEndgameById(id: string): EndgameModule | undefined {
  return CURATED_ENDGAMES.find((m) => m.id === id)
}
