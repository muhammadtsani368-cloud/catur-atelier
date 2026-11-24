<script setup lang="ts">
import { BookOpen, Compass, Film, Puzzle, Swords } from 'lucide-vue-next'

const route = useRoute()

const dockItems = [
  { to: '/dashboard', label: 'Repertoar', icon: BookOpen },
  { to: '/puzzles', label: 'Teka-Teki', icon: Puzzle },
  { to: '/play', label: 'Main', icon: Swords },
  { to: '/tactics', label: 'Taktik', icon: Film },
  { to: '/sandbox', label: 'Sandbox', icon: Compass }
] as const

function isActive(to: string): boolean {
  if (to === '/dashboard') {
    return route.path === '/dashboard' || route.path.startsWith('/trainer/')
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)]"
    aria-label="Navigasi utama mengambang"
  >
    <div
      class="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-full border border-[#3B3561]/14 dark:border-[#9D8DF1]/25 bg-white/84 dark:bg-[#1E1B38]/84 backdrop-blur-xl shadow-[0_8px_28px_-8px_rgba(30,27,56,0.22),0_2px_6px_rgba(30,27,56,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_34px_-8px_rgba(8,6,22,0.78),inset_0_1px_0_rgba(255,255,255,0.1)]"
    >
      <NuxtLink
        v-for="item in dockItems"
        :key="item.to"
        :to="item.to"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        :aria-label="item.label"
        class="group relative inline-flex items-center justify-center rounded-full transition-all duration-250 ease-out active:scale-[0.96] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D8DF1] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1E1B38]"
        :class="
          isActive(item.to)
            ? 'px-3.5 sm:px-4 py-2.5 gap-2 bg-[#3B3561] text-[#FAF8F5] dark:bg-[#9D8DF1] dark:text-[#1E1B38] shadow-[0_6px_16px_-6px_rgba(59,53,97,0.55)]'
            : 'px-3 sm:px-3.5 py-2.5 gap-1.5 text-[#3B3561]/80 dark:text-[#D7D2EE] hover:-translate-y-1 hover:bg-[#3B3561]/8 dark:hover:bg-white/10 hover:text-[#1E1B38] dark:hover:text-white'
        "
      >
        <component
          :is="item.icon"
          class="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"
        />
        <span
          class="text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-250"
          :class="
            isActive(item.to)
              ? 'max-w-[110px] opacity-100'
              : 'hidden sm:inline-block max-w-[90px] opacity-85 group-hover:opacity-100'
          "
        >
          {{ item.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>
