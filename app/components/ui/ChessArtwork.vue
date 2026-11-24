<script setup lang="ts">
import type { Color, PieceSymbol } from 'chess.js'

export interface ChessPosterSpec {
  id: number
  title: string
  category: 'Pembukaan' | 'Babak Akhir' | 'Taktik'
  notation: string
  description: string
  route: string
  bg: string
  bg2: string
  boardLight: string
  boardDark: string
  accent: string
  ink: string
  featuredPiece: PieceSymbol
  featuredColor: Color
  secondaryPiece?: PieceSymbol
  secondaryColor?: Color
  badgeText: string
}

defineProps<{
  poster: ChessPosterSpec
  compact?: boolean
}>()
</script>

<template>
  <div
    class="relative w-full h-full overflow-hidden select-none"
    :style="{
      background: `linear-gradient(145deg, ${poster.bg} 0%, ${poster.bg2} 100%)`
    }"
  >
    <!-- Soft geometric editorial shapes -->
    <svg
      viewBox="0 0 400 400"
      class="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <circle cx="330" cy="70" r="120" :fill="poster.accent" opacity="0.22" />
      <circle cx="50" cy="340" r="140" fill="#ffffff" opacity="0.14" />

      <!-- Crisp 4x4 tilted mini-board grid watermark -->
      <g transform="translate(175 110) rotate(-14)">
        <rect x="-12" y="-12" width="224" height="224" rx="18" fill="#000000" opacity="0.12" />
        <rect x="0" y="0" width="200" height="200" rx="14" :fill="poster.boardLight" />
        <template v-for="r in 4" :key="`r-${r}`">
          <template v-for="c in 4" :key="`c-${r}-${c}`">
            <rect
              v-if="(r + c) % 2 === 1"
              :x="(c - 1) * 50"
              :y="(r - 1) * 50"
              width="50"
              height="50"
              :fill="poster.boardDark"
              opacity="0.92"
            />
          </template>
        </template>
        <!-- Tactical vector arrow on mini-board -->
        <path
          d="M 28 172 L 122 78 M 102 78 L 122 78 L 122 98"
          fill="none"
          :stroke="poster.accent"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.9"
        />
      </g>
    </svg>

    <!-- Prominent Staunton Chess Pieces -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
      :class="compact ? 'p-4' : 'p-6'"
    >
      <div class="relative w-[56%] max-w-[190px] aspect-square -translate-x-2 translate-y-1">
        <ChessPiece :type="poster.featuredPiece" :color="poster.featuredColor" />
      </div>
      <div
        v-if="poster.secondaryPiece"
        class="relative w-[34%] max-w-[115px] aspect-square -ml-7 translate-y-6 opacity-95"
      >
        <ChessPiece :type="poster.secondaryPiece" :color="poster.secondaryColor ?? 'b'" />
      </div>
    </div>

    <!-- Subtle top-right algebraic tag (only on larger cards) -->
    <div
      v-if="!compact"
      class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-tight backdrop-blur-md"
      :style="{
        backgroundColor: 'rgba(255,255,255,0.22)',
        color: poster.ink
      }"
    >
      {{ poster.badgeText }}
    </div>

    <!-- Subtle bottom notation strip for non-compact previews -->
    <div
      v-if="!compact"
      class="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
      style="background: linear-gradient(180deg, transparent, rgba(16, 17, 28, 0.56))"
    />
  </div>
</template>
