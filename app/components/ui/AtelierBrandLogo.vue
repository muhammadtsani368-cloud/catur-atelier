<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
    showSubtitle?: boolean
  }>(),
  {
    compact: false,
    showSubtitle: true
  }
)
</script>

<template>
  <div class="inline-flex items-center gap-2.5 sm:gap-3 shrink-0 select-none">
    <!-- Luxury Architectural Chess Crest Medallion -->
    <div
      class="relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-[1.05] group-hover:shadow-[0_8px_22px_-6px_rgba(197,155,70,0.45)] motion-reduce:transform-none bg-gradient-to-br from-[#242D27] via-[#171A18] to-[#0E100F] ring-1 ring-[#C59B46]/55 dark:ring-[#D9B66B]/60 shadow-[inset_0_1px_0_rgba(246,228,181,0.32),0_4px_12px_-3px_rgba(20,20,22,0.45)]"
      :class="compact ? 'w-9 h-9' : 'w-10 h-10'"
    >
      <!-- Subtle hover sheen sweep -->
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out motion-reduce:hidden bg-gradient-to-r from-transparent via-[#F6E4B5]/25 to-transparent"
      />

      <svg
        viewBox="0 0 40 40"
        class="w-full h-full relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gm-gold-main" x1="10" y1="6" x2="30" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FAF0D2" />
            <stop offset="48%" stop-color="#D9B462" />
            <stop offset="100%" stop-color="#A67E33" />
          </linearGradient>
          <linearGradient id="gm-gold-bright" x1="20" y1="5" x2="20" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF7DF" />
            <stop offset="100%" stop-color="#D4AE5C" />
          </linearGradient>
          <radialGradient id="gm-crest-glow" cx="50%" cy="32%" r="60%">
            <stop offset="0%" stop-color="#718675" stop-opacity="0.34" />
            <stop offset="100%" stop-color="#141416" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Ambient Sage Radial Depth -->
        <rect width="40" height="40" fill="url(#gm-crest-glow)" />

        <!-- Subtle Architectural 2x2 Chessboard Watermark -->
        <rect x="4" y="4" width="16" height="16" fill="#F7F5F0" fill-opacity="0.045" />
        <rect x="20" y="20" width="16" height="16" fill="#F7F5F0" fill-opacity="0.045" />

        <!-- Inner Hairline Gold Atelier Frame -->
        <rect
          x="3.2"
          y="3.2"
          width="33.6"
          height="33.6"
          rx="7.5"
          stroke="#D4B064"
          stroke-opacity="0.32"
          stroke-width="0.85"
        />

        <!-- Royal Cross Finial -->
        <path
          d="M20 6.5V12.5M17.2 9.1H22.8"
          stroke="url(#gm-gold-bright)"
          stroke-width="2"
          stroke-linecap="round"
        />

        <!-- Sculpted Grandmaster King Crown -->
        <path
          d="M11.6 26.8L9.6 17.5C9.3 15.9 10.9 14.7 12.4 15.3L16.3 17.1L18.9 13.6C19.5 12.8 20.5 12.8 21.1 13.6L23.7 17.1L27.6 15.3C29.1 14.7 30.7 15.9 30.4 17.5L28.4 26.8H11.6Z"
          fill="url(#gm-gold-main)"
        />

        <!-- Sculpted Inner Shadow Cutout for Editorial Depth -->
        <path
          d="M13.6 25.2L12.4 18.7L16.7 20.3L20 16.2L23.3 20.3L27.6 18.7L26.4 25.2H13.6Z"
          fill="#171B18"
          fill-opacity="0.22"
        />

        <!-- Center Warm Sage Emerald Jewel -->
        <path
          d="M20 19.3L21.9 21.5L20 23.7L18.1 21.5L20 19.3Z"
          fill="#7FA086"
          stroke="#FFF7DF"
          stroke-width="0.6"
        />

        <!-- Pedestal Collar & Base -->
        <rect x="11.2" y="28.3" width="17.6" height="2.2" rx="1.1" fill="url(#gm-gold-main)" />
        <rect x="9.5" y="31.5" width="21" height="2.3" rx="1.15" fill="url(#gm-gold-main)" fill-opacity="0.92" />
      </svg>
    </div>

    <!-- Editorial Signature Wordmark -->
    <div class="leading-tight min-w-0">
      <span class="font-serif text-base sm:text-[19px] font-semibold tracking-[-0.025em] whitespace-nowrap block text-[#202321] dark:text-[#F4F3EE]">
        Grandmaster
        <span class="italic font-medium text-[#526857] dark:text-[#D9B462]">Atelier</span>
      </span>
      <span
        v-if="showSubtitle"
        class="hidden xl:flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mt-0.5"
      >
        <span>Studio Repertoar</span>
        <span class="text-[#C59B46]" aria-hidden="true">◆</span>
        <span>Babak Akhir</span>
      </span>
    </div>
  </div>
</template>
