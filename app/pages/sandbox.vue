<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Copy,
  FileText,
  FlipVertical2,
  RotateCcw,
  Sparkles
} from 'lucide-vue-next'
import type { HistoryMoveItem } from '~/components/MoveHistoryPanel.vue'
import type { ChessSide, OpeningModule } from '~/utils/chessData'
import { playCheckSound, playWoodenCapture, playWoodenMove } from '~/utils/sound'

const route = useRoute()
const { addCustomOpening } = useChessProgress()
const { isMuted } = useTheme()

interface SandboxSnapshot {
  fen: string
  lastMove: { from: string; to: string } | null
  san: string
  color: Color
  moveNumber: number
}

const initialFen = ref<string>(new Chess().fen())
const snapshots = ref<SandboxSnapshot[]>([
  {
    fen: initialFen.value,
    lastMove: null,
    san: '',
    color: 'w',
    moveNumber: 0
  }
])
const activePly = ref(0)
const orientation = ref<Color>('w')

// Importer input
const importText = ref('')
const importError = ref('')
const importSuccess = ref('')

// Save custom repertoire form
const customTitle = ref('')
const customSide = ref<ChessSide>('w')
const customNotes = ref('')
const savedOpeningId = ref<string | null>(null)
const saveError = ref('')

const copiedType = ref<'fen' | 'pgn' | null>(null)

const currentSnapshot = computed<SandboxSnapshot>(() => {
  return (
    snapshots.value[activePly.value] ?? {
      fen: new Chess().fen(),
      lastMove: null,
      san: '',
      color: 'w',
      moveNumber: 0
    }
  )
})

const historyItems = computed<HistoryMoveItem[]>(() => {
  return snapshots.value.slice(1).map((snap, idx) => ({
    ply: idx + 1,
    san: snap.san,
    color: snap.color,
    moveNumber: snap.moveNumber
  }))
})

const currentPgn = computed(() => {
  const parts: string[] = []
  for (let i = 1; i < snapshots.value.length; i++) {
    const snap = snapshots.value[i]!
    if (snap.color === 'w') {
      parts.push(`${snap.moveNumber}. ${snap.san}`)
    } else {
      if (i === 1) {
        parts.push(`${snap.moveNumber}... ${snap.san}`)
      } else {
        parts.push(snap.san)
      }
    }
  }
  return parts.join(' ')
})

const SAMPLE_PRESETS = [
  {
    label: 'Italian Game (PGN)',
    value: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O a6 7. Bb3'
  },
  {
    label: 'London System (PGN)',
    value: '1. d4 d5 2. Bf4 Nf6 3. e3 c5 4. c3 Nc6 5. Nd2 e6 6. Ngf3 Bd6 7. Bg3'
  },
  {
    label: 'Posisi Lucena (FEN)',
    value: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1'
  }
]

function loadFromInput(rawInput = importText.value) {
  importError.value = ''
  importSuccess.value = ''
  savedOpeningId.value = null

  const trimmed = rawInput.trim()
  if (!trimmed) {
    importError.value = 'Tempelkan string PGN atau FEN terlebih dahulu.'
    return
  }

  // Try FEN first (looks like 4-6 space-separated fields with slashes in first field)
  const looksLikeFen = trimmed.split(/\s+/).length >= 4 && trimmed.split(/\s+/)[0]?.includes('/')
  if (looksLikeFen) {
    try {
      const g = new Chess(trimmed)
      initialFen.value = g.fen()
      snapshots.value = [
        {
          fen: g.fen(),
          lastMove: null,
          san: '',
          color: g.turn(),
          moveNumber: 0
        }
      ]
      activePly.value = 0
      orientation.value = g.turn()
      importSuccess.value = 'Posisi FEN berhasil dimuat ke papan.'
      return
    } catch {
      importError.value = 'Format FEN tidak valid. Pastikan susunan baris dan giliran langkah benar.'
      return
    }
  }

  // Otherwise try PGN
  try {
    const parser = new Chess()
    parser.loadPgn(trimmed)
    const verboseHistory = parser.history({ verbose: true })

    // Reconstruct from starting FEN (supports SetUp/FEN headers if present)
    const headers = parser.header()
    const startFen = headers.FEN ? headers.FEN : new Chess().fen()
    const replay = new Chess(startFen)
    initialFen.value = replay.fen()

    const list: SandboxSnapshot[] = [
      {
        fen: replay.fen(),
        lastMove: null,
        san: '',
        color: replay.turn(),
        moveNumber: 0
      }
    ]

    for (let i = 0; i < verboseHistory.length; i++) {
      const hm = verboseHistory[i]!
      const played = replay.move(hm.san)
      list.push({
        fen: replay.fen(),
        lastMove: { from: played.from, to: played.to },
        san: played.san,
        color: played.color,
        moveNumber: Math.floor(i / 2) + 1
      })
    }

    snapshots.value = list
    activePly.value = list.length - 1
    importSuccess.value = `PGN berhasil dimuat (${verboseHistory.length} ply). Gunakan tombol navigasi untuk menelusuri langkah.`
  } catch {
    importError.value =
      'Gagal membaca PGN maupun FEN. Periksa kembali notasi langkah (contoh: 1. e4 e5 2. Nf3 Nc6).'
  }
}

function applyPreset(presetValue: string) {
  importText.value = presetValue
  loadFromInput(presetValue)
}

function handleBoardMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  const base = new Chess(currentSnapshot.value.fen)
  let played
  try {
    played = base.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q'
    })
  } catch {
    return
  }

  // If user branched from an earlier ply, truncate forward branch cleanly
  const prefix = snapshots.value.slice(0, activePly.value + 1)
  const nextPlyIndex = prefix.length
  const moveNumber = Math.ceil(nextPlyIndex / 2)

  snapshots.value = [
    ...prefix,
    {
      fen: base.fen(),
      lastMove: { from: played.from, to: played.to },
      san: played.san,
      color: played.color,
      moveNumber
    }
  ]
  activePly.value = snapshots.value.length - 1
  savedOpeningId.value = null

  if (played.san.includes('+') || played.san.includes('#')) {
    playCheckSound(isMuted.value)
  } else if (played.captured) {
    playWoodenCapture(isMuted.value)
  } else {
    playWoodenMove(isMuted.value)
  }
}

function resetBoard() {
  const fresh = new Chess()
  initialFen.value = fresh.fen()
  snapshots.value = [
    {
      fen: fresh.fen(),
      lastMove: null,
      san: '',
      color: 'w',
      moveNumber: 0
    }
  ]
  activePly.value = 0
  importError.value = ''
  importSuccess.value = ''
  savedOpeningId.value = null
}

async function copyText(kind: 'fen' | 'pgn') {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  const text = kind === 'fen' ? currentSnapshot.value.fen : currentPgn.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedType.value = kind
    setTimeout(() => {
      if (copiedType.value === kind) copiedType.value = null
    }, 1800)
  } catch {
    // Ignore clipboard rejection
  }
}

function saveToRepertoire() {
  saveError.value = ''
  savedOpeningId.value = null

  const title = customTitle.value.trim()
  if (!title) {
    saveError.value = 'Berikan nama untuk repertoar kustom Anda.'
    return
  }

  const playedMoves = snapshots.value.slice(1)
  if (playedMoves.length < 2) {
    saveError.value = 'Tambahkan minimal 2 langkah (ply) di papan atau melalui PGN sebelum menyimpan.'
    return
  }

  const slugId = `custom-${Date.now()}`
  const defaultFen = new Chess().fen()
  const newOpening: OpeningModule = {
    id: slugId,
    title,
    subtitle: 'Repertoar Pribadi (Impor Sandbox)',
    category: 'opening',
    side: customSide.value,
    eco: 'KUSTOM',
    difficulty: 'Menengah',
    summary:
      customNotes.value.trim() ||
      `Jalur repertoar pribadi (${playedMoves.length} ply) yang dibuat melalui Sandbox Grandmaster Atelier.`,
    keyThemes: ['Repertoar Pribadi', `${playedMoves.length} Langkah`, customSide.value === 'w' ? 'Putih' : 'Hitam'],
    startingFen: initialFen.value !== defaultFen ? initialFen.value : undefined,
    isCustom: true,
    lines: [
      {
        id: `${slugId}-main`,
        name: 'Jalur Utama Kustom',
        description:
          customNotes.value.trim() || 'Latih seluruh rangkaian langkah yang Anda simpan secara berurutan.',
        moves: playedMoves.map((m) => ({
          san: m.san,
          explanation: `Langkah repertoar tersimpan (${m.san}). Pertahankan koordinasi perwira sesuai rencana jalur kustom Anda.`,
          mistakeHint: 'Langkah ini menyimpang dari urutan PGN yang Anda simpan. Coba ulangi atau gunakan petunjuk.'
        }))
      }
    ]
  }

  addCustomOpening(newOpening)
  savedOpeningId.value = slugId
  customTitle.value = ''
  customNotes.value = ''
}

function applyFenFromQuery(fenParam: unknown) {
  if (typeof fenParam !== 'string' || !fenParam.trim()) return
  const decoded = fenParam.trim()
  importText.value = decoded
  loadFromInput(decoded)
}

onMounted(() => {
  applyFenFromQuery(route.query.fen)
})

watch(
  () => route.query.fen,
  (nextFen) => {
    applyFenFromQuery(nextFen)
  }
)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="font-serif text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Sandbox &amp; Impor PGN / FEN
      </h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
        Tempelkan PGN atau FEN untuk menganalisis posisi, telusuri langkah maju–mundur, atau simpan
        jalur pembukaan pribadi langsung ke repertoar latihan Anda.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <!-- Left Column: Interactive Board & Quick Tools -->
      <div class="lg:col-span-7 space-y-4">
        <ChessBoard
          :fen="currentSnapshot.fen"
          :orientation="orientation"
          :interactive="true"
          allowed-color="both"
          :last-move="currentSnapshot.lastMove"
          @move="handleBoardMove"
        />

        <!-- Board Action Bar -->
        <div class="max-w-[560px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="orientation = orientation === 'w' ? 'b' : 'w'"
          >
            <FlipVertical2 class="w-4 h-4" />
            <span>Putar Papan</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="resetBoard"
          >
            <RotateCcw class="w-4 h-4" />
            <span>Reset Papan</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] transition cursor-pointer"
            @click="copyText('fen')"
          >
            <Check v-if="copiedType === 'fen'" class="w-4 h-4 text-emerald-600" />
            <Copy v-else class="w-4 h-4" />
            <span>{{ copiedType === 'fen' ? 'FEN Disalin' : 'Salin FEN' }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-200 hover:border-[#738578] disabled:opacity-40 transition cursor-pointer"
            :disabled="!currentPgn"
            @click="copyText('pgn')"
          >
            <Check v-if="copiedType === 'pgn'" class="w-4 h-4 text-emerald-600" />
            <Copy v-else class="w-4 h-4" />
            <span>{{ copiedType === 'pgn' ? 'PGN Disalin' : 'Salin PGN' }}</span>
          </button>
        </div>

        <!-- Current FEN Readout -->
        <div
          class="max-w-[560px] mx-auto rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] px-4 py-3"
        >
          <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            FEN Posisi Saat Ini
          </span>
          <p class="font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all select-all">
            {{ currentSnapshot.fen }}
          </p>
        </div>
      </div>

      <!-- Right Column: Importer, History, & Save to Repertoire -->
      <div class="lg:col-span-5 space-y-5">
        <!-- PGN / FEN Importer Card -->
        <div
          class="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-3.5"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText class="w-4 h-4 text-[#5D7463]" />
              <span>Muat PGN atau FEN</span>
            </h2>
          </div>

          <textarea
            v-model="importText"
            rows="4"
            placeholder="Tempelkan PGN (mis. 1. e4 e5 2. Nf3 Nc6 3. Bb5) atau FEN di sini..."
            class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#F8F7F4] dark:bg-zinc-900 px-3.5 py-2.5 font-mono text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#5D7463]/50"
          />

          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] text-zinc-400 mr-1">Contoh cepat:</span>
            <button
              v-for="preset in SAMPLE_PRESETS"
              :key="preset.label"
              type="button"
              class="text-[11px] px-2.5 py-1 rounded-lg bg-[#F8F7F4] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 hover:border-[#738578] transition cursor-pointer"
              @click="applyPreset(preset.value)"
            >
              {{ preset.label }}
            </button>
          </div>

          <p v-if="importError" class="text-xs text-[#B85D43] font-medium">
            {{ importError }}
          </p>
          <p v-if="importSuccess" class="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {{ importSuccess }}
          </p>

          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#18181B] text-white dark:bg-[#EDEAE0] dark:text-[#18181B] hover:opacity-90 transition cursor-pointer"
            @click="loadFromInput()"
          >
            <Sparkles class="w-4 h-4" />
            <span>Muat ke Papan</span>
          </button>
        </div>

        <!-- Move History Navigation -->
        <MoveHistoryPanel
          :moves="historyItems"
          :active-ply="activePly"
          empty-message="Mainkan bidak langsung di papan atau muat PGN di atas untuk mulai menyusun jalur."
          @select-ply="activePly = $event"
        />

        <!-- Save to Local Repertoire Card -->
        <div
          class="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 space-y-3.5"
        >
          <h2 class="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookmarkPlus class="w-4 h-4 text-[#5D7463]" />
            <span>Simpan ke Repertoar Lokal</span>
          </h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            Ubah rangkaian langkah saat ini menjadi modul latihan interaktif yang tersimpan di browser Anda.
          </p>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Nama Repertoar
              </label>
              <input
                v-model="customTitle"
                type="text"
                placeholder="mis. Italian Game: Giuoco Piano"
                class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#F8F7F4] dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#5D7463]/50"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Sisi yang Dilatih
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="py-2 rounded-xl text-xs font-semibold border transition cursor-pointer"
                  :class="
                    customSide === 'w'
                      ? 'bg-[#18181B] text-white border-[#18181B] dark:bg-[#EDEAE0] dark:text-[#18181B]'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                  "
                  @click="customSide = 'w'"
                >
                  Putih (White)
                </button>
                <button
                  type="button"
                  class="py-2 rounded-xl text-xs font-semibold border transition cursor-pointer"
                  :class="
                    customSide === 'b'
                      ? 'bg-[#18181B] text-white border-[#18181B] dark:bg-[#EDEAE0] dark:text-[#18181B]'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                  "
                  @click="customSide = 'b'"
                >
                  Hitam (Black)
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Catatan Singkat (Opsional)
              </label>
              <input
                v-model="customNotes"
                type="text"
                placeholder="mis. Tekanan pada petak f7 & kontrol pusat d4"
                class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#F8F7F4] dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#5D7463]/50"
              />
            </div>
          </div>

          <p v-if="saveError" class="text-xs text-[#B85D43] font-medium">
            {{ saveError }}
          </p>

          <div
            v-if="savedOpeningId"
            class="rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 p-3 flex items-center justify-between gap-2 text-xs"
          >
            <span class="text-emerald-800 dark:text-emerald-300 font-medium">
              Tersimpan di repertoar lokal!
            </span>
            <NuxtLink
              :to="`/trainer/opening/${savedOpeningId}`"
              class="inline-flex items-center gap-1 font-semibold text-emerald-900 dark:text-emerald-200 underline"
            >
              <span>Latih Sekarang</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#5D7463] text-white hover:bg-[#4B6051] transition cursor-pointer"
            @click="saveToRepertoire"
          >
            <BookmarkPlus class="w-4 h-4" />
            <span>Simpan ke Repertoar Saya</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
