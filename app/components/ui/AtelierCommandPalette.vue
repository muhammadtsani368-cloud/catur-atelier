<script setup lang="ts">
import {
  BookOpen,
  Compass,
  Crown,
  Film,
  Home,
  Moon,
  Palette,
  PawPrint,
  Puzzle,
  Search,
  Sparkles,
  Sun,
  Swords,
  Volume2,
  VolumeX,
  X
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { BOARD_PALETTES, type BoardThemeKey } from '~/composables/useTheme'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const { allModules } = useChessProgress()
const {
  isDark,
  pieceSet,
  isMuted,
  cinematicEffects,
  toggleDark,
  setPieceSet,
  setBoardTheme,
  toggleMute,
  toggleCinematicEffects
} = useTheme()

interface CommandAction {
  id: string
  group: 'Navigasi Halaman' | 'Pustaka Repertoar' | 'Aksi Studio'
  title: string
  subtitle: string
  badge?: string
  icon: Component
  keywords: string
  run: () => void
}

const query = ref('')
const activeIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

function navigate(path: string) {
  emit('close')
  router.push(path)
}

const allCommands = computed<CommandAction[]>(() => {
  const navCommands: CommandAction[] = [
    {
      id: 'nav-dashboard',
      group: 'Navigasi Halaman',
      title: 'Pustaka Repertoar',
      subtitle: 'Beranda latihan pembukaan, babak akhir & antrean kesalahan',
      badge: '/dashboard',
      icon: BookOpen,
      keywords: 'repertoar beranda dashboard home latihan',
      run: () => navigate('/dashboard')
    },
    {
      id: 'nav-puzzles',
      group: 'Navigasi Halaman',
      title: 'Teka-Teki Taktik',
      subtitle: 'Latihan taktik skakmat, garpu, pin, dan pengorbanan',
      badge: '/puzzles',
      icon: Puzzle,
      keywords: 'teka-teki puzzle taktik skakmat garpu',
      run: () => navigate('/puzzles')
    },
    {
      id: 'nav-play',
      group: 'Navigasi Halaman',
      title: 'Arena Main Bot & 2 Pemain',
      subtitle: 'Tantang 15 bot 5 tingkatan atau Mesin Kustom 250–3200 ELO',
      badge: '/play',
      icon: Swords,
      keywords: 'main bot komputer elo 2p pvp arena',
      run: () => navigate('/play')
    },
    {
      id: 'nav-tactics',
      group: 'Navigasi Halaman',
      title: 'Sinema Taktik Grandmaster',
      subtitle: 'Video analisis YouTube & Demo Partai interaktif juara dunia',
      badge: '/tactics',
      icon: Film,
      keywords: 'sinema taktik video carlsen kasparov tal fischer demo',
      run: () => navigate('/tactics')
    },
    {
      id: 'nav-sandbox',
      group: 'Navigasi Halaman',
      title: 'Sandbox PGN / FEN',
      subtitle: 'Analisis bebas, impor PGN/FEN, dan simpan repertoar pribadi',
      badge: '/sandbox',
      icon: Compass,
      keywords: 'sandbox pgn fen analisis impor kustom',
      run: () => navigate('/sandbox')
    },
    {
      id: 'nav-landing',
      group: 'Navigasi Halaman',
      title: 'Halaman Sampul Atelier',
      subtitle: 'Kembali ke tampilan editorial pembuka',
      badge: '/',
      icon: Home,
      keywords: 'landing sampul utama depan',
      run: () => navigate('/')
    }
  ]

  const moduleCommands: CommandAction[] = allModules.value.map((mod) => {
    const path =
      mod.category === 'opening' ? `/trainer/opening/${mod.id}` : `/trainer/endgame/${mod.id}`
    const badge = mod.category === 'opening' ? mod.eco : 'ENDGAME'
    return {
      id: `mod-${mod.id}`,
      group: 'Pustaka Repertoar',
      title: mod.title,
      subtitle: `${mod.subtitle} · ${mod.side === 'w' ? 'Putih' : 'Hitam'}`,
      badge,
      icon: mod.category === 'opening' ? BookOpen : Crown,
      keywords: `${mod.title} ${mod.subtitle} ${mod.summary} ${badge} ${mod.keyThemes.join(' ')}`,
      run: () => navigate(path)
    }
  })

  const studioCommands: CommandAction[] = [
    {
      id: 'act-piece-animal',
      group: 'Aksi Studio',
      title: pieceSet.value === 'animal' ? 'Ganti ke Bidak Klasik Staunton' : 'Ganti ke Bidak Hewan Pastel',
      subtitle: 'Ubah gaya visual bidak di seluruh papan & avatar bot',
      icon: pieceSet.value === 'animal' ? Crown : PawPrint,
      keywords: 'bidak hewan animal klasik staunton karakter',
      run: () => {
        setPieceSet(pieceSet.value === 'animal' ? 'classic' : 'animal')
        emit('close')
      }
    },
    {
      id: 'act-theme-dark',
      group: 'Aksi Studio',
      title: isDark.value ? 'Beralih ke Mode Terang (Starlight Cream)' : 'Beralih ke Mode Gelap (Deep Space)',
      subtitle: 'Ubah suasana warna aplikasi antara terang dan kosmik gelap',
      icon: isDark.value ? Sun : Moon,
      keywords: 'mode gelap terang dark light tema warna',
      run: () => {
        toggleDark()
        emit('close')
      }
    },
    {
      id: 'act-cinematic',
      group: 'Aksi Studio',
      title: cinematicEffects.value
        ? 'Nonaktifkan Efek Sinematik Papan'
        : 'Aktifkan Efek Sinematik Papan',
      subtitle: 'Jejak langkah, riak tangkapan, dan sorotan skak',
      icon: Film,
      keywords: 'efek sinematik gsap animasi papan',
      run: () => {
        toggleCinematicEffects()
        emit('close')
      }
    },
    {
      id: 'act-mute',
      group: 'Aksi Studio',
      title: isMuted.value ? 'Aktifkan Suara Bidak' : 'Bisukan Suara Bidak',
      subtitle: 'Kontrol efek audio kayu, tangkapan, dan skak',
      icon: isMuted.value ? Volume2 : VolumeX,
      keywords: 'suara audio mute bisukan bunyi',
      run: () => {
        toggleMute()
        emit('close')
      }
    },
    ...(['sage', 'walnut', 'stone'] as BoardThemeKey[]).map((key) => ({
      id: `act-board-${key}`,
      group: 'Aksi Studio' as const,
      title: `Tema Papan: ${BOARD_PALETTES[key].label}`,
      subtitle: 'Terapkan palet warna papan kosmik secara langsung',
      badge: BOARD_PALETTES[key].label,
      icon: Palette,
      keywords: `papan tema warna ${BOARD_PALETTES[key].label} ${key}`,
      run: () => {
        setBoardTheme(key)
        emit('close')
      }
    }))
  ]

  return [...navCommands, ...studioCommands, ...moduleCommands]
})

const filteredCommands = computed<CommandAction[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allCommands.value
  return allCommands.value.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.keywords.toLowerCase().includes(q)
  )
})

const groupedCommands = computed(() => {
  const groups: Array<{ name: CommandAction['group']; items: Array<CommandAction & { flatIndex: number }> }> = []
  const order: CommandAction['group'][] = ['Navigasi Halaman', 'Aksi Studio', 'Pustaka Repertoar']
  let idx = 0

  for (const name of order) {
    const items = filteredCommands.value
      .filter((c) => c.group === name)
      .map((item) => ({ ...item, flatIndex: idx++ }))
    if (items.length > 0) {
      groups.push({ name, items })
    }
  }
  return groups
})

const flatFiltered = computed(() => groupedCommands.value.flatMap((g) => g.items))

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      query.value = ''
      activeIndex.value = 0
      await nextTick()
      inputEl.value?.focus()
    }
  }
)

watch(query, () => {
  activeIndex.value = 0
})

function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (flatFiltered.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % flatFiltered.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (flatFiltered.value.length > 0) {
      activeIndex.value =
        (activeIndex.value - 1 + flatFiltered.value.length) % flatFiltered.value.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const picked = flatFiltered.value[activeIndex.value]
    if (picked) picked.run()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cmd-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-[#202321]/50 dark:bg-black/70 backdrop-blur-[3px] flex items-start justify-center p-4 sm:pt-20"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette Grandmaster Atelier"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-xl rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-2xl overflow-hidden"
        >
          <!-- Search Input Row -->
          <div class="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E8E4DC] dark:border-zinc-800">
            <Search class="w-4 h-4 text-[#526857] dark:text-[#9DB5A1] shrink-0" aria-hidden="true" />
            <label for="atelier-cmd-search" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
              Cari:
            </label>
            <input
              id="atelier-cmd-search"
              ref="inputEl"
              v-model="query"
              type="text"
              placeholder="Repertoar, halaman, atau aksi studio..."
              class="min-h-[40px] flex-1 rounded-lg px-2 py-1 bg-transparent text-sm text-[#202321] dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-[#718675]"
            />
            <button
              type="button"
              class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-[#F7F5F0] dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Tutup Command Palette"
              @click="emit('close')"
            >
              <X class="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <!-- Results List -->
          <div class="max-h-[60vh] overflow-y-auto p-2.5 space-y-3">
            <div v-for="group in groupedCommands" :key="group.name" class="space-y-1">
              <div
                class="px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                {{ group.name }}
              </div>

              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="min-h-[48px] w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer"
                :class="
                  activeIndex === item.flatIndex
                    ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321]'
                    : 'text-[#202321] dark:text-zinc-100 hover:bg-[#F7F5F0] dark:hover:bg-zinc-800'
                "
                @mouseenter="activeIndex = item.flatIndex"
                @click="item.run()"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    :class="
                      activeIndex === item.flatIndex
                        ? 'bg-white/15 dark:bg-[#202321]/15'
                        : 'bg-[#F7F5F0] dark:bg-zinc-800 text-[#526857] dark:text-[#9DB5A1]'
                    "
                  >
                    <component :is="item.icon" class="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-semibold truncate">
                      {{ item.title }}
                    </p>
                    <p
                      class="text-[11px] truncate"
                      :class="
                        activeIndex === item.flatIndex
                          ? 'text-white/80 dark:text-[#202321]/80'
                          : 'text-zinc-600 dark:text-zinc-400'
                      "
                    >
                      {{ item.subtitle }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <span
                    v-if="item.badge"
                    class="hidden sm:inline-block font-mono text-[10px] px-2 py-0.5 rounded-md"
                    :class="
                      activeIndex === item.flatIndex
                        ? 'bg-white/15 text-white dark:bg-[#202321]/15 dark:text-[#202321]'
                        : 'bg-[#F7F5F0] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    "
                  >
                    {{ item.badge }}
                  </span>
                </div>
              </button>
            </div>

            <div
              v-if="groupedCommands.length === 0"
              class="py-10 text-center text-xs text-zinc-600 dark:text-zinc-400"
            >
              Tidak ada perintah atau repertoar yang cocok dengan "{{ query }}". Ubah kata kunci pencarian Anda.
            </div>
          </div>

          <!-- Keyboard Hint Footer -->
          <div
            class="px-5 py-2.5 border-t border-[#E8E4DC] dark:border-zinc-800 bg-[#F7F5F0]/80 dark:bg-zinc-900/70 flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400"
          >
            <span>↑↓ navigasi · Enter pilih</span>
            <span>Esc tutup</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmd-fade-enter-active,
.cmd-fade-leave-active {
  transition: opacity 0.16s ease;
}

.cmd-fade-enter-from,
.cmd-fade-leave-to {
  opacity: 0;
}
</style>
