<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Film,
  Pause,
  Play,
  RotateCcw,
  Search,
  SearchX,
  Trophy,
  X
} from 'lucide-vue-next'
import {
  buildDemoReplaySnapshots,
  getTacticVideoHoverMove,
  PRO_TACTICS_VIDEOS,
  TACTIC_VIDEO_CATEGORIES,
  type DemoReplaySnapshot,
  type ProTacticsVideo,
  type TacticVideoCategory
} from '~/utils/proTacticsVideos'
import { playCheckSound, playWoodenCapture, playWoodenMove } from '~/utils/sound'

const { isMuted } = useTheme()

const selectedCategory = ref<'all' | TacticVideoCategory>('all')
const searchQuery = ref('')
const debouncedQuery = ref('')
const activeVideoIds = ref<Record<string, boolean>>({})
const hoveredCardId = ref<string | null>(null)

// Interactive "Demo Partai" Replay Modal State (mirrors landing page Demo Partai)
const demoVideo = ref<ProTacticsVideo | null>(null)
const demoStep = ref(0)
const demoPlaying = ref(false)
const demoSpeedMs = ref<number>(780)
let demoInterval: ReturnType<typeof setInterval> | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const demoSnapshots = computed<DemoReplaySnapshot[]>(() => {
  if (!demoVideo.value) return []
  return buildDemoReplaySnapshots(demoVideo.value)
})

const currentDemoSnap = computed<DemoReplaySnapshot | null>(() => {
  return demoSnapshots.value[demoStep.value] ?? demoSnapshots.value[0] ?? null
})

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = val.trim().toLowerCase()
  if (!trimmed) {
    debouncedQuery.value = ''
    return
  }
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = trimmed
  }, 180)
})

const videoPreviews = computed(() => {
  const map: Record<string, ReturnType<typeof getTacticVideoHoverMove>> = {}
  for (const v of PRO_TACTICS_VIDEOS) {
    map[v.id] = getTacticVideoHoverMove(v)
  }
  return map
})

const filteredVideos = computed<ProTacticsVideo[]>(() => {
  const q = debouncedQuery.value
  return PRO_TACTICS_VIDEOS.filter((v) => {
    if (selectedCategory.value !== 'all' && v.category !== selectedCategory.value) {
      return false
    }
    if (q) {
      const hay = `${v.title} ${v.player} ${v.opponent} ${v.category} ${v.keyMoveSan} ${v.summaryId} ${v.year}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

function activateVideo(id: string) {
  activeVideoIds.value = {
    ...activeVideoIds.value,
    [id]: true
  }
}

function sandboxRouteForFen(fen: string): string {
  return `/sandbox?fen=${encodeURIComponent(fen)}`
}

function playStepAudio(snap: DemoReplaySnapshot | undefined) {
  if (!snap || snap.ply === 0) return
  if (snap.san.includes('+') || snap.san.includes('#')) {
    playCheckSound(isMuted.value)
  } else if (snap.san.includes('x')) {
    playWoodenCapture(isMuted.value)
  } else {
    playWoodenMove(isMuted.value)
  }
}

function stopDemoPlayback() {
  demoPlaying.value = false
  if (demoInterval) {
    clearInterval(demoInterval)
    demoInterval = null
  }
}

function startDemoPlayback() {
  stopDemoPlayback()
  if (demoSnapshots.value.length <= 1) return
  if (demoStep.value >= demoSnapshots.value.length - 1) {
    demoStep.value = 0
  }
  demoPlaying.value = true
  demoInterval = setInterval(() => {
    if (demoStep.value >= demoSnapshots.value.length - 1) {
      stopDemoPlayback()
      return
    }
    demoStep.value += 1
    playStepAudio(demoSnapshots.value[demoStep.value])
  }, demoSpeedMs.value)
}

function setDemoSpeed(ms: number) {
  demoSpeedMs.value = ms
  if (demoPlaying.value) {
    startDemoPlayback()
  }
}

function jumpDemoStep(ply: number) {
  stopDemoPlayback()
  const clamped = Math.max(0, Math.min(demoSnapshots.value.length - 1, ply))
  demoStep.value = clamped
  playStepAudio(demoSnapshots.value[clamped])
}

function openDemoReplay(video: ProTacticsVideo) {
  stopDemoPlayback()
  demoVideo.value = video
  demoStep.value = 0
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced) {
    startDemoPlayback()
  }
}

function closeDemoReplay() {
  stopDemoPlayback()
  demoVideo.value = null
}

function resetFilters() {
  selectedCategory.value = 'all'
  searchQuery.value = ''
  debouncedQuery.value = ''
}

function handleEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && demoVideo.value) {
    closeDemoReplay()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeKey)
  stopDemoPlayback()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="space-y-8">
    <!-- Editorial Hero Header -->
    <section
      class="surface-tactile-hero rounded-3xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-6 sm:p-8 lg:p-10 relative overflow-hidden"
    >
      <div class="max-w-3xl space-y-4">
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-px bg-[#718675]" aria-hidden="true" />
          <span class="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#495C4D] dark:text-[#A4CBB3]">
            Sinema Taktik Grandmaster
          </span>
        </div>

        <h1
          class="font-serif text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.025em] text-[#202321] dark:text-zinc-50 leading-[1.1]"
        >
          Tonton Video Analisis atau Putar Demo Partai Langsung di Papan.
        </h1>

        <p class="text-sm sm:text-base text-zinc-600 dark:text-zinc-300/90 leading-relaxed max-w-2xl">
          Kurasi kombinasi legendaris Magnus Carlsen, Garry Kasparov, Mikhail Tal, Bobby Fischer,
          Hikaru Nakamura, dan Judit Polgar. Pilih antara pemutaran video YouTube, animasi Demo Partai
          langkah demi langkah di papan, atau bedah posisinya di Sandbox.
        </p>
      </div>
    </section>

    <!-- Sticky Filter & Search Bar -->
    <div
      class="sticky top-[68px] z-20 rounded-2xl border border-[#E4DFD5] dark:border-zinc-800/90 bg-[#F7F5F0]/86 dark:bg-[#121214]/86 backdrop-blur-md px-4 sm:px-5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_28px_-18px_rgba(32,35,33,0.16)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_-16px_rgba(0,0,0,0.65)]"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Category Pills -->
        <div
          class="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter kategori video taktik"
        >
          <button
            type="button"
            :aria-pressed="selectedCategory === 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
            :class="
              selectedCategory === 'all'
                ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321]'
                : 'bg-white dark:bg-[#19191D] text-zinc-600 dark:text-zinc-300 border border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
            "
            @click="selectedCategory = 'all'"
          >
            Semua ({{ PRO_TACTICS_VIDEOS.length }})
          </button>

          <button
            v-for="cat in TACTIC_VIDEO_CATEGORIES"
            :key="cat"
            type="button"
            :aria-pressed="selectedCategory === cat"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
            :class="
              selectedCategory === cat
                ? 'bg-[#526857] text-white'
                : 'bg-white dark:bg-[#19191D] text-zinc-600 dark:text-zinc-300 border border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
            "
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Search Box + Count -->
        <div class="flex items-center gap-2.5 w-full sm:w-auto">
          <div class="relative flex-1 sm:w-64">
            <Search
              class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari pemain, langkah (Qh6+), tema..."
              aria-label="Cari video taktik catur profesional"
              class="w-full pl-8 pr-8 py-1.5 rounded-xl text-xs border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] text-[#202321] dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:border-[#718675] focus:ring-2 focus:ring-[#718675]/30 transition"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="p-1 rounded-md text-zinc-500 hover:text-[#202321] dark:hover:text-white absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
              aria-label="Bersihkan pencarian"
              @click="
                () => {
                  searchQuery = ''
                  debouncedQuery = ''
                }
              "
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <span
            class="inline-flex items-center px-2.5 py-1.5 rounded-md font-mono text-[11px] font-medium bg-white dark:bg-zinc-900 border border-[#E4DFD5] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0"
          >
            {{ filteredVideos.length }} Partai
          </span>
        </div>
      </div>
    </div>

    <!-- Video Cards Grid -->
    <div
      v-if="filteredVideos.length > 0"
      class="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      <article
        v-for="video in filteredVideos"
        :key="video.id"
        class="surface-tactile-card rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] overflow-hidden flex flex-col justify-between transition-all duration-250 hover:border-[#718675]"
        @mouseenter="hoveredCardId = video.id"
        @mouseleave="hoveredCardId = null"
      >
        <div>
          <!-- Lazy-Load YouTube Player / Thumbnail -->
          <div class="relative aspect-video w-full bg-[#161817] overflow-hidden">
            <iframe
              v-if="activeVideoIds[video.id]"
              :src="`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`"
              :title="video.title"
              class="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />

            <button
              v-else
              type="button"
              class="group relative w-full h-full block text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#718675]"
              :aria-label="`Putar video YouTube: ${video.title}`"
              @click="activateVideo(video.id)"
            >
              <img
                :src="`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`"
                :alt="`Cuplikan video ${video.title} oleh ${video.player}`"
                width="480"
                height="360"
                loading="lazy"
                class="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 motion-reduce:transition-none motion-reduce:transform-none"
              />

              <!-- Editorial dark gradient scrim -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30"
                aria-hidden="true"
              />

              <!-- Top metadata badges -->
              <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 text-[#F7F5F0] font-mono text-[10px] uppercase tracking-[0.12em] font-semibold border border-white/15"
                >
                  <Film class="w-3 h-3 text-[#A4CBB3]" />
                  <span>{{ video.category }}</span>
                </span>

                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 text-zinc-200 font-mono text-[11px] font-medium border border-white/10"
                >
                  <Clock class="w-3 h-3" />
                  <span>{{ video.duration }}</span>
                </span>
              </div>

              <!-- Center Play Button -->
              <div class="absolute inset-0 flex items-center justify-center">
                <span
                  class="w-14 h-14 rounded-full bg-[#202321]/90 text-[#F7F5F0] border border-white/25 flex items-center justify-center shadow-xl group-hover:bg-[#526857] group-hover:scale-110 transition-all duration-200 motion-reduce:transform-none"
                >
                  <Play class="w-6 h-6 fill-current translate-x-0.5" />
                </span>
              </div>

              <!-- Bottom player caption -->
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-white drop-shadow-xs">
                  <Trophy class="w-3.5 h-3.5 text-[#E6C25A]" />
                  <span>{{ video.player }} vs {{ video.opponent }} ({{ video.year }})</span>
                </span>
                <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-200 bg-black/60 px-2 py-0.5 rounded">
                  YouTube
                </span>
              </div>
            </button>
          </div>

          <!-- Editorial Body + Crucial Position MiniBoardPreview -->
          <div class="p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-[#495C4D] dark:text-[#9DB5A1]"
                  >
                    {{ video.player }}
                  </span>
                  <span class="text-zinc-300 dark:text-zinc-700" aria-hidden="true">·</span>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-[#F7F5F0] dark:bg-zinc-800 text-[#202321] dark:text-zinc-100 border border-[#E4DFD5] dark:border-zinc-700"
                  >
                    Langkah Kunci: {{ video.keyMoveSan }}
                  </span>
                </div>

                <h2 class="font-serif text-lg sm:text-[19px] font-semibold tracking-[-0.015em] text-[#202321] dark:text-zinc-100 leading-snug">
                  {{ video.title }}
                </h2>

                <p class="text-[13px] text-zinc-600 dark:text-zinc-400 leading-[1.6]">
                  {{ video.summaryId }}
                </p>
              </div>

              <button
                type="button"
                class="shrink-0 flex flex-col items-center gap-1.5 group/mini cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] rounded-xl"
                :aria-label="`Putar Demo Partai interaktif untuk ${video.title}`"
                @click="openDemoReplay(video)"
              >
                <MiniBoardPreview
                  :fen="video.fen"
                  :hover-move="videoPreviews[video.id]?.hoverMove ?? null"
                  :orientation="video.orientation"
                  :highlight-squares="videoPreviews[video.id]?.highlights ?? []"
                  :hovered="hoveredCardId === video.id"
                  size="card"
                />
                <span class="font-mono text-[9px] uppercase tracking-[0.12em] text-[#495C4D] dark:text-[#9DB5A1] group-hover/mini:underline">
                  Putar di Papan
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Card Action Footer: YouTube Link + Tonton Demo Partai + Buka di Sandbox -->
        <div
          class="px-5 py-3.5 border-t border-[#E8E4DC]/90 dark:border-zinc-800/80 bg-[#F7F5F0]/55 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-2"
        >
          <a
            :href="`https://www.youtube.com/watch?v=${video.youtubeId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100 transition"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span>YouTube</span>
          </a>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#718675]/45 bg-[#718675]/12 dark:bg-[#718675]/20 text-[#3B4E3F] dark:text-[#B8CEBC] hover:bg-[#526857] hover:text-white hover:border-[#526857] active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
              @click="openDemoReplay(video)"
            >
              <Play class="w-3.5 h-3.5 fill-current" />
              <span>Tonton Demo Partai</span>
            </button>

            <NuxtLink
              :to="sandboxRouteForFen(video.fen)"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:bg-[#343A36] dark:hover:bg-white active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
            >
              <Compass class="w-3.5 h-3.5" />
              <span>Buka Posisi di Sandbox</span>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="rounded-2xl border border-dashed border-[#DCD6CA] dark:border-zinc-700 bg-white/80 dark:bg-[#19191D]/80 p-12 text-center flex flex-col items-center justify-center space-y-3"
    >
      <div
        class="w-12 h-12 rounded-2xl bg-[#F7F5F0] dark:bg-zinc-800 border border-[#E4DFD5] dark:border-zinc-700 flex items-center justify-center text-[#526857] dark:text-[#9DB5A1]"
      >
        <SearchX class="w-5 h-5" />
      </div>
      <h2 class="font-serif text-lg font-semibold text-[#202321] dark:text-zinc-100">
        Video Taktik Tidak Ditemukan
      </h2>
      <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
        Coba ubah kategori atau gunakan kata kunci pemain lain seperti Carlsen, Kasparov, Tal, Fischer,
        Nakamura, atau Polgar.
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] active:scale-[0.98] transition cursor-pointer"
        @click="resetFilters"
      >
        Tampilkan Semua Video
      </button>
    </div>

    <!-- Interactive "Demo Partai" Replay Modal (Landing-Page Style Live Chessboard Cinema) -->
    <Teleport to="body">
      <div
        v-if="demoVideo && currentDemoSnap"
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        :aria-label="`Demo Partai: ${demoVideo.title}`"
        @click.self="closeDemoReplay"
      >
        <div
          class="w-full max-w-3xl rounded-3xl border border-[#2E3330] bg-[#191B1A] text-[#F7F5F0] shadow-2xl overflow-hidden my-auto"
        >
          <!-- Modal Header -->
          <div class="px-5 sm:px-6 py-4 border-b border-white/10 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span
                  class="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded bg-[#526857]/35 text-[#B8CEBC] border border-[#718675]/40 font-semibold"
                >
                  Demo Partai Interaktif
                </span>
                <span class="font-mono text-[11px] text-zinc-400">
                  {{ demoVideo.player }} vs {{ demoVideo.opponent }} ({{ demoVideo.year }})
                </span>
              </div>
              <h2 class="font-serif text-lg sm:text-xl font-semibold text-[#F7F5F0] leading-snug">
                {{ demoVideo.title }}
              </h2>
            </div>

            <button
              type="button"
              class="p-2 rounded-xl bg-white/8 hover:bg-white/15 text-zinc-200 active:scale-95 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9DB5A1]"
              aria-label="Tutup Demo Partai"
              @click="closeDemoReplay"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Body: Live Animated ChessBoard + Timeline & Controls -->
          <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <!-- Left: Live Board with GSAP Capture/Check/Checkmate Effects -->
            <div class="md:col-span-7">
              <ChessBoard
                :fen="currentDemoSnap.fen"
                :orientation="demoVideo.orientation"
                :interactive="false"
                :last-move="currentDemoSnap.lastMove"
                :correct-square="currentDemoSnap.isKeyMove && currentDemoSnap.lastMove ? currentDemoSnap.lastMove.to : null"
                surface-tone="dark"
              />
            </div>

            <!-- Right: Playback Controls, Speed, Move Strip & Sandbox Action -->
            <div class="md:col-span-5 flex flex-col justify-between space-y-5">
              <!-- Active Step Readout -->
              <div class="rounded-2xl bg-white/[0.05] border border-white/10 p-4 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Langkah {{ demoStep }} / {{ demoSnapshots.length - 1 }}
                  </span>
                  <span
                    v-if="currentDemoSnap.isKeyMove"
                    class="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#C26D53]/30 text-[#F4BFA9] border border-[#C26D53]/45 font-bold"
                  >
                    Langkah Brilian!
                  </span>
                </div>

                <div class="font-serif text-2xl font-semibold text-white">
                  {{ currentDemoSnap.san }}
                </div>

                <p class="text-xs text-[#C8CFCB] leading-relaxed">
                  {{ demoVideo.summaryId }}
                </p>
              </div>

              <!-- Playback Transport Controls -->
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#EDEAE0] text-[#202321] hover:bg-white active:scale-[0.98] transition cursor-pointer"
                    @click="demoPlaying ? stopDemoPlayback() : startDemoPlayback()"
                  >
                    <Pause v-if="demoPlaying" class="w-4 h-4 fill-current" />
                    <Play v-else class="w-4 h-4 fill-current" />
                    <span>{{ demoPlaying ? 'Jeda' : demoStep >= demoSnapshots.length - 1 ? 'Putar Ulang' : 'Putar' }}</span>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl bg-white/8 hover:bg-white/16 border border-white/10 text-zinc-200 disabled:opacity-35 active:scale-95 transition cursor-pointer"
                    :disabled="demoStep <= 0"
                    aria-label="Langkah sebelumnya"
                    @click="jumpDemoStep(demoStep - 1)"
                  >
                    <ChevronLeft class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl bg-white/8 hover:bg-white/16 border border-white/10 text-zinc-200 disabled:opacity-35 active:scale-95 transition cursor-pointer"
                    :disabled="demoStep >= demoSnapshots.length - 1"
                    aria-label="Langkah berikutnya"
                    @click="jumpDemoStep(demoStep + 1)"
                  >
                    <ChevronRight class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl bg-white/8 hover:bg-white/16 border border-white/10 text-zinc-200 active:scale-95 transition cursor-pointer"
                    aria-label="Ulangi dari awal"
                    @click="jumpDemoStep(0)"
                  >
                    <RotateCcw class="w-4 h-4" />
                  </button>
                </div>

                <!-- Playback Speed Switcher -->
                <div class="flex items-center justify-between gap-2 text-[11px]">
                  <span class="font-mono uppercase tracking-wider text-zinc-400">Kecepatan</span>
                  <div class="inline-flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.06] border border-white/10">
                    <button
                      v-for="spd in [
                        { label: '0.7x', ms: 1150 },
                        { label: '1x', ms: 780 },
                        { label: '1.5x', ms: 480 }
                      ]"
                      :key="spd.label"
                      type="button"
                      class="px-2 py-1 rounded-md font-mono text-[10px] font-semibold transition cursor-pointer"
                      :class="
                        demoSpeedMs === spd.ms
                          ? 'bg-[#526857] text-white'
                          : 'text-zinc-300 hover:text-white'
                      "
                      @click="setDemoSpeed(spd.ms)"
                    >
                      {{ spd.label }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Clickable Move Sequence Chips -->
              <div class="space-y-1.5">
                <span class="block font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                  Urutan Langkah
                </span>
                <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  <button
                    v-for="snap in demoSnapshots.slice(1)"
                    :key="snap.ply"
                    type="button"
                    class="px-2 py-1 rounded-md font-mono text-[11px] font-semibold border transition cursor-pointer"
                    :class="
                      demoStep === snap.ply
                        ? 'bg-[#526857] text-white border-[#8FA894]'
                        : snap.isKeyMove
                          ? 'bg-[#C26D53]/25 text-[#F4BFA9] border-[#C26D53]/45 hover:bg-[#C26D53]/40'
                          : 'bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/12'
                    "
                    @click="jumpDemoStep(snap.ply)"
                  >
                    {{ snap.ply }}. {{ snap.san }}{{ snap.isKeyMove ? '!' : '' }}
                  </button>
                </div>
              </div>

              <!-- Direct Sandbox Action -->
              <NuxtLink
                :to="sandboxRouteForFen(currentDemoSnap.fen)"
                class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#526857] text-white hover:bg-[#617B67] active:scale-[0.98] transition"
                @click="closeDemoReplay"
              >
                <Compass class="w-4 h-4" />
                <span>Buka Posisi Ini di Sandbox</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
