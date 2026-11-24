<script setup lang="ts">
import type { Component } from 'vue'

export interface HoverNavItem {
  to: string
  label: string
  shortLabel?: string
  icon?: Component
}

const props = withDefaults(
  defineProps<{
    items: HoverNavItem[]
    activePath: string
    compact?: boolean
    ariaLabel?: string
  }>(),
  {
    compact: false,
    ariaLabel: 'Navigasi utama'
  }
)

function isActive(to: string): boolean {
  if (to === '/dashboard') {
    return props.activePath === '/dashboard' || props.activePath.startsWith('/trainer/')
  }
  return props.activePath === to || props.activePath.startsWith(`${to}/`)
}
</script>

<template>
  <nav :aria-label="ariaLabel">
    <ul
      class="flex items-center"
      :class="compact ? 'gap-1' : 'gap-0.5 xl:gap-1.5'"
    >
      <li v-for="item in items" :key="item.to" class="list-none shrink-0">
        <NuxtLink
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="relative inline-flex items-center justify-center group active:scale-[0.98] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F0] dark:focus-visible:ring-offset-[#121214]"
        >
          <!-- Link text & icon -->
          <span
            class="relative z-10 inline-flex items-center gap-1.5 uppercase font-sans font-semibold tracking-[0.05em] whitespace-nowrap transition-colors duration-300 motion-reduce:transition-none"
            :class="[
              compact ? 'text-[11px] py-1.5 px-2.5' : 'text-[11px] xl:text-xs py-2 px-2 xl:px-3',
              isActive(item.to)
                ? 'text-[#F7F5F0] dark:text-[#202321]'
                : 'text-[#202321]/80 dark:text-zinc-300 group-hover:text-[#F7F5F0] group-focus-visible:text-[#F7F5F0] dark:group-hover:text-[#202321] dark:group-focus-visible:text-[#202321]'
            ]"
          >
            <component
              :is="item.icon"
              v-if="item.icon && !compact"
              class="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
            />
            <span v-if="compact">{{ item.shortLabel ?? item.label }}</span>
            <template v-else>
              <span v-if="item.shortLabel" class="xl:hidden">{{ item.shortLabel }}</span>
              <span :class="item.shortLabel ? 'hidden xl:inline' : ''">{{ item.label }}</span>
            </template>
          </span>

          <!-- Top & bottom border clamp animation -->
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 border-t-2 border-b-2 border-[#202321] dark:border-[#EDEAE0] origin-center transition-all duration-300 ease-out motion-reduce:transition-none"
            :class="
              isActive(item.to)
                ? 'scale-y-100 opacity-100'
                : 'scale-y-[2] opacity-0 group-hover:scale-y-100 group-hover:opacity-100 group-focus-visible:scale-y-100 group-focus-visible:opacity-100'
            "
          />

          <!-- Background fill reveal animation -->
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 top-[2px] bottom-[2px] bg-[#202321] dark:bg-[#EDEAE0] origin-top transition-all duration-300 ease-out motion-reduce:transition-none"
            :class="
              isActive(item.to)
                ? 'scale-100 opacity-100'
                : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100'
            "
          />
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
