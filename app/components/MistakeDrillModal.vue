<script setup lang="ts">
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { CheckCircle2, Lightbulb, RotateCcw, Sparkles, X } from 'lucide-vue-next'
import type { MistakeQueueItem } from '~/composables/useChessProgress'
import {
  playCheckSound,
  playErrorSound,
  playSuccessChime,
  playWoodenCapture,
  playWoodenMove
} from '~/utils/sound'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { mistakeQueue, resolveMistake } = useChessProgress()
const { isMuted } = useTheme()

const activeItem = ref<MistakeQueueItem | null>(null)
const displayFen = ref<string>(new Chess().fen())
const lastMove = ref<{ from: string; to: string } | null>(null)
const correctSquare = ref<string | null>(null)
const errorSquare = ref<string | null>(null)
const hintFrom = ref<string | null>(null)
const hintTo = ref<string | null>(null)
const shake = ref(false)
const statusMessage = ref('')
const justSolved = ref(false)

let advanceTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function loadNextFromQueue() {
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
  const next = mistakeQueue.value[0] ?? null
  activeItem.value = next
  justSolved.value = false
  lastMove.value = null
  correctSquare.value = null
  errorSquare.value = null
  hintFrom.value = null
  hintTo.value = null
  shake.value = false

  if (next) {
    displayFen.value = next.fen
    statusMessage.value = `Temukan langkah paling tepat untuk ${next.side === 'w' ? 'Putih' : 'Hitam'} pada posisi ini.`
  } else {
    statusMessage.value = 'Seluruh antrean kesalahan telah dibereskan!'
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      loadNextFromQueue()
    } else if (advanceTimer) {
      clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }
)

function showHint() {
  if (!activeItem.value || justSolved.value) return
  try {
    const g = new Chess(activeItem.value.fen)
    const m = g.move(activeItem.value.expectedSan)
    hintFrom.value = m.from
    hintTo.value = m.to
    statusMessage.value = `Petunjuk: perhatikan perwira di ${m.from} menuju ${m.to}.`
  } catch {
    // Ignore
  }
}

function handleMove(payload: { from: Square; to: Square; promotion?: PieceSymbol }) {
  if (!activeItem.value || justSolved.value) return
  const item = activeItem.value
  const g = new Chess(item.fen)
  let played
  try {
    played = g.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? 'q'
    })
  } catch {
    return
  }

  if (played.san === item.expectedSan) {
    displayFen.value = g.fen()
    lastMove.value = { from: played.from, to: played.to }
    correctSquare.value = played.to
    errorSquare.value = null
    hintFrom.value = null
    hintTo.value = null
    justSolved.value = true
    statusMessage.value = `Tepat sekali! ${played.san} adalah langkah kunci. Kesalahan ini dihapus dari antrean.`

    if (played.san.includes('+') || played.san.includes('#')) playCheckSound(isMuted.value)
    else if (played.captured) playWoodenCapture(isMuted.value)
    else playWoodenMove(isMuted.value)
    setTimeout(() => playSuccessChime(isMuted.value), 160)

    resolveMistake(item.id)
    advanceTimer = setTimeout(() => {
      loadNextFromQueue()
    }, 1050)
  } else {
    playErrorSound(isMuted.value)
    errorSquare.value = payload.to
    statusMessage.value = `${played.san} belum tepat. Coba lagi atau klik Petunjuk.`
    shake.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shake.value = false
    }, 360)
  }
}

function sourceLabel(src: MistakeQueueItem['source']): string {
  if (src === 'opening') return 'Pembukaan'
  if (src === 'endgame') return 'Babak Akhir'
  return 'Teka-Teki'
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  if (advanceTimer) clearTimeout(advanceTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="mistake-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-[#1E1B38]/65 dark:bg-black/75 backdrop-blur-[3px] flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Latihan Kilat Buku Catatan Kesalahan"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-xl rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-2xl overflow-hidden my-auto"
        >
          <!-- Header -->
          <div class="bg-[#1B1E1C] dark:bg-[#121214] px-6 py-4 text-[#F7F5F0] border-b border-white/10 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#B85D43]/25 text-[#F0B39E] border border-[#B85D43]/40 font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">
                  <RotateCcw class="w-3 h-3" />
                  <span>Buku Catatan Kesalahan</span>
                </span>
                <span class="font-mono text-xs text-zinc-300">
                  Tersisa {{ mistakeQueue.length }}
                </span>
              </div>
              <h2 class="font-serif text-xl font-semibold mt-1">
                {{ activeItem ? activeItem.title : 'Antrean Bersih!' }}
              </h2>
            </div>

            <button
              type="button"
              class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Tutup latihan kesalahan"
              @click="emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Body -->
          <div v-if="activeItem" class="p-6 space-y-4">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider bg-[#F7F5F0] dark:bg-zinc-800 text-[#495C4D] dark:text-[#A4CBB3] border border-[#E4DFD5] dark:border-zinc-700 font-semibold">
                {{ sourceLabel(activeItem.source) }} · Giliran {{ activeItem.side === 'w' ? 'Putih' : 'Hitam' }}
              </span>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#B85D43]/40 text-[#9E4931] dark:text-[#F0B39E] hover:bg-[#B85D43] hover:text-white transition cursor-pointer"
                @click="showHint"
              >
                <Lightbulb class="w-3.5 h-3.5" />
                <span>Petunjuk</span>
              </button>
            </div>

            <div class="max-w-[400px] mx-auto">
              <ChessBoard
                :fen="displayFen"
                :orientation="activeItem.side"
                :interactive="!justSolved"
                :allowed-color="activeItem.side"
                :last-move="lastMove"
                :correct-square="correctSquare"
                :error-square="errorSquare"
                :hint-from="hintFrom"
                :hint-to="hintTo"
                :shake="shake"
                @move="handleMove"
              />
            </div>

            <div
              class="rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed border flex items-center gap-2.5"
              :class="
                justSolved
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-[#F7F5F0] dark:bg-zinc-900 border-[#E4DFD5] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              "
            >
              <CheckCircle2 v-if="justSolved" class="w-4 h-4 shrink-0 text-[#526857] dark:text-emerald-400" />
              <span>{{ statusMessage }}</span>
            </div>
          </div>

          <!-- All Clear Celebration -->
          <div v-else class="p-10 text-center space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-[#718675]/15 text-[#526857] dark:text-[#A4CBB3] mx-auto flex items-center justify-center">
              <Sparkles class="w-7 h-7" />
            </div>
            <div class="space-y-1">
              <h3 class="font-serif text-2xl font-semibold text-[#202321] dark:text-zinc-100">
                Semua Kesalahan Tuntas!
              </h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">
                Memori taktis Anda kini bersih. Terus berlatih untuk menjaga rangkaian harian.
              </p>
            </div>
            <button
              type="button"
              class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] cursor-pointer"
              @click="emit('close')"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mistake-fade-enter-active,
.mistake-fade-leave-active {
  transition: opacity 0.18s ease;
}
.mistake-fade-enter-from,
.mistake-fade-leave-to {
  opacity: 0;
}
</style>
