<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    text?: string
    to?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    text: 'Mulai',
    to: undefined,
    type: 'button',
    disabled: false
  }
)
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="group relative inline-flex items-center justify-center cursor-pointer overflow-hidden rounded-full border border-[#202321]/25 dark:border-zinc-700 bg-white dark:bg-[#232429] px-6 py-3 text-sm font-semibold text-[#202321] dark:text-[#F4F3EE] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_14px_-8px_rgba(32,35,33,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_16px_-8px_rgba(0,0,0,0.55)] active:scale-[0.98] transition-all duration-300 hover:border-[#202321] dark:hover:border-[#EDEAE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#19191D]"
  >
    <!-- Expanding primary dot fill -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#202321] dark:bg-[#EDEAE0] transition-all duration-300 ease-out motion-reduce:transition-none group-hover:left-0 group-hover:top-0 group-hover:translate-y-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:rounded-none group-focus-visible:left-0 group-focus-visible:top-0 group-focus-visible:translate-y-0 group-focus-visible:h-full group-focus-visible:w-full group-focus-visible:scale-[1.8]"
    />

    <!-- Resting label (slides out right on hover) -->
    <span
      class="relative z-10 inline-block pl-3.5 pr-0.5 whitespace-nowrap transition-all duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-12 group-hover:opacity-0 group-focus-visible:translate-x-12 group-focus-visible:opacity-0"
    >
      {{ text }}
    </span>

    <!-- Hover reveal label + arrow (slides in from right) -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 text-[#F7F5F0] dark:text-[#202321] translate-x-12 opacity-0 transition-all duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 whitespace-nowrap"
    >
      <span>{{ text }}</span>
      <ArrowRight class="w-4 h-4 shrink-0" />
    </span>
  </NuxtLink>

  <button
    v-else
    :type="type"
    :disabled="disabled"
    class="group relative inline-flex items-center justify-center cursor-pointer overflow-hidden rounded-full border border-[#202321]/25 dark:border-zinc-700 bg-white dark:bg-[#232429] px-6 py-3 text-sm font-semibold text-[#202321] dark:text-[#F4F3EE] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_14px_-8px_rgba(32,35,33,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_16px_-8px_rgba(0,0,0,0.55)] active:scale-[0.98] transition-all duration-300 hover:border-[#202321] dark:hover:border-[#EDEAE0] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#19191D]"
  >
    <!-- Expanding primary dot fill -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#202321] dark:bg-[#EDEAE0] transition-all duration-300 ease-out motion-reduce:transition-none group-hover:left-0 group-hover:top-0 group-hover:translate-y-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:rounded-none group-focus-visible:left-0 group-focus-visible:top-0 group-focus-visible:translate-y-0 group-focus-visible:h-full group-focus-visible:w-full group-focus-visible:scale-[1.8]"
    />

    <!-- Resting label -->
    <span
      class="relative z-10 inline-block pl-3.5 pr-0.5 whitespace-nowrap transition-all duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-12 group-hover:opacity-0 group-focus-visible:translate-x-12 group-focus-visible:opacity-0"
    >
      {{ text }}
    </span>

    <!-- Hover reveal label + arrow -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 text-[#F7F5F0] dark:text-[#202321] translate-x-12 opacity-0 transition-all duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 whitespace-nowrap"
    >
      <span>{{ text }}</span>
      <ArrowRight class="w-4 h-4 shrink-0" />
    </span>
  </button>
</template>
