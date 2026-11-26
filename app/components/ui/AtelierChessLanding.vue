<script setup lang="ts">
import { Chess } from 'chess.js'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Check,
  Cpu,
  Crop,
  Crown,
  Focus,
  Heart,
  Image as ImageIcon,
  Maximize,
  MessageCircle,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Shapes,
  Sparkles,
  Sun,
  Swords,
  Users,
  X
} from 'lucide-vue-next'
import type { ChessPosterSpec } from '~/components/ui/ChessArtwork.vue'
import { playCheckSound, playWoodenCapture, playWoodenMove } from '~/utils/sound'

const { isDark, isMuted, toggleDark } = useTheme()

const POSTERS: ChessPosterSpec[] = [
  {
    id: 1,
    title: 'Ruy Lopez: Morphy',
    category: 'Pembukaan',
    notation: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4',
    description: 'Tekanan klasik pada kuda c6 untuk merebut kendali pusat jangka panjang dan membuka manuver c3–d4.',
    route: '/trainer/opening/ruy-lopez-morphy',
    bg: '#2A4AC7',
    bg2: '#5072EC',
    boardLight: '#EEF2FF',
    boardDark: '#3658CC',
    accent: '#FF927E',
    ink: '#FFFFFF',
    featuredPiece: 'b',
    featuredColor: 'w',
    secondaryPiece: 'n',
    secondaryColor: 'b',
    badgeText: 'C78 · Putih'
  },
  {
    id: 2,
    title: 'Sicilian Najdorf',
    category: 'Pembukaan',
    notation: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    description: 'Senjata paling tajam dan dinamis bagi Hitam melawan 1. e4 dengan terobosan pusat ...e5 yang eksplosif.',
    route: '/trainer/opening/sicilian-najdorf',
    bg: '#D8583B',
    bg2: '#F18666',
    boardLight: '#FFF5F1',
    boardDark: '#B84A32',
    accent: '#FFE082',
    ink: '#FFFFFF',
    featuredPiece: 'n',
    featuredColor: 'b',
    secondaryPiece: 'p',
    secondaryColor: 'b',
    badgeText: 'B90 · Hitam'
  },
  {
    id: 3,
    title: 'Jembatan Lucena',
    category: 'Babak Akhir',
    notation: '1. Rd1+ Ke7 2. Rd4! Ra1 3. Kc7 Rc1+',
    description: 'Teknik fundamental babak akhir benteng: memotong raja lawan dan membangun jembatan di baris ke-4.',
    route: '/trainer/endgame/endgame-lucena-philidor',
    bg: '#2F8F83',
    bg2: '#58BDAF',
    boardLight: '#EFFAF8',
    boardDark: '#2E7D73',
    accent: '#FFD166',
    ink: '#FFFFFF',
    featuredPiece: 'r',
    featuredColor: 'w',
    secondaryPiece: 'p',
    secondaryColor: 'w',
    badgeText: 'Menang · R+P'
  },
  {
    id: 4,
    title: "Queen's Gambit",
    category: 'Pembukaan',
    notation: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5',
    description: 'Struktur Carlsbad yang jernih untuk meluncurkan Serangan Minoritas b4–b5 di sayap menteri.',
    route: '/trainer/opening/queens-gambit-declined',
    bg: '#E89B58',
    bg2: '#F4BE7E',
    boardLight: '#FFF9F0',
    boardDark: '#B97840',
    accent: '#2A4AC7',
    ink: '#241B14',
    featuredPiece: 'q',
    featuredColor: 'w',
    secondaryPiece: 'b',
    secondaryColor: 'w',
    badgeText: 'D35 · Putih'
  },
  {
    id: 5,
    title: 'Pertahanan Philidor',
    category: 'Babak Akhir',
    notation: '1... Rb6! (Baris ke-6) → 2. d6 Rb1!',
    description: 'Menahan raja lawan di baris ke-6 lalu menghujani skak tanpa henti dari belakang begitu pion didorong.',
    route: '/trainer/endgame/endgame-lucena-philidor',
    bg: '#1E8A6E',
    bg2: '#4CC2A3',
    boardLight: '#F0FBF7',
    boardDark: '#1E725C',
    accent: '#F6A68E',
    ink: '#FFFFFF',
    featuredPiece: 'r',
    featuredColor: 'b',
    secondaryPiece: 'k',
    secondaryColor: 'b',
    badgeText: 'Remis · R+P'
  },
  {
    id: 6,
    title: 'Caro-Kann Klasik',
    category: 'Pembukaan',
    notation: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5',
    description: 'Mengeluarkan gajah terang sejak awal dan membangun struktur pion batu karang menuju babak akhir unggul.',
    route: '/trainer/opening/caro-kann-classical',
    bg: '#C7658A',
    bg2: '#E79AB7',
    boardLight: '#FFF3F7',
    boardDark: '#A54E6F',
    accent: '#FFE599',
    ink: '#FFFFFF',
    featuredPiece: 'b',
    featuredColor: 'b',
    secondaryPiece: 'p',
    secondaryColor: 'b',
    badgeText: 'B18 · Hitam'
  },
  {
    id: 7,
    title: 'Oposisi & Petak Kunci',
    category: 'Babak Akhir',
    notation: '1. Kd6! Kf8 2. e5 Ke8 3. Ke6!',
    description: 'Hukum emas babak akhir pion: raja selalu berjalan mendahului pion untuk menguasai baris ke-6.',
    route: '/trainer/endgame/endgame-king-pawn-opposition',
    bg: '#3B6CB7',
    bg2: '#689CE6',
    boardLight: '#F2F7FF',
    boardDark: '#3658A8',
    accent: '#FFB59E',
    ink: '#FFFFFF',
    featuredPiece: 'k',
    featuredColor: 'w',
    secondaryPiece: 'p',
    secondaryColor: 'w',
    badgeText: 'Pion · K+P'
  },
  {
    id: 8,
    title: 'Tembok Berlin',
    category: 'Pembukaan',
    notation: '3... Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6',
    description: 'Pertarungan babak akhir tanpa menteri di mana koordinasi raja dan mayoritas pion sayap raja menentukan.',
    route: '/trainer/opening/ruy-lopez-morphy',
    bg: '#B84A39',
    bg2: '#DF7360',
    boardLight: '#FFF4F2',
    boardDark: '#963A2C',
    accent: '#F6E2B3',
    ink: '#FFFFFF',
    featuredPiece: 'k',
    featuredColor: 'b',
    secondaryPiece: 'n',
    secondaryColor: 'b',
    badgeText: 'C67 · Endgame'
  },
  {
    id: 9,
    title: 'Serangan Minoritas',
    category: 'Taktik',
    notation: 'Rb1 → b4 → b5 × c6',
    description: 'Menciptakan kelemahan pion mundur di sayap menteri lawan melalui dorongan dua pion melawan tiga.',
    route: '/trainer/opening/queens-gambit-declined',
    bg: '#5B4BC4',
    bg2: '#897AE8',
    boardLight: '#F5F3FF',
    boardDark: '#4D3FA8',
    accent: '#82E9DE',
    ink: '#FFFFFF',
    featuredPiece: 'r',
    featuredColor: 'w',
    secondaryPiece: 'q',
    secondaryColor: 'w',
    badgeText: 'Strategi'
  },
  {
    id: 10,
    title: 'Terobosan ...e5',
    category: 'Taktik',
    notation: '6. Be3 e5! 7. Nb3 Be6',
    description: 'Mengusir kuda dominan dari pusat d4 dan merebut inisiatif dinamis khas grandmaster Sisilia.',
    route: '/trainer/opening/sicilian-najdorf',
    bg: '#D7A132',
    bg2: '#EFC663',
    boardLight: '#FFFDF2',
    boardDark: '#AD7F20',
    accent: '#283655',
    ink: '#1E1A12',
    featuredPiece: 'q',
    featuredColor: 'b',
    secondaryPiece: 'b',
    secondaryColor: 'b',
    badgeText: 'Dinamis'
  },
  {
    id: 11,
    title: 'Pertahanan Oposisi',
    category: 'Babak Akhir',
    notation: '1... Ke7! 2. Kd5 Kd7!',
    description: 'Menjaga jarak satu petak di hadapan raja lawan untuk menutup seluruh jalur penetrasi.',
    route: '/trainer/endgame/endgame-king-pawn-opposition',
    bg: '#2A7EB3',
    bg2: '#5BB1E0',
    boardLight: '#F0F9FF',
    boardDark: '#236996',
    accent: '#FFD670',
    ink: '#FFFFFF',
    featuredPiece: 'k',
    featuredColor: 'b',
    secondaryPiece: 'k',
    secondaryColor: 'w',
    badgeText: 'Remis · K+P'
  },
  {
    id: 12,
    title: 'Arena Bot 2400 ELO',
    category: 'Taktik',
    notation: 'Alpha-Beta · Quiescence · Opening Book',
    description: 'Uji hasil latihan Anda melawan 6 bot berjenjang 400 hingga 2400 ELO atau bertanding 2 orang.',
    route: '/play',
    bg: '#2D2448',
    bg2: '#50427A',
    boardLight: '#F4F1FA',
    boardDark: '#3A2F5E',
    accent: '#FF927E',
    ink: '#FFFFFF',
    featuredPiece: 'q',
    featuredColor: 'w',
    secondaryPiece: 'r',
    secondaryColor: 'b',
    badgeText: 'Bot & 2P'
  },
  {
    id: 13,
    title: 'Studio Analisis Bebas',
    category: 'Taktik',
    notation: 'Mode Pelajari · Cabang Variasi · PGN/FEN',
    description: 'Eksplorasi langkah alternatif di luar buku seperti papan analisis profesional dan simpan ke repertoar lokal.',
    route: '/sandbox',
    bg: '#4A6354',
    bg2: '#738F7D',
    boardLight: '#F4F3EE',
    boardDark: '#566E5F',
    accent: '#E8A592',
    ink: '#FFFFFF',
    featuredPiece: 'k',
    featuredColor: 'w',
    secondaryPiece: 'n',
    secondaryColor: 'w',
    badgeText: 'Atelier'
  }
]

const editorialPoster = POSTERS[12]!
const questionPoster = POSTERS[7]!
const resultPoster = POSTERS[2]!

const mosaicColumns = [
  [POSTERS[5]!, POSTERS[7]!, POSTERS[3]!, POSTERS[1]!],
  [POSTERS[8]!, POSTERS[0]!, POSTERS[10]!, POSTERS[4]!],
  [POSTERS[2]!, POSTERS[6]!, POSTERS[9]!, POSTERS[11]!]
]

const galleryRows = [
  [POSTERS[0]!, POSTERS[2]!, POSTERS[4]!, POSTERS[7]!, POSTERS[9]!, POSTERS[5]!],
  [POSTERS[12]!, POSTERS[8]!, POSTERS[6]!, POSTERS[3]!, POSTERS[10]!, POSTERS[11]!]
]

const features = [
  {
    title: 'Sudut pandang strategis.',
    description:
      'Pahami alasan kuat di balik setiap langkah pembukaan. Bukan sekadar hafalan, melainkan rencana jangka panjang.',
    icon: Focus
  },
  {
    title: 'Ruang analisis bebas.',
    description:
      'Gerakkan bidak Putih maupun Hitam secara bebas di Mode Pelajari, uji cabang variasi sendiri, dan impor PGN/FEN.',
    icon: Sparkles
  },
  {
    title: 'Lawan tanding berjenjang.',
    description:
      'Tantang 6 bot komputer dari 400 hingga 2400 ELO atau bertanding 2 orang di satu papan lengkap dengan jam catur.',
    icon: Swords
  }
]

interface BotMentorCard {
  id: string
  name: string
  elo: number
  specialty: string
  bio: string
  color: 'lavender' | 'pink' | 'cream' | 'yellow'
  tilt: number
  poster: ChessPosterSpec
}

const botMentors: BotMentorCard[] = [
  {
    id: 'bot-400',
    name: 'Nadia · 400',
    elo: 400,
    specialty: 'Pemula & taktik dasar',
    bio: 'Teman latihan paling santai untuk pemula yang ingin melatih kewaspadaan terhadap bidak bebas dan pola skakmat dasar.',
    color: 'lavender',
    tilt: -8,
    poster: POSTERS[0]!
  },
  {
    id: 'bot-1200',
    name: 'Saras · 1200',
    elo: 1200,
    specialty: 'Disiplin pembukaan',
    bio: 'Pemain klub solid dengan buku pembukaan terstruktur dan reaksi cepat menghukum kesalahan pengembangan perwira.',
    color: 'pink',
    tilt: 6,
    poster: POSTERS[4]!
  },
  {
    id: 'bot-2000',
    name: 'Prof. Hendra · 2000',
    elo: 2000,
    specialty: 'Kandidat Master posisional',
    bio: 'Menggabungkan pencarian alpha-beta mendalam dengan pemahaman struktur pion dan konversi babak akhir yang presisi.',
    color: 'cream',
    tilt: -5,
    poster: POSTERS[7]!
  },
  {
    id: 'bot-2400',
    name: 'GM Arjuna · 2400',
    elo: 2400,
    specialty: 'Grandmaster Atelier',
    bio: 'Lawan terkuat di Atelier dengan pencarian taktis quiescence tanpa kompromi untuk menguji repertoar terbaik Anda.',
    color: 'yellow',
    tilt: 8,
    poster: POSTERS[9]!
  }
]

const waves = [
  {
    layout: 'wide',
    box: '0 0 1120 390',
    path: 'M -20 190 C 60 190 66 134 140 134 S 300 234 420 234 S 582 114 700 114 S 864 214 980 214 S 1080 170 1140 170'
  },
  {
    layout: 'phone',
    box: '0 0 400 560',
    path: 'M -16 150 C 35 150 45 110 100 110 S 245 175 300 175 C 425 175 420 390 300 390 S 155 335 100 335 C 10 335 -5 470 50 520'
  }
]

const waveform = [
  5, 11, 18, 9, 22, 15, 8, 24, 30, 16, 23, 11, 20, 28, 16, 9, 21, 32, 19, 25, 14, 7, 15, 23, 12,
  29, 18, 8, 20, 13, 6, 11
]

// Interactive Opera Game (Paul Morphy, 1858) Demo Modal
const OPERA_GAME_MOVES = [
  'e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5',
  'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5',
  'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7',
  'Qb8+', 'Nxb8', 'Rd8#'
]

const rootEl = ref<HTMLDivElement | null>(null)
const heroEl = ref<HTMLElement | null>(null)
const galleryEl = ref<HTMLDivElement | null>(null)
const libraryEl = ref<HTMLElement | null>(null)
const counterEl = ref<HTMLSpanElement | null>(null)

const selectedPoster = ref<ChessPosterSpec | null>(null)
const selectedMentor = ref<BotMentorCard | null>(null)
const showDemoModal = ref(false)
const motionPaused = ref(false)
const saved = ref(false)
const fullFrame = ref(false)

// Live Opera Game player state inside Demo Modal
const demoStep = ref(0)
const demoPlaying = ref(false)
let demoInterval: ReturnType<typeof setInterval> | null = null

const operaSnapshots = computed(() => {
  const g = new Chess()
  const snaps: Array<{ fen: string; lastMove: { from: string; to: string } | null; san: string }> = [
    { fen: g.fen(), lastMove: null, san: 'Posisi Awal' }
  ]
  for (const san of OPERA_GAME_MOVES) {
    const m = g.move(san)
    snaps.push({
      fen: g.fen(),
      lastMove: { from: m.from, to: m.to },
      san: m.san
    })
  }
  return snaps
})

const currentDemoSnap = computed(
  () => operaSnapshots.value[demoStep.value] ?? operaSnapshots.value[0]!
)

function stopDemoPlayback() {
  demoPlaying.value = false
  if (demoInterval) {
    clearInterval(demoInterval)
    demoInterval = null
  }
}

function startDemoPlayback() {
  stopDemoPlayback()
  if (demoStep.value >= operaSnapshots.value.length - 1) {
    demoStep.value = 0
  }
  demoPlaying.value = true
  demoInterval = setInterval(() => {
    if (demoStep.value >= operaSnapshots.value.length - 1) {
      stopDemoPlayback()
      return
    }
    demoStep.value += 1
    const snap = operaSnapshots.value[demoStep.value]
    if (snap) {
      if (snap.san.includes('+') || snap.san.includes('#')) playCheckSound(isMuted.value)
      else if (snap.san.includes('x')) playWoodenCapture(isMuted.value)
      else playWoodenMove(isMuted.value)
    }
  }, 680)
}

function openDemoModal() {
  showDemoModal.value = true
  demoStep.value = 0
  startDemoPlayback()
}

function closeDemoModal() {
  stopDemoPlayback()
  showDemoModal.value = false
}

function playCoachCadence() {
  playWoodenMove(isMuted.value)
  setTimeout(() => playWoodenCapture(isMuted.value), 180)
}

function categoryIconFor(category: ChessPosterSpec['category']) {
  if (category === 'Pembukaan') return BookOpen
  if (category === 'Babak Akhir') return Crown
  return Shapes
}

let gsapContext: gsap.Context | null = null
let galleryCleanup: (() => void) | null = null

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin)

  if (!rootEl.value) return
  const root = rootEl.value

  gsapContext = gsap.context(() => {
    const media = gsap.matchMedia()
    media.add(
      {
        reduce: '(prefers-reduced-motion: reduce)',
        wide: '(min-width: 760px)',
        tall: '(min-height: 650px)'
      },
      (context) => {
        const { reduce, wide, tall } = context.conditions!
        const select = gsap.utils.selector(root)

        if (reduce) {
          if (counterEl.value) counterEl.value.textContent = '128,450'
          return
        }

        const counterValue = { value: 124900 }
        const intro = gsap.timeline({ defaults: { ease: 'power2.out' } })
        intro
          .fromTo(
            select('.daytake-hero-cta'),
            { opacity: 0.45, backgroundColor: '#e9a397' },
            { opacity: 1, backgroundColor: '#d84f38', duration: 1.15 },
            0
          )
          .to(
            counterValue,
            {
              value: 128450,
              duration: 2.5,
              ease: 'power2.out',
              onUpdate: () => {
                if (counterEl.value) {
                  counterEl.value.textContent = Math.round(counterValue.value).toLocaleString('id-ID')
                }
              }
            },
            0.1
          )

        // Hero 3D Mosaic ScrollTrigger
        const unfurl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: heroEl.value,
            start: 'top top',
            end: wide && tall ? () => '+=' + Math.round(window.innerHeight * 0.7) : 'bottom top',
            pin: !!(wide && tall),
            pinSpacing: true,
            scrub: 0.65,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        })
        unfurl.addLabel('unfurl', 0).fromTo(
          select('.daytake-mosaic-grid'),
          { rotationX: 18, rotationY: -24, rotationZ: -12, z: -150 },
          { rotationX: 3, rotationY: -3, rotationZ: -5, z: 0, duration: 1 },
          'unfurl'
        )
        gsap.utils.toArray<HTMLElement>('.daytake-mosaic-track', root).forEach((track, index) => {
          unfurl.fromTo(
            track,
            { yPercent: index === 1 ? -24 : -3 },
            { yPercent: index === 1 ? -4 : -25, duration: 1 },
            'unfurl'
          )
        })

        // Feature Pillars
        const featureCards = select('.daytake-feature')
        const featureIcons = select('.daytake-feature-icon')
        gsap
          .timeline({
            defaults: { duration: 0.55, ease: 'power3.out' },
            scrollTrigger: { trigger: select('.daytake-features')[0], start: 'top 82%', once: true }
          })
          .fromTo(featureCards, { opacity: 0.3, x: wide ? 28 : 12 }, { opacity: 1, x: 0, stagger: 0.13 }, 0)
          .fromTo(featureIcons, { scale: 0.55 }, { scale: 1, stagger: 0.13, ease: 'back.out(1.5)' }, 0.08)

        // Gallery Arrival + Badges
        const badges = gsap.timeline({ paused: true }).fromTo(
          select('.daytake-photo-badge'),
          { scale: 0, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.44, stagger: 0.018, ease: 'back.out(1.45)' }
        )
        const arrival = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: libraryEl.value,
            start: 'top 92%',
            end: 'top 50%',
            scrub: 0.45,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (self.progress > 0.94) badges.play()
            }
          }
        })
        arrival.addLabel('photos', 0)
        gsap.utils.toArray<HTMLElement>('.daytake-gallery-group', root).forEach((group) => {
          arrival.fromTo(
            group.querySelectorAll('.daytake-photo-arrival'),
            { x: () => Math.min(window.innerWidth, 1300) * 0.83, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.65, stagger: 0.09 },
            'photos'
          )
        })
        if (tall) {
          ScrollTrigger.create({
            trigger: libraryEl.value,
            start: 'center center',
            end: () => '+=' + Math.round(window.innerHeight * (wide ? 0.56 : 0.32)),
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true
          })
        }

        // Editorial Showcase Stage
        const editorialTimeline = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: select('.daytake-editorial')[0],
            start: 'top 88%',
            end: wide ? 'center 43%' : 'top 12%',
            scrub: 0.45,
            invalidateOnRefresh: true
          }
        })
        editorialTimeline
          .addLabel('grow', 0)
          .fromTo(
            select('.daytake-editorial-media'),
            { scale: 0.65, yPercent: 12 },
            { scale: 1, yPercent: 0, duration: 0.75, ease: 'none' },
            'grow'
          )
          .addLabel('assemble', 0.42)
          .fromTo(
            select('.daytake-editorial-toolbar'),
            { x: -65, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.38 },
            'assemble'
          )
          .fromTo(
            select('.daytake-audio'),
            { y: 56, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.4 },
            'assemble+=.1'
          )
          .fromTo(
            select('.daytake-editorial-question'),
            { x: 38, y: 26, scale: 0.7, autoAlpha: 0 },
            { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.43, ease: 'back.out(1.1)' },
            'assemble+=.14'
          )
          .fromTo(
            select('.daytake-editorial-actions'),
            { x: 35, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.35 },
            'assemble+=.15'
          )
          .fromTo(
            select('.daytake-trust-item'),
            { x: 20, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.3, stagger: 0.07 },
            'assemble+=.3'
          )
          .fromTo(
            select('.daytake-editorial-connector'),
            { drawSVG: '0%' },
            { drawSVG: '100%', duration: 0.4, ease: 'none' },
            'assemble+=.38'
          )
          .fromTo(
            select('.daytake-editorial-result'),
            { scale: 0.85, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.25 },
            'assemble+=.66'
          )

        // Wave-Path Bot Mentors Section
        const field = select('.daytake-portrait-field')[0] as HTMLElement | undefined
        if (field) {
          const peopleTimeline = gsap.timeline({
            defaults: { ease: 'power2.out' },
            scrollTrigger: {
              trigger: select('.daytake-people')[0],
              start: 'clamp(top 72%)',
              end: 'clamp(bottom 92%)',
              scrub: 0.6,
              invalidateOnRefresh: true
            }
          })
          peopleTimeline
            .fromTo(select('.daytake-portrait-line'), { y: 40 }, { y: 0, duration: 1.5 }, 0)
            .fromTo(
              select('.daytake-portrait-trace'),
              { drawSVG: '0%' },
              { drawSVG: '100%', duration: 1.65, ease: 'none' },
              0.12
            )

          ;(select('.daytake-creator-arrival') as HTMLElement[]).forEach((item, index) => {
            const inner = index === 1 || index === 2
            const side = index < 2 ? -1 : 1
            const at = inner ? 0.22 + (index - 1) * 0.09 : 1.02 + (index === 3 ? 0.08 : 0)
            const plate = item.querySelector('.daytake-creator-backplate')
            const avatar = item.querySelector('.daytake-creator-avatar')
            const body = item.querySelector('.daytake-creator-body')
            const caption = item.querySelector('.daytake-creator-caption')
            const travel = field.clientWidth * (wide ? 0.34 : 0.23)

            if (inner) {
              peopleTimeline.fromTo(item, { y: 110, scale: 0.7 }, { y: 0, scale: 1, duration: 0.94 }, 0)
            } else {
              peopleTimeline.fromTo(
                item,
                { x: side * travel, y: 56, scale: 0.72 },
                {
                  motionPath: {
                    path: [
                      { x: side * travel, y: 56 },
                      { x: side * travel * 0.43, y: -28 },
                      { x: 0, y: 0 }
                    ],
                    curviness: 1.2
                  },
                  scale: 1,
                  duration: 1.05
                },
                0.48
              )
            }
            const mentorTilt = botMentors[index]?.tilt ?? 0
            peopleTimeline
              .fromTo(
                plate,
                { opacity: 0, rotation: mentorTilt + side * 16 },
                { opacity: 1, rotation: mentorTilt, duration: 0.85 },
                inner ? 0 : 0.2
              )
              .fromTo(
                avatar,
                { scale: 0.1, autoAlpha: 0 },
                { scale: 1, autoAlpha: 1, duration: 0.46, ease: 'power3.out' },
                at
              )
              .fromTo(
                body,
                { clipPath: 'circle(2% at 50% 27%)', opacity: 0 },
                { clipPath: 'circle(100% at 50% 45%)', opacity: 1, duration: 0.48 },
                at + 0.24
              )
              .fromTo(
                caption,
                { y: 8, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.25 },
                at + 0.47
              )
          })

          ;(select('.daytake-particle-arrival') as HTMLElement[]).forEach((dot, index) => {
            const direction = index % 2 ? -1 : 1
            const reach = wide ? 135 : 45
            peopleTimeline.fromTo(
              dot,
              { x: direction * -reach, y: 62, autoAlpha: 0 },
              {
                autoAlpha: 1,
                duration: 1.9,
                ease: 'none',
                motionPath: {
                  path: [
                    { x: direction * -reach, y: 62 },
                    { x: direction * -reach * 0.2, y: -48 - index * 7 },
                    { x: 0, y: 0 }
                  ],
                  curviness: 1.5
                }
              },
              index * 0.035
            )
          })

          const revealFocusedCreator = (event: FocusEvent) => {
            if ((event.target as HTMLElement).matches('.daytake-creator:focus-visible')) {
              peopleTimeline.scrollTrigger?.getTween()?.progress(1)
              peopleTimeline.progress(1)
            }
          }
          field.addEventListener('focusin', revealFocusedCreator)
          return () => {
            field.removeEventListener('focusin', revealFocusedCreator)
          }
        }

        document.fonts?.ready.then(() => ScrollTrigger.refresh())
      }
    )
  }, root)

  // Dual-row opposing horizontal auto-glide gallery
  const strip = galleryEl.value
  if (strip) {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tracks = gsap.utils.toArray<HTMLDivElement>('.daytake-gallery-lane', strip).map((lane, index) => ({
        lane,
        group: lane.firstElementChild as HTMLElement,
        direction: index === 0 ? 1 : -1,
        period: 0,
        position: 0,
        rendered: 0,
        resumeAt: 0
      }))

      const measure = () => {
        tracks.forEach((track) => {
          const period = track.group.offsetWidth
          if (period === track.period) return
          track.position = track.period
            ? (track.position / track.period) * period
            : track.direction === 1
              ? 0
              : period
          track.period = period
          track.lane.scrollLeft = track.position
          track.rendered = track.lane.scrollLeft
        })
      }

      const tick = (time: number, elapsed: number) => {
        if (document.hidden || rootEl.value?.dataset.motionPaused === 'true') return
        const inspecting = !!strip.querySelector(':focus-visible') || strip.matches(':active')
        for (const track of tracks) {
          if (track.lane.scrollLeft !== track.rendered) {
            track.position = track.lane.scrollLeft
            track.rendered = track.lane.scrollLeft
            track.resumeAt = time + 0.8
          }
          if (time < track.resumeAt || inspecting || !track.period) continue
          track.position = gsap.utils.wrap(
            0,
            track.period,
            track.position + track.direction * Math.min(elapsed, 48) * 0.032
          )
          track.lane.scrollLeft = track.position
          track.rendered = track.lane.scrollLeft
        }
      }

      measure()
      const resize = new ResizeObserver(measure)
      tracks.forEach((track) => resize.observe(track.group))
      const view = new IntersectionObserver(([entry]) => {
        gsap.ticker.remove(tick)
        if (entry?.isIntersecting) gsap.ticker.add(tick)
      })
      view.observe(strip)
      return () => {
        resize.disconnect()
        view.disconnect()
        gsap.ticker.remove(tick)
      }
    })
    galleryCleanup = () => mm.revert()
  }
})

onBeforeUnmount(() => {
  stopDemoPlayback()
  gsapContext?.revert()
  galleryCleanup?.()
})
</script>

<template>
  <div class="atelier-shell" :data-theme="isDark ? 'dark' : 'light'">
    <div
      id="top"
      ref="rootEl"
      class="daytake"
      :data-motion-paused="String(motionPaused || Boolean(selectedPoster) || Boolean(selectedMentor) || showDemoModal)"
    >
      <a class="preview-skip" href="#library">Lompat ke koleksi posisi</a>

      <!-- Window Chrome Bar -->
      <div class="daytake-window-bar" aria-hidden="true">
        <span><i /><i /><i /></span>
        <span>atelier.catur</span>
        <Maximize />
      </div>

      <!-- Header -->
      <header class="daytake-header daytake-wrap">
        <a class="daytake-logo" href="#top">
          <Crown aria-hidden="true" />
          <span>atelier</span>
        </a>

        <nav aria-label="Navigasi utama">
          <a href="#about">Filosofi</a>
          <a href="#library">Koleksi</a>
          <a href="#portraits">Bot ELO</a>
          <NuxtLink to="/dashboard" class="daytake-nav-app">Repertoar</NuxtLink>
          <NuxtLink to="/play" class="daytake-nav-app">Main Bot</NuxtLink>
        </nav>

        <button
          type="button"
          class="preview-icon-button"
          :aria-label="isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'"
          @click="toggleDark"
        >
          <Sun v-if="isDark" aria-hidden="true" />
          <Moon v-else aria-hidden="true" />
        </button>
      </header>

      <main>
        <!-- HERO SECTION with 3D Tilted Chess Mosaic -->
        <section ref="heroEl" class="daytake-hero" aria-labelledby="daytake-title">
          <div class="daytake-mosaic" aria-hidden="true">
            <div class="daytake-mosaic-grid">
              <div v-for="(column, colIdx) in mosaicColumns" :key="colIdx" class="daytake-mosaic-column">
                <div class="daytake-mosaic-track">
                  <div v-for="copy in [0, 1]" :key="copy" class="daytake-mosaic-set">
                    <div
                      v-for="poster in column"
                      :key="`${copy}-${poster.id}`"
                      class="daytake-mosaic-tile"
                    >
                      <UiChessArtwork :poster="poster" compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="daytake-wrap daytake-hero-content">
            <h1 id="daytake-title">
              Langkah tajam.<br />
              <span>Permainan berkelas.</span>
            </h1>
            <p>
              Pelatih pembukaan, lab babak akhir, dan arena bot ELO untuk pecatur yang membangun gaya
              mainnya sendiri.
            </p>
            <div class="daytake-hero-cta-row">
              <NuxtLink to="/dashboard" class="daytake-primary daytake-hero-cta">
                <span>Mulai Latihan Sekarang</span>
                <ArrowRight aria-hidden="true" />
              </NuxtLink>
              <NuxtLink to="/play" class="daytake-secondary-pill">
                <Bot aria-hidden="true" />
                <span>Lawan Bot 400–2400 ELO</span>
              </NuxtLink>
            </div>

            <div class="daytake-counter">
              <span class="daytake-counter-icon"><Users aria-hidden="true" /></span>
              <span>
                <small>Kombinasi posisi &amp; taktik teranalisis</small>
                <strong aria-label="128.450">
                  <span ref="counterEl" aria-hidden="true">128.450</span>
                </strong>
              </span>
            </div>
          </div>

          <div class="daytake-hero-foot daytake-wrap">
            <span>Temukan langkah yang layak dimainkan.</span>
            <a href="#about">
              <span>Lihat lebih dekat</span>
              <ArrowDown aria-hidden="true" />
            </a>
          </div>
        </section>

        <!-- SECTION 2: 3 Feature Pillars -->
        <section id="about" class="daytake-features daytake-wrap" aria-label="Cara kerja Grandmaster Atelier">
          <div class="daytake-feature-grid">
            <article v-for="feat in features" :key="feat.title" class="daytake-feature">
              <span class="daytake-feature-icon">
                <component :is="feat.icon" aria-hidden="true" />
              </span>
              <h2>{{ feat.title }}</h2>
              <p>{{ feat.description }}</p>
            </article>
          </div>
        </section>

        <!-- SECTION 3: Tilted Dual-Row Auto-Gliding Chess Collection -->
        <section id="library" ref="libraryEl" class="daytake-library" aria-labelledby="library-title">
          <div class="daytake-library-heading daytake-wrap">
            <h2 id="library-title">Temukan posisi <span>berikutnya.</span></h2>
            <p>Koleksi pembukaan klasik, struktur babak akhir, dan skenario taktis siap dilatih.</p>
          </div>

          <div ref="galleryEl" class="daytake-gallery">
            <div class="daytake-gallery-tilt">
              <div
                v-for="(row, rowIdx) in galleryRows"
                :key="rowIdx"
                class="daytake-gallery-lane"
                :aria-label="rowIdx === 0 ? 'Baris koleksi catur pertama' : 'Baris koleksi catur kedua'"
              >
                <div
                  v-for="copy in [0, 1, 2]"
                  :key="copy"
                  class="daytake-gallery-group"
                  :class="{ 'daytake-gallery-copy': copy > 0 }"
                  :aria-hidden="copy > 0 ? 'true' : undefined"
                >
                  <div v-for="poster in row" :key="`${copy}-${poster.id}`" class="daytake-photo-arrival">
                    <button
                      type="button"
                      class="daytake-photo"
                      :tabindex="copy > 0 ? -1 : undefined"
                      :aria-label="`Pratinjau ${poster.title}`"
                      @mousedown="copy > 0 ? $event.preventDefault() : undefined"
                      @click="selectedPoster = poster"
                    >
                      <div class="daytake-photo-art">
                        <UiChessArtwork :poster="poster" />
                      </div>
                      <span class="daytake-photo-badge daytake-category-badge">
                        <component :is="categoryIconFor(poster.category)" aria-hidden="true" />
                      </span>
                      <span class="daytake-photo-badge daytake-play-badge">
                        <Play aria-hidden="true" fill="currentColor" />
                      </span>
                      <span class="daytake-photo-caption">{{ poster.title }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="daytake-gallery-footer daytake-wrap">
            <span>Perspektif taktis segar di setiap langkah.</span>
            <button
              type="button"
              class="daytake-motion-toggle"
              :aria-label="motionPaused ? 'Lanjutkan gerakan koleksi' : 'Jeda gerakan koleksi'"
              :aria-pressed="motionPaused"
              @click="motionPaused = !motionPaused"
            >
              <Play v-if="motionPaused" aria-hidden="true" />
              <Pause v-else aria-hidden="true" />
              <span>{{ motionPaused ? 'Lanjutkan' : 'Jeda' }}</span>
            </button>
          </div>
        </section>

        <!-- SECTION 4: Editorial Interactive Showcase Stage -->
        <section class="daytake-editorial daytake-wrap" aria-labelledby="daytake-editorial-title">
          <figure class="daytake-editorial-figure">
            <div class="daytake-editorial-stage">
              <div class="daytake-editorial-media">
                <button
                  type="button"
                  class="daytake-editorial-photo"
                  :data-full-frame="fullFrame"
                  aria-label="Buka pratinjau Studio Analisis"
                  @click="selectedPoster = editorialPoster"
                >
                  <UiChessArtwork :poster="editorialPoster" />
                </button>
                <button
                  type="button"
                  class="daytake-editorial-open"
                  aria-label="Putar demo partai abadi Paul Morphy"
                  @click="openDemoModal"
                >
                  <Play fill="currentColor" aria-hidden="true" />
                </button>
              </div>

              <!-- Floating Glass Toolbar -->
              <div class="daytake-editorial-toolbar" role="group" aria-label="Alat pratinjau catur">
                <button type="button" aria-label="Buka pratinjau penuh" @click="selectedPoster = editorialPoster">
                  <ImageIcon aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Ubah skala bingkai"
                  :aria-pressed="fullFrame"
                  @click="fullFrame = !fullFrame"
                >
                  <Crop aria-hidden="true" />
                </button>
                <button
                  type="button"
                  :aria-label="saved ? 'Hapus dari favorit' : 'Simpan ke favorit'"
                  :aria-pressed="saved"
                  @click="saved = !saved"
                >
                  <Check v-if="saved" aria-hidden="true" />
                  <Heart v-else aria-hidden="true" />
                </button>
                <NuxtLink to="/sandbox" aria-label="Buka di Sandbox PGN/FEN">
                  <ArrowUpRight aria-hidden="true" />
                </NuxtLink>
              </div>

              <!-- Audio Waveform Card -->
              <button
                type="button"
                class="daytake-audio"
                aria-label="Catatan audio pelatih, 1 menit 45 detik"
                @click="playCoachCadence"
              >
                <div class="daytake-waveform" aria-hidden="true">
                  <i v-for="(height, idx) in waveform" :key="idx" :style="{ height: `${height}px` }" />
                </div>
                <div class="daytake-audio-meta">
                  <span><Play :size="10" fill="currentColor" /> Catatan pelatih</span>
                  <span>01:45</span>
                </div>
                <span class="daytake-audio-progress" aria-hidden="true" />
              </button>

              <!-- Animated SVG Connector Line -->
              <svg class="daytake-editorial-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path
                  class="daytake-editorial-connector"
                  d="M 86 61 H 94 Q 97 61 97 64 V 85 Q 97 88 94 88 H 79 M 82 86 L 79 88 L 82 90"
                />
              </svg>

              <!-- Floating Question Card -->
              <button
                type="button"
                class="daytake-editorial-card daytake-editorial-question"
                aria-label="Pratinjau pertanyaan strategi"
                @click="selectedPoster = questionPoster"
              >
                <span class="daytake-mini-image">
                  <div class="daytake-mini-art">
                    <UiChessArtwork :poster="questionPoster" compact />
                  </div>
                  <i><Play fill="currentColor" /></i>
                </span>
                <strong>Tantangan</strong>
                <small>Bagaimana tembus pusat?</small>
              </button>

              <!-- Floating Result Card -->
              <button
                type="button"
                class="daytake-editorial-card daytake-editorial-result"
                aria-label="Pratinjau hasil teknik"
                @click="selectedPoster = resultPoster"
              >
                <div class="daytake-mini-art">
                  <UiChessArtwork :poster="resultPoster" compact />
                </div>
                <strong>Jembatan Lucena.</strong>
              </button>
            </div>
            <figcaption>Di atas papan. Ruang tenang untuk menyusun kemenangan.</figcaption>
          </figure>

          <div class="daytake-editorial-content">
            <h2 id="daytake-editorial-title">
              Beri ruang bagi<br />
              <span>strategi baru.</span>
            </h2>
            <p>
              Satu langkah profilaksis dapat mengubah seluruh jalannya partai. Ikuti struktur, pahami
              petak kunci, dan ubah teori menjadi insting alami.
            </p>
            <div class="daytake-editorial-actions">
              <NuxtLink to="/dashboard" class="daytake-primary">
                <span>Buka Pustaka Latihan</span>
                <ArrowRight aria-hidden="true" />
              </NuxtLink>
              <button type="button" class="daytake-watch" @click="openDemoModal">
                <span><Play fill="currentColor" aria-hidden="true" /></span>
                <span>Tonton demo partai</span>
              </button>
            </div>

            <div class="daytake-trust">
              <div class="daytake-trust-item">
                <Crown aria-hidden="true" />
                <span>100% aturan FIDE<br />via chess.js</span>
              </div>
              <div class="daytake-trust-item">
                <BadgeCheck aria-hidden="true" />
                <span>Analisis &amp; Bot<br />Minimax lokal</span>
              </div>
              <div class="daytake-trust-item">
                <MessageCircle aria-hidden="true" />
                <span>Penjelasan<br />Bahasa Indonesia</span>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 5: Wave-Path Bot Mentors -->
        <section id="portraits" class="daytake-people" aria-labelledby="daytake-people-title">
          <div class="daytake-wrap">
            <h2 id="daytake-people-title">
              Para lawan<br />
              di balik <span>papan.</span>
            </h2>
            <p>Beragam gaya main. Dari pemula 400 ELO hingga Grandmaster 2400 ELO.</p>
          </div>

          <div class="daytake-portrait-field">
            <svg
              v-for="wave in waves"
              :key="wave.layout"
              class="daytake-portrait-line"
              :class="`daytake-portrait-line-${wave.layout}`"
              :viewBox="wave.box"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path class="daytake-portrait-trace" :d="wave.path" />
            </svg>

            <span
              v-for="idx in [0, 1, 2, 3]"
              :key="idx"
              class="daytake-particle-arrival"
              :class="`particle-${idx}`"
              aria-hidden="true"
            >
              <i class="daytake-particle" />
            </span>

            <ul class="daytake-creators">
              <li v-for="mentor in botMentors" :key="mentor.id" class="daytake-creator-arrival">
                <button
                  type="button"
                  class="daytake-creator"
                  :aria-label="`Lihat profil ${mentor.name}`"
                  @click="selectedMentor = mentor"
                >
                  <span
                    class="daytake-creator-plate"
                    :class="mentor.color"
                    :style="{ '--tilt': `${mentor.tilt}deg` }"
                  >
                    <span class="daytake-creator-backplate" :class="mentor.color" aria-hidden="true" />
                    <span class="daytake-creator-body" aria-hidden="true" />
                    <span class="daytake-creator-avatar">
                      <UiChessArtwork :poster="mentor.poster" compact />
                    </span>
                    <span class="daytake-creator-caption">
                      <strong>{{ mentor.name }}</strong>
                      <span class="daytake-creator-badge">
                        Bot ELO <ArrowUpRight aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                  <small class="daytake-creator-specialty">{{ mentor.specialty }}</small>
                </button>
              </li>
            </ul>
          </div>

          <NuxtLink to="/play" class="daytake-text-link">
            <span>Tantang semua 6 bot ELO atau main 2 orang</span>
            <ArrowUpRight aria-hidden="true" />
          </NuxtLink>
        </section>
      </main>

      <!-- Footer -->
      <footer class="daytake-footer daytake-wrap">
        <div>
          <a class="daytake-logo" href="#top">
            <Crown aria-hidden="true" />
            <span>atelier</span>
          </a>
          <p>Cara baru yang tenang dan tajam untuk menguasai catur.</p>
        </div>

        <nav aria-label="Navigasi footer">
          <NuxtLink to="/dashboard">Pustaka Repertoar</NuxtLink>
          <NuxtLink to="/play">Main Bot &amp; 2P</NuxtLink>
          <NuxtLink to="/sandbox">Sandbox PGN/FEN</NuxtLink>
        </nav>

        <small class="daytake-demo-note">
          Grandmaster Atelier: Pelatih pembukaan, lab babak akhir Minimax, dan arena tanding lokal
          dalam Bahasa Indonesia. Seluruh progres tersimpan aman di browser Anda.
        </small>
      </footer>
    </div>

    <!-- Modal: Poster Preview -->
    <div
      v-if="selectedPoster"
      class="atelier-modal-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedPoster.title"
      @click.self="selectedPoster = null"
    >
      <div class="atelier-modal-card">
        <button
          type="button"
          class="preview-icon-button preview-close"
          aria-label="Tutup dialog"
          @click="selectedPoster = null"
        >
          <X aria-hidden="true" />
        </button>

        <div class="atelier-modal-art">
          <UiChessArtwork :poster="selectedPoster" />
        </div>

        <div class="daytake-dialog-info">
          <div>
            <span class="atelier-modal-notation">{{ selectedPoster.notation }}</span>
            <h2>{{ selectedPoster.title }}</h2>
            <p>{{ selectedPoster.description }}</p>
          </div>
          <NuxtLink
            :to="selectedPoster.route"
            class="daytake-primary"
            style="flex-shrink: 0"
            @click="selectedPoster = null"
          >
            <span>Latih Sekarang</span>
            <ArrowRight aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Modal: Bot Mentor Profile -->
    <div
      v-if="selectedMentor"
      class="atelier-modal-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedMentor.name"
      @click.self="selectedMentor = null"
    >
      <div class="atelier-modal-card">
        <button
          type="button"
          class="preview-icon-button preview-close"
          aria-label="Tutup dialog"
          @click="selectedMentor = null"
        >
          <X aria-hidden="true" />
        </button>

        <div class="atelier-modal-art">
          <UiChessArtwork :poster="selectedMentor.poster" />
        </div>

        <div class="daytake-dialog-info">
          <div>
            <span class="atelier-modal-notation">Rating {{ selectedMentor.elo }} ELO · {{ selectedMentor.specialty }}</span>
            <h2>{{ selectedMentor.name }}</h2>
            <p>{{ selectedMentor.bio }}</p>
          </div>
          <NuxtLink
            to="/play"
            class="daytake-primary"
            style="flex-shrink: 0"
            @click="selectedMentor = null"
          >
            <span>Tantang Bot</span>
            <Swords aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Modal: Live Animated Opera Game (Paul Morphy, 1858) -->
    <div
      v-if="showDemoModal"
      class="atelier-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Demo Partai Abadi Opera Game"
      @click.self="closeDemoModal"
    >
      <div class="atelier-modal-card atelier-demo-card">
        <button
          type="button"
          class="preview-icon-button preview-close"
          aria-label="Tutup demo"
          @click="closeDemoModal"
        >
          <X aria-hidden="true" />
        </button>

        <div class="atelier-demo-board-wrap">
          <div style="width: min(400px, 100%); margin: 0 auto">
            <ChessBoard
              :fen="currentDemoSnap.fen"
              orientation="w"
              :interactive="false"
              :show-center-control-toggle="false"
              :last-move="currentDemoSnap.lastMove"
            />
          </div>
        </div>

        <div class="daytake-dialog-info">
          <div>
            <span class="atelier-modal-notation">
              Opera Game · Paris 1858 · Langkah {{ demoStep }} / {{ OPERA_GAME_MOVES.length }}
              <template v-if="demoStep > 0"> ({{ currentDemoSnap.san }})</template>
            </span>
            <h2>Pengorbanan Menteri Paul Morphy.</h2>
            <p>
              Demonstrasi keindahan pengembangan cepat, kendali lajur terbuka, dan skakmat klasik
              16. Qb8+! Nxb8 17. Rd8#.
            </p>
          </div>

          <div style="display: flex; gap: 8px; flex-shrink: 0">
            <button
              type="button"
              class="preview-icon-button"
              :aria-label="demoPlaying ? 'Jeda demo' : 'Putar demo'"
              @click="demoPlaying ? stopDemoPlayback() : startDemoPlayback()"
            >
              <Pause v-if="demoPlaying" aria-hidden="true" />
              <Play v-else aria-hidden="true" />
            </button>
            <button
              type="button"
              class="preview-icon-button"
              aria-label="Ulangi dari awal"
              @click="
                () => {
                  demoStep = 0
                  startDemoPlayback()
                }
              "
            >
              <RotateCcw aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.atelier-shell {
  font-family: "Manrope", "Plus Jakarta Sans", system-ui, sans-serif;
  --page: #fffefd;
  --outer: #efedfa;
  --ink: #1b2139;
  --muted: #666578;
  --line: #e5e2ef;
  --surface: #f4f2fa;
  --accent: #d84f38;
  --accent-ink: #ffffff;
  --focus: #344dcc;
  --blue: #3658cc;
  --about: #f4f0fc;
  --feature-blue: #4f7aee;
  --feature-violet: #8c63da;
  --feature-cyan: #39baca;
  min-height: 100vh;
  background: var(--outer);
  color: var(--ink);
  padding: 28px 0;
  overflow-x: clip;
  transition: background-color 0.25s ease, color 0.25s ease;
}

.atelier-shell[data-theme="dark"] {
  --page: #151521;
  --outer: #0e0d16;
  --ink: #f6f3ff;
  --muted: #b5b0c6;
  --line: #343044;
  --surface: #242233;
  --accent: #ff927e;
  --accent-ink: #2d1510;
  --focus: #a8b5ff;
  --blue: #a8b5ff;
  --about: #242032;
}

.atelier-shell a {
  color: inherit;
  text-decoration: none;
}

.atelier-shell button {
  color: inherit;
  cursor: pointer;
}

.preview-icon-button {
  display: inline-grid;
  place-items: center;
  flex: none;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--page);
  color: var(--ink);
}
.preview-icon-button:hover:enabled {
  background: var(--surface);
}
.preview-icon-button svg {
  inline-size: 18px;
  block-size: 18px;
}

.preview-skip {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 30;
  transform: translateY(-160%);
  color: var(--ink);
  background: var(--page);
  padding: 12px 16px;
  border-radius: 10px;
}
.preview-skip:focus {
  transform: none;
}

.daytake {
  width: min(1360px, calc(100% - 56px));
  margin: 0 auto;
  background: var(--page);
  border-radius: 18px;
  overflow-x: clip;
  box-shadow: 0 28px 90px rgb(49 37 98 / 0.08);
  color: var(--ink);
}

.daytake-wrap {
  width: calc(100% - clamp(36px, 8vw, 128px));
  max-width: 1180px;
  margin-inline: auto;
}

.daytake-window-bar {
  height: 34px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 18px;
  font-size: 10px;
  color: var(--muted);
  font-family: "JetBrains Mono", monospace;
}
.daytake-window-bar > span:first-child {
  display: flex;
  gap: 6px;
}
.daytake-window-bar i {
  width: 7px;
  height: 7px;
  background: #ddd9e9;
  border-radius: 50%;
}
.daytake-window-bar i:first-child {
  background: #edafa5;
}
.daytake-window-bar svg {
  width: 11px;
  height: 11px;
  opacity: 0.5;
}

.daytake-header {
  position: relative;
  z-index: 5;
  min-height: 82px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.daytake-logo {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}
.daytake-logo svg {
  width: 27px;
  height: 27px;
  color: var(--accent);
  stroke-width: 2.2;
}
.daytake-header nav {
  display: flex;
  align-items: center;
  gap: 28px;
  font-size: 0.8rem;
  font-weight: 700;
}
.daytake-header nav a {
  min-height: 44px;
  display: grid;
  align-items: center;
}
.daytake-header nav a:hover,
.daytake-footer nav a:hover {
  color: var(--blue);
}
.daytake-nav-app {
  color: var(--blue) !important;
}
.daytake-header .preview-icon-button {
  width: 36px;
  height: 36px;
  min-height: 44px;
  min-width: 44px;
  border: 0;
  background: transparent;
}

.daytake-hero {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: clamp(510px, 44vw, 640px);
  overflow: clip;
  background: var(--page);
}
.daytake-hero-content {
  position: relative;
  z-index: 2;
  padding: 32px 0 100px;
  pointer-events: none;
}
.daytake-hero-content a,
.daytake-hero-content button {
  pointer-events: auto;
}
.daytake h1,
.daytake h2 {
  font-family: "Manrope", "Plus Jakarta Sans", system-ui, sans-serif;
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-wrap: balance;
}
.daytake h1 {
  font-size: clamp(2.85rem, 5.4vw, 5rem);
  line-height: 1.05;
}
.daytake h1 span,
.daytake h2 span {
  color: var(--blue);
}
.daytake h2 {
  font-size: clamp(2rem, 3.1vw, 3.1rem);
  line-height: 1.14;
}
.daytake-hero p {
  max-width: 34ch;
  margin: 22px 0 28px;
  font-size: clamp(0.95rem, 1.25vw, 1.1rem);
  line-height: 1.65;
  color: var(--muted);
}
.daytake-hero-cta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.daytake-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  min-height: 48px;
  padding: 12px 24px;
  border: 0;
  border-radius: 99px;
  background: var(--accent);
  color: var(--accent-ink) !important;
  font-size: 0.82rem;
  font-weight: 700;
  transition: box-shadow 0.2s, translate 0.2s;
}
.daytake-primary:hover {
  box-shadow: 0 6px 18px rgb(216 79 56 / 0.24);
  translate: 0 -1px;
}
.daytake-primary svg {
  width: 15px;
  height: 15px;
}

.daytake-secondary-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 20px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--page);
  color: var(--ink);
  font-size: 0.8rem;
  font-weight: 700;
  transition: border-color 0.2s, background-color 0.2s;
}
.daytake-secondary-pill:hover {
  border-color: var(--blue);
  background: var(--surface);
}
.daytake-secondary-pill svg {
  width: 15px;
  height: 15px;
  color: var(--blue);
}

.daytake-counter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
}
.daytake-counter-icon {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
}
.daytake-counter-icon svg {
  width: 17px;
  height: 17px;
  color: var(--muted);
}
.daytake-counter small {
  display: block;
  font-size: 0.68rem;
  color: var(--muted);
  margin-bottom: 2px;
}
.daytake-counter strong {
  font-size: 1.12rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.daytake-hero-foot {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--muted);
}
.daytake-hero-foot a {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.daytake-hero-foot svg {
  width: 12px;
  height: 12px;
}

.daytake-mosaic {
  --mosaic-gap: clamp(10px, 1.35vw, 20px);
  position: absolute;
  inset: 0 -9% 0 43%;
  display: flex;
  align-items: center;
  perspective: 1000px;
  pointer-events: none;
  mask-image:
    linear-gradient(90deg, transparent, #000 17%, #000 90%, transparent),
    linear-gradient(180deg, transparent, #000 19%, #000 80%, transparent);
  mask-composite: intersect;
}
.daytake-mosaic-grid {
  flex: none;
  width: 110%;
  height: 860px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--mosaic-gap);
  transform-style: preserve-3d;
  transform: rotateX(18deg) rotateY(-24deg) rotateZ(-12deg) translateZ(-150px);
  transform-origin: 50% 50%;
}
.daytake-mosaic-column {
  min-width: 0;
  overflow: visible;
}
.daytake-mosaic-track {
  will-change: transform;
}
.daytake-mosaic-set {
  display: grid;
  gap: var(--mosaic-gap);
  padding-bottom: var(--mosaic-gap);
}
.daytake-mosaic-tile {
  width: 100%;
  aspect-ratio: 0.87;
  border-radius: 13px;
  overflow: hidden;
  background: var(--surface);
}
.daytake-mosaic::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 16%;
  backdrop-filter: blur(8px);
  mask-image: linear-gradient(90deg, #000, transparent);
}

.daytake-features {
  padding-block: clamp(54px, 6.5vw, 94px);
}
.daytake-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 5.8vw, 90px);
}
.daytake-feature {
  --feature: var(--feature-blue);
}
.daytake-feature:nth-child(2) {
  --feature: var(--feature-violet);
}
.daytake-feature:nth-child(3) {
  --feature: var(--feature-cyan);
}
.daytake-feature-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  margin-bottom: 23px;
  background: var(--feature);
  color: #fff;
  box-shadow: 0 7px 18px color-mix(in srgb, var(--feature) 18%, transparent);
}
.daytake-feature-icon svg {
  width: 25px;
  height: 25px;
  stroke-width: 1.7;
}
.daytake .daytake-feature h2 {
  max-width: 18ch;
  font-size: 1.15rem;
  line-height: 1.3;
  letter-spacing: -0.025em;
}
.daytake-feature p {
  max-width: 32ch;
  font-size: 0.84rem;
  line-height: 1.7;
  color: var(--muted);
  margin: 12px 0 0;
}

/* Gallery */
.daytake-library {
  position: relative;
  padding: 55px 0 28px;
  overflow: clip;
  background: var(--page);
}
.daytake-library-heading {
  text-align: center;
  margin-bottom: 28px;
}
.daytake-library-heading p {
  margin: 14px 0 0;
  font-size: 0.92rem;
  color: var(--muted);
}
.daytake-gallery {
  --gallery-gap: 18px;
  --gallery-card: clamp(195px, 20vw, 270px);
  padding: 20px 0;
  overflow: clip;
}
.daytake-gallery-tilt {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  rotate: 2deg;
  margin-inline: -30px;
}
.daytake-gallery-lane {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  overflow-anchor: none;
  scrollbar-width: none;
  padding: 8px 0;
  overscroll-behavior-x: contain;
  touch-action: pan-x pan-y;
}
.daytake-gallery-lane::-webkit-scrollbar {
  display: none;
}
.daytake-gallery-group {
  display: flex;
  flex: none;
  gap: var(--gallery-gap);
  padding-right: var(--gallery-gap);
}
.daytake-photo-arrival {
  flex: 0 0 var(--gallery-card);
  width: var(--gallery-card);
}
.daytake-photo {
  width: 100%;
  aspect-ratio: 1.55;
  position: relative;
  padding: 0;
  display: block;
  border: 0;
  border-radius: 13px;
  background: var(--surface);
  overflow: hidden;
}
.daytake-photo-art {
  width: 100%;
  height: 100%;
  transition: scale 0.45s ease;
}
.daytake-photo:hover .daytake-photo-art {
  scale: 1.04;
}
.daytake-photo-badge {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.daytake-category-badge {
  top: 12px;
  left: 12px;
  width: 27px;
  height: 27px;
  color: #574674;
  background: #fffdf9;
}
.daytake-category-badge svg {
  width: 13px;
  height: 13px;
}
.daytake-play-badge {
  bottom: 12px;
  right: 12px;
  width: 35px;
  height: 35px;
  background: #ec7159;
  color: #fff;
}
.daytake-play-badge svg {
  width: 13px;
  height: 13px;
  margin-left: 2px;
}
.daytake-photo-caption {
  position: absolute;
  left: 14px;
  bottom: 13px;
  max-width: 70%;
  color: #fff;
  font-size: 0.74rem;
  font-weight: 700;
  text-shadow: 0 2px 6px rgb(0 0 0 / 0.7);
  transition: opacity 0.2s;
}
.daytake-gallery-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.7rem;
  margin-top: 12px;
}
.daytake-motion-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 64px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.7rem;
}
.daytake-motion-toggle:hover {
  color: var(--blue);
}
.daytake-motion-toggle svg {
  width: 13px;
  height: 13px;
}

/* Editorial Stage */
.daytake-editorial {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: center;
  column-gap: clamp(32px, 5.5vw, 85px);
  padding-block: 85px;
  margin-block: 35px;
  position: relative;
}
.daytake-editorial::before {
  content: "";
  position: absolute;
  z-index: 0;
  top: 80px;
  bottom: 90px;
  left: 20%;
  right: -5%;
  background: linear-gradient(90deg, transparent, var(--about) 45%, var(--about));
  border-radius: 16px;
  pointer-events: none;
}
.daytake-editorial-figure {
  margin: 0;
  min-width: 0;
  z-index: 1;
}
.daytake-editorial-stage {
  position: relative;
  isolation: isolate;
  aspect-ratio: 1 / 1.1;
}
.daytake-editorial-media {
  position: absolute;
  inset: 0 auto auto 7%;
  width: 76%;
  height: 97%;
  transform-origin: center bottom;
}
.daytake-editorial-photo {
  display: block;
  padding: 0;
  border: 0;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  background: #ddd5cc;
  transition: padding 0.25s ease;
}
.daytake-editorial-photo[data-full-frame="true"] {
  padding: 16px;
  background: var(--surface);
}
.daytake-editorial-open {
  position: absolute;
  right: -18px;
  top: 14px;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: 0 6px 18px rgb(131 42 19 / 0.16);
}
.daytake-editorial-open svg {
  width: 21px;
  height: 21px;
  margin-left: 3px;
}
.daytake-editorial-toolbar {
  position: absolute;
  top: 24%;
  left: 0;
  width: 43px;
  display: grid;
  padding: 5px 0;
  background: rgb(255 255 255 / 0.8);
  backdrop-filter: blur(14px);
  border-radius: 99px;
  box-shadow: 0 7px 20px rgb(31 24 68 / 0.1);
}
.atelier-shell[data-theme="dark"] .daytake-editorial-toolbar {
  background: rgb(27 27 43 / 0.85);
}
.daytake-editorial-toolbar button,
.daytake-editorial-toolbar a {
  display: grid;
  place-items: center;
  width: 43px;
  height: 39px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #777184;
}
.atelier-shell[data-theme="dark"] .daytake-editorial-toolbar button,
.atelier-shell[data-theme="dark"] .daytake-editorial-toolbar a {
  color: #e0d7f5;
}
.daytake-editorial-toolbar svg {
  width: 16px;
  height: 16px;
}
.daytake-editorial-toolbar [aria-pressed="true"],
.daytake-editorial-toolbar button:hover,
.daytake-editorial-toolbar a:hover {
  color: var(--blue);
}

.daytake-audio {
  position: absolute;
  z-index: 3;
  left: 0;
  bottom: 9%;
  width: 48%;
  padding: 10px 12px;
  border: 0;
  border-radius: 11px;
  background: #fff;
  color: #3b5e4e !important;
  box-shadow: 0 9px 24px rgb(25 35 47 / 0.14);
  text-align: left;
}
.daytake-waveform {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  height: 30px;
}
.daytake-waveform i {
  display: block;
  flex: 1;
  max-width: 3px;
  border-radius: 2px;
  background: #63bc9a;
}
.daytake-waveform i:nth-child(n + 19) {
  background: #bcd6c9;
}
.daytake-audio-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.56rem;
  font-weight: 700;
}
.daytake-audio-meta > span:first-child {
  display: flex;
  gap: 5px;
  align-items: center;
}
.daytake-audio-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 62%;
  height: 3px;
  background: #62b699;
  border-radius: 0 0 0 11px;
}

.daytake-editorial-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.daytake-editorial-line path {
  fill: none;
  stroke: var(--blue);
  stroke-width: 0.35;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.daytake-editorial-card {
  position: absolute;
  z-index: 2;
  width: 30%;
  left: 69%;
  text-align: left;
  padding: 6px;
  border: 0;
  border-radius: 10px;
  background: var(--page);
  box-shadow: 0 8px 24px rgb(35 27 60 / 0.13);
}
.daytake-editorial-question {
  top: 51%;
}
.daytake-editorial-result {
  top: 82%;
  left: 53%;
  width: 28%;
}
.daytake-mini-art {
  width: 100%;
  aspect-ratio: 1.85;
  border-radius: 6px;
  overflow: hidden;
}
.daytake-editorial-card strong {
  display: block;
  padding: 5px 2px 2px;
  font-size: clamp(0.58rem, 0.85vw, 0.74rem);
  line-height: 1.2;
}
.daytake-editorial-card small {
  display: block;
  color: var(--muted);
  font-size: clamp(0.45rem, 0.62vw, 0.55rem);
  padding: 1px 2px 3px;
}
.daytake-mini-image {
  position: relative;
  display: block;
}
.daytake-mini-image i {
  position: absolute;
  display: grid;
  place-items: center;
  width: 23px;
  height: 23px;
  right: -10px;
  top: 2px;
  border-radius: 50%;
  color: #fff;
  background: #ec7159;
}
.daytake-mini-image svg {
  width: 9px;
  height: 9px;
  margin-left: 1px;
}
.daytake-editorial-figure figcaption {
  margin: 12px 7% 0;
  font-size: 0.64rem;
  color: var(--muted);
}

.daytake-editorial-content {
  position: relative;
  z-index: 1;
}
.daytake-editorial-content h2 {
  font-size: clamp(2rem, 3.55vw, 3.5rem);
  line-height: 1.13;
}
.daytake-editorial-content > p {
  max-width: 36ch;
  margin: 22px 0 28px;
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--muted);
}
.daytake-editorial-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}
.daytake-watch {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 700;
  min-height: 48px;
}
.daytake-watch > span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line);
  border-radius: 50%;
}
.daytake-watch svg {
  width: 11px;
  height: 11px;
  margin-left: 2px;
  color: var(--blue);
}
.daytake-watch:hover {
  color: var(--blue);
}
.daytake-trust {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 15px;
  border-top: 1px solid var(--line);
  margin-top: 35px;
  padding-top: 22px;
}
.daytake-trust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.62rem;
  line-height: 1.5;
  color: var(--muted);
}
.daytake-trust-item svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--blue);
}
.daytake-trust-item:nth-child(2) svg {
  color: var(--accent);
}
.daytake-trust-item:nth-child(3) svg {
  color: #8b69a4;
}

/* Wave Path Bot Mentors */
.daytake-people {
  padding: 40px 0 78px;
  text-align: center;
  overflow: clip;
}
.daytake-people h2 {
  font-size: clamp(2rem, 3.5vw, 3.4rem);
}
.daytake-people > .daytake-wrap > p {
  font-size: 0.92rem;
  color: var(--muted);
  margin: 18px 0 0;
}
.daytake-portrait-field {
  width: min(1120px, 100%);
  position: relative;
  isolation: isolate;
  margin: 20px auto 6px;
  height: 390px;
}
.daytake-portrait-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}
.daytake-portrait-trace {
  fill: none;
  stroke: color-mix(in srgb, var(--blue) 30%, var(--page));
  stroke-width: 1.5;
}
.daytake-portrait-line-phone {
  display: none;
}
.daytake-creators {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  width: 100%;
}
.daytake-creator-arrival {
  padding-top: 40px;
}
.daytake-creator-arrival:nth-child(2) {
  padding-top: 140px;
}
.daytake-creator-arrival:nth-child(3) {
  padding-top: 20px;
}
.daytake-creator-arrival:nth-child(4) {
  padding-top: 120px;
}
.daytake-creator {
  display: inline-grid;
  justify-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  border-radius: 24px;
}
.daytake-creator-plate {
  position: relative;
  display: block;
  width: clamp(148px, 15vw, 188px);
  aspect-ratio: 1;
  margin-bottom: 20px;
}
.daytake-creator-backplate {
  position: absolute;
  inset: 0;
  border-radius: 28%;
  transform: rotate(var(--tilt));
  background: #e6def8;
}
.daytake-creator-backplate.lavender {
  background: repeating-linear-gradient(35deg, #e7dff7 0 9px, #dcd2f0 9px 11px);
}
.daytake-creator-backplate.pink {
  background: #f4d9e0;
}
.daytake-creator-backplate.cream {
  background: #f1e6d1;
}
.daytake-creator-backplate.yellow {
  background: repeating-linear-gradient(-35deg, #f4ecbf 0 9px, #eae0a9 9px 11px);
}
.daytake-creator-body {
  position: absolute;
  inset: 9% 10%;
  border-radius: 17px;
  background: #fffefa;
  box-shadow: 0 8px 18px #3628380c;
}
.daytake-creator-avatar {
  position: absolute;
  width: 38%;
  aspect-ratio: 1;
  left: 31%;
  top: 17%;
  border-radius: 50%;
  overflow: hidden;
  transform-origin: 50% 50%;
}
.daytake-creator-caption {
  position: absolute;
  inset: 59% 8% auto;
  display: grid;
  justify-items: center;
  gap: 7px;
  color: #252336;
}
.daytake-creator-caption strong {
  font-size: clamp(0.62rem, 0.85vw, 0.74rem);
  line-height: 1.25;
  letter-spacing: -0.015em;
}
.daytake-creator-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 0.55rem;
  font-weight: 700;
  border-radius: 99px;
  color: #534d68;
  background: #eeebf4;
}
.daytake-creator-badge svg {
  width: 10px;
  height: 10px;
}
.daytake-creator-specialty {
  font-size: 0.68rem;
  color: var(--muted);
}
.daytake-creator:hover .daytake-creator-caption strong {
  color: #314ec7;
}
.daytake-particle-arrival {
  position: absolute;
  pointer-events: none;
}
.daytake-particle {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6682e8;
}
.particle-0 {
  left: 3%;
  top: 56%;
}
.particle-1 {
  left: 29%;
  top: 9%;
}
.particle-1 .daytake-particle {
  width: 15px;
  height: 15px;
  background: #f38d79;
}
.particle-2 {
  left: 62%;
  top: 78%;
}
.particle-2 .daytake-particle {
  width: 6px;
  height: 6px;
  background: #272b50;
}
.particle-3 {
  left: 91%;
  top: 8%;
}
.particle-3 .daytake-particle {
  width: 9px;
  height: 9px;
  background: #f38d79;
}

.daytake-text-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: var(--blue) !important;
  font-size: 0.82rem;
  font-weight: 700;
}
.daytake-text-link svg {
  width: 15px;
  height: 15px;
}
.daytake-text-link:hover {
  text-decoration: underline;
  text-underline-offset: 0.3em;
}

/* Footer */
.daytake-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--line);
  padding: 30px 0 24px;
}
.daytake-footer p {
  font-size: 0.74rem;
  color: var(--muted);
  margin: 8px 0;
}
.daytake-footer nav {
  display: flex;
  gap: 24px;
  font-size: 0.76rem;
  font-weight: 600;
}
.daytake-footer nav a {
  min-height: 44px;
  display: grid;
  align-items: center;
}
.daytake-demo-note {
  flex-basis: 100%;
  font-size: 0.65rem;
  line-height: 1.7;
  color: var(--muted);
}

/* Modals */
.atelier-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgb(12 12 18 / 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.atelier-modal-card {
  position: relative;
  width: min(740px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  border-radius: 18px;
  background: var(--page);
  color: var(--ink);
  border: 1px solid var(--line);
  box-shadow: 0 28px 80px rgb(0 0 0 / 0.35);
}
.preview-close {
  position: absolute;
  z-index: 5;
  top: 14px;
  right: 14px;
}
.atelier-modal-art {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: var(--surface);
}
.atelier-demo-board-wrap {
  padding: 24px 20px 8px;
  background: var(--surface);
}
.atelier-modal-notation {
  display: inline-block;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--blue);
  margin-bottom: 6px;
}
.daytake-dialog-info {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 22px;
}
.daytake-dialog-info h2 {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
}
.daytake-dialog-info p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.6;
  max-width: 48ch;
}

@media (max-width: 1000px) {
  .atelier-shell {
    padding: 16px 0;
  }
  .daytake {
    width: calc(100% - 32px);
  }
  .daytake-wrap {
    width: calc(100% - 64px);
  }
  .daytake-header {
    min-height: 75px;
  }
  .daytake-hero {
    min-height: 510px;
  }
  .daytake-hero h1 {
    font-size: 3.35rem;
  }
  .daytake-hero-content {
    padding-bottom: 82px;
  }
  .daytake-mosaic {
    inset: 0 -18% 0 43%;
  }
  .daytake-mosaic-grid {
    height: 680px;
  }
  .daytake-editorial {
    column-gap: 32px;
  }
  .daytake-editorial-content h2 {
    font-size: 2.25rem;
  }
  .daytake-editorial-actions {
    gap: 12px;
  }
  .daytake-trust {
    gap: 8px;
  }
  .daytake-trust-item {
    flex-direction: column;
    align-items: start;
  }
}

@media (max-width: 759px) {
  .atelier-shell {
    padding: 8px 0;
  }
  .daytake {
    width: calc(100% - 16px);
    border-radius: 13px;
  }
  .daytake-wrap {
    width: calc(100% - 36px);
  }
  .daytake-window-bar {
    height: 27px;
    padding-inline: 12px;
    font-size: 9px;
  }
  .daytake-header {
    min-height: 66px;
    gap: 8px;
  }
  .daytake-logo {
    font-size: 1.2rem;
    gap: 5px;
  }
  .daytake-header nav {
    gap: 12px;
    font-size: 0.7rem;
  }
  .daytake-header nav a:nth-child(1),
  .daytake-header nav a:nth-child(2),
  .daytake-header nav a:nth-child(3) {
    display: none;
  }
  .daytake-hero {
    display: grid;
    align-items: start;
    grid-template-rows: auto 300px;
    min-height: 0;
    padding-bottom: 44px;
  }
  .daytake-hero-content {
    grid-row: 1;
    padding: 30px 0 0;
  }
  .daytake-hero h1 {
    font-size: clamp(2.45rem, 10vw, 3.8rem);
  }
  .daytake-mosaic {
    grid-row: 2;
    position: relative;
    inset: auto;
    height: 340px;
    margin: -8px -14% 0 -8%;
  }
  .daytake-mosaic-grid {
    height: 620px;
    width: 100%;
  }
  .daytake-feature-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .daytake-feature {
    display: grid;
    grid-template-columns: 47px 1fr;
    gap: 5px 16px;
  }
  .daytake-feature-icon {
    width: 47px;
    height: 47px;
    grid-row: span 2;
    margin: 0;
  }
  .daytake-editorial {
    grid-template-columns: 1fr;
    gap: 34px;
    padding: 45px 0;
    margin-block: 10px;
  }
  .daytake-editorial::before {
    inset: 20% -8px 14px;
    background: linear-gradient(180deg, transparent, var(--about) 62%);
  }
  .daytake-editorial-figure {
    max-width: 440px;
    width: 100%;
    justify-self: center;
  }
  .daytake-portrait-field {
    width: min(420px, 100%);
    height: 530px;
    margin-top: 20px;
  }
  .daytake-portrait-line-wide {
    display: none;
  }
  .daytake-portrait-line-phone {
    display: block;
  }
  .daytake-creators {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: 240px 240px;
  }
  .daytake-creator-arrival {
    padding-top: 24px;
  }
  .daytake-creator-arrival:nth-child(2) {
    padding-top: 80px;
  }
  .daytake-creator-arrival:nth-child(3) {
    padding-top: 12px;
  }
  .daytake-creator-arrival:nth-child(4) {
    padding-top: 66px;
  }
  .daytake-creator-plate {
    width: clamp(130px, 35vw, 155px);
    margin-bottom: 17px;
  }
  .particle-1 {
    top: 4%;
    left: 52%;
  }
  .particle-2 {
    top: 44%;
    left: 10%;
  }
  .particle-3 {
    top: 51%;
    left: 87%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .daytake-mosaic-grid {
    transform: rotate(-8deg);
  }
  .daytake-mosaic-track {
    will-change: auto;
  }
  .daytake-gallery-copy,
  .daytake-motion-toggle {
    display: none;
  }
}
</style>
