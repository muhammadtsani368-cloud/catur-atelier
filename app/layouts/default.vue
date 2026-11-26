<script setup lang="ts">
import { BookOpen, Compass, Crown, Film, Moon, PawPrint, Puzzle, Sun, Swords, Volume2, VolumeX } from 'lucide-vue-next'
import AtelierBrandLogo from '~/components/ui/AtelierBrandLogo.vue'
import AtelierCommandPalette from '~/components/ui/AtelierCommandPalette.vue'
import MenuHoverEffects, { type HoverNavItem } from '~/components/ui/MenuHoverEffects.vue'
import { BOARD_PALETTES, type BoardThemeKey } from '~/composables/useTheme'

const route = useRoute()
const { cloudSyncStatus } = useChessProgress()
const {
  isDark,
  boardTheme,
  pieceSet,
  isMuted,
  toggleDark,
  setBoardTheme,
  setPieceSet,
  toggleMute
} = useTheme()

const commandPaletteOpen = ref(false)

const primaryNavItems: HoverNavItem[] = [
  { to: '/dashboard', label: 'Repertoar', icon: BookOpen },
  { to: '/puzzles', label: 'Teka-Teki', shortLabel: 'Teka-Teki', icon: Puzzle },
  { to: '/tactics', label: 'Sinema Taktik', shortLabel: 'Sinema', icon: Film },
  { to: '/play', label: 'Main Bot / 2P', shortLabel: 'Bot/2P', icon: Swords },
  { to: '/sandbox', label: 'Sandbox', shortLabel: 'Sandbox', icon: Compass }
]

const boardThemeOptions: Array<{ key: BoardThemeKey; swatch: string; label: string }> = [
  { key: 'sage', swatch: BOARD_PALETTES.sage.dark, label: 'Papan Sage' },
  { key: 'walnut', swatch: BOARD_PALETTES.walnut.dark, label: 'Papan Walnut' },
  { key: 'stone', swatch: BOARD_PALETTES.stone.dark, label: 'Papan Slate' }
]

function handleGlobalShortcut(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    commandPaletteOpen.value = !commandPaletteOpen.value
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalShortcut))
</script>

<template>
  <div
    class="atelier-atmosphere min-h-screen flex flex-col bg-[#F7F5F0] dark:bg-[#121214] text-[#202321] dark:text-[#F4F3EE] transition-colors duration-200"
  >
    <!-- Quiet Luxury Frosted-Glass Editorial Header -->
    <header
      class="sticky top-0 z-40 border-b border-[#E4DFD5]/90 dark:border-zinc-800/90 bg-[#F7F5F0]/82 dark:bg-[#121214]/82 backdrop-blur-md shadow-[inset_0_-1px_0_rgba(255,255,255,0.65),0_6px_22px_-16px_rgba(32,35,33,0.14)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.04),0_8px_24px_-14px_rgba(0,0,0,0.6)]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-3 lg:gap-4">
        <!-- Brand -->
        <NuxtLink
          to="/"
          class="shrink-0 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F0] dark:focus-visible:ring-offset-[#121214] active:scale-[0.98] transition-transform"
          aria-label="Grandmaster Atelier: Beranda"
        >
          <AtelierBrandLogo />
        </NuxtLink>

        <!-- Primary Navigation (Menu Hover Effects) -->
        <MenuHoverEffects
          class="hidden lg:block shrink-0"
          :items="primaryNavItems"
          :active-path="route.path"
          aria-label="Navigasi utama"
        />

        <!-- Tactile Utility Controls -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- Piece Set Switcher (Klasik vs Karakter Hewan) -->
          <div
            class="hidden sm:inline-flex items-center p-0.5 rounded-lg border border-[#E4DFD5] dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none"
            role="group"
            aria-label="Pilih gaya bidak catur"
          >
            <button
              type="button"
              class="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
              :aria-pressed="pieceSet === 'classic'"
              :class="
                pieceSet === 'classic'
                  ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100'
              "
              title="Bidak Klasik Staunton"
              @click="setPieceSet('classic')"
            >
              <Crown class="w-3.5 h-3.5" aria-hidden="true" />
              <span>Klasik</span>
            </button>
            <button
              type="button"
              class="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
              :aria-pressed="pieceSet === 'animal'"
              :class="
                pieceSet === 'animal'
                  ? 'bg-[#3F5344] text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100'
              "
              title="Bidak Karakter Hewan Pastel"
              @click="setPieceSet('animal')"
            >
              <PawPrint class="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hewan</span>
            </button>
          </div>

          <!-- Subtle Board Theme Switcher -->
          <div
            class="hidden sm:flex items-center gap-0.5 px-1.5 rounded-lg border border-[#E4DFD5] dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none"
            role="group"
            aria-label="Pilih tema warna papan"
            title="Pilih Tema Warna Papan"
          >
            <button
              v-for="opt in boardThemeOptions"
              :key="opt.key"
              type="button"
              class="min-h-[44px] min-w-[36px] inline-flex items-center justify-center transition-transform active:scale-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2 rounded-md"
              :aria-pressed="boardTheme === opt.key"
              :title="opt.label"
              :aria-label="opt.label"
              @click="setBoardTheme(opt.key)"
            >
              <span
                class="w-4 h-4 rounded-full transition-transform"
                :class="
                  boardTheme === opt.key
                    ? 'ring-2 ring-offset-2 ring-[#202321] dark:ring-zinc-100 dark:ring-offset-zinc-900 scale-105'
                    : 'opacity-75 hover:opacity-100 hover:scale-105'
                "
                :style="{ backgroundColor: opt.swatch }"
              />
            </button>
          </div>

          <!-- Mute Toggle -->
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-[#E4DFD5] dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 hover:text-[#202321] hover:border-[#718675]/60 dark:hover:text-white active:scale-[0.96] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
            :aria-pressed="isMuted"
            :title="isMuted ? 'Aktifkan Suara Bidak' : 'Bisukan Suara Bidak'"
            :aria-label="isMuted ? 'Aktifkan Suara Bidak' : 'Bisukan Suara Bidak'"
            @click="toggleMute"
          >
            <VolumeX v-if="isMuted" class="w-4 h-4" aria-hidden="true" />
            <Volume2 v-else class="w-4 h-4" aria-hidden="true" />
          </button>

          <!-- Dark Mode Toggle -->
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-[#E4DFD5] dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 hover:text-[#202321] hover:border-[#718675]/60 dark:hover:text-white active:scale-[0.96] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
            :aria-pressed="isDark"
            :title="isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'"
            :aria-label="isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'"
            @click="toggleDark"
          >
            <Sun v-if="isDark" class="w-4 h-4" aria-hidden="true" />
            <Moon v-else class="w-4 h-4" aria-hidden="true" />
          </button>

          <!-- Google OAuth Account Button -->
          <GoogleAuthButton />
        </div>
      </div>

      <!-- Mobile & Tablet sub-nav (< lg) -->
      <div class="lg:hidden border-t border-[#E4DFD5]/70 dark:border-zinc-800/70 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto">
        <MenuHoverEffects
          :items="primaryNavItems"
          :active-path="route.path"
          compact
          aria-label="Navigasi seluler"
        />

        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            class="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#E4DFD5] dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 text-[#202321] dark:text-zinc-200 active:scale-[0.97] cursor-pointer"
            :aria-pressed="pieceSet === 'animal'"
            :title="pieceSet === 'animal' ? 'Ganti ke Bidak Klasik' : 'Ganti ke Bidak Hewan'"
            @click="setPieceSet(pieceSet === 'classic' ? 'animal' : 'classic')"
          >
            <PawPrint v-if="pieceSet === 'animal'" class="w-3.5 h-3.5 text-[#526857] dark:text-[#9DB5A1]" aria-hidden="true" />
            <Crown v-else class="w-3.5 h-3.5" aria-hidden="true" />
            <span>{{ pieceSet === 'animal' ? 'Hewan' : 'Klasik' }}</span>
          </button>

          <div class="flex items-center gap-0.5">
            <button
              v-for="opt in boardThemeOptions"
              :key="opt.key"
              type="button"
              class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
              :aria-pressed="boardTheme === opt.key"
              :aria-label="opt.label"
              @click="setBoardTheme(opt.key)"
            >
              <span
                class="w-4 h-4 rounded-full"
                :class="boardTheme === opt.key ? 'ring-2 ring-[#202321] dark:ring-white ring-offset-1' : 'opacity-75'"
                :style="{ backgroundColor: opt.swatch }"
              />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 sm:py-10">
      <slot />
    </main>

    <!-- Minimal Editorial Footer -->
    <footer class="border-t border-[#E4DFD5]/80 dark:border-zinc-800/80 py-6 mt-8">
      <div
        class="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400"
      >
        <p class="font-serif italic text-zinc-700 dark:text-zinc-300">
          Grandmaster Atelier: Presisi klasik untuk setiap langkah.
        </p>
        <div class="flex flex-wrap items-center justify-center sm:justify-end gap-x-2.5 gap-y-1 font-mono text-[11px] tracking-[0.04em]">
          <span>Notasi Aljabar Standar (SAN)</span>
          <span aria-hidden="true">·</span>
          <span class="inline-flex items-center gap-1.5">
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="
                cloudSyncStatus === 'synced'
                  ? 'bg-[#526857] dark:bg-[#9DB5A1]'
                  : cloudSyncStatus === 'syncing'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-zinc-400 dark:bg-zinc-600'
              "
              aria-hidden="true"
            />
            <span>
              {{
                cloudSyncStatus === 'synced'
                  ? 'TiDB Cloud tersinkron'
                  : cloudSyncStatus === 'syncing'
                    ? 'Menyinkronkan TiDB...'
                    : 'Progres tersimpan lokal'
              }}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Ctrl+K</span>
        </div>
      </div>
    </footer>

    <!-- Command Palette (Ctrl+K / Cmd+K) -->
    <AtelierCommandPalette :open="commandPaletteOpen" @close="commandPaletteOpen = false" />
  </div>
</template>
