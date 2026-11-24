<script setup lang="ts">
import type { Color } from 'chess.js'

export interface TacticalArrow {
  from: string
  to: string
  tone?: 'plan' | 'threat'
}

const props = withDefaults(
  defineProps<{
    arrows: TacticalArrow[]
    orientation?: Color
  }>(),
  {
    orientation: 'w'
  }
)

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

function squareCenter(sq: string): { x: number; y: number } | null {
  if (sq.length !== 2) return null
  const fileIdx = FILES.indexOf(sq[0] as (typeof FILES)[number])
  const rankIdx = RANKS.indexOf(sq[1] as (typeof RANKS)[number])
  if (fileIdx === -1 || rankIdx === -1) return null

  const col = props.orientation === 'w' ? fileIdx : 7 - fileIdx
  const row = props.orientation === 'w' ? rankIdx : 7 - rankIdx
  return {
    x: col * 100 + 50,
    y: row * 100 + 50
  }
}

interface RenderedArrow {
  key: string
  color: string
  isKnight: boolean
  startX: number
  startY: number
  shaftPath: string
  headPoints: string
}

const renderedArrows = computed<RenderedArrow[]>(() => {
  const result: RenderedArrow[] = []

  for (const arrow of props.arrows) {
    const start = squareCenter(arrow.from)
    const end = squareCenter(arrow.to)
    if (!start || !end || (start.x === end.x && start.y === end.y)) continue

    const color = arrow.tone === 'threat' ? '#C26D53' : '#718675'
    const dx = end.x - start.x
    const dy = end.y - start.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const isKnight = (absDx === 100 && absDy === 200) || (absDx === 200 && absDy === 100)

    const headLen = 30
    const headHalfW = 19

    if (isKnight) {
      // Crisp L-shaped bend along the longer axis first, then into destination
      const elbowX = absDx > absDy ? end.x : start.x
      const elbowY = absDx > absDy ? start.y : end.y
      const segDx = end.x - elbowX
      const segDy = end.y - elbowY
      const segLen = Math.hypot(segDx, segDy)
      const ux = segDx / segLen
      const uy = segDy / segLen
      const tipX = end.x - ux * 10
      const tipY = end.y - uy * 10
      const baseX = tipX - ux * headLen
      const baseY = tipY - uy * headLen
      const px = -uy
      const py = ux

      const p1 = `${tipX},${tipY}`
      const p2 = `${baseX + px * headHalfW},${baseY + py * headHalfW}`
      const p3 = `${baseX - px * headHalfW},${baseY - py * headHalfW}`

      result.push({
        key: `${arrow.from}-${arrow.to}-${arrow.tone ?? 'plan'}`,
        color,
        isKnight: true,
        startX: start.x,
        startY: start.y,
        shaftPath: `M ${start.x} ${start.y} L ${elbowX} ${elbowY} L ${baseX} ${baseY}`,
        headPoints: `${p1} ${p2} ${p3}`
      })
    } else {
      const len = Math.hypot(dx, dy)
      const ux = dx / len
      const uy = dy / len
      const startPad = 14
      const endPad = 10
      const sx = start.x + ux * startPad
      const sy = start.y + uy * startPad
      const tipX = end.x - ux * endPad
      const tipY = end.y - uy * endPad
      const baseX = tipX - ux * headLen
      const baseY = tipY - uy * headLen
      const px = -uy
      const py = ux

      const p1 = `${tipX},${tipY}`
      const p2 = `${baseX + px * headHalfW},${baseY + py * headHalfW}`
      const p3 = `${baseX - px * headHalfW},${baseY - py * headHalfW}`

      result.push({
        key: `${arrow.from}-${arrow.to}-${arrow.tone ?? 'plan'}`,
        color,
        isKnight: false,
        startX: start.x,
        startY: start.y,
        shaftPath: `M ${sx} ${sy} L ${baseX} ${baseY}`,
        headPoints: `${p1} ${p2} ${p3}`
      })
    }
  }

  return result
})
</script>

<template>
  <svg
    v-if="renderedArrows.length > 0"
    viewBox="0 0 800 800"
    class="absolute inset-0 w-full h-full pointer-events-none z-25"
    aria-hidden="true"
  >
    <g
      v-for="item in renderedArrows"
      :key="item.key"
      class="tactical-arrow-group"
    >
      <!-- Soft subtle anchor ring at origin -->
      <circle
        :cx="item.startX"
        :cy="item.startY"
        r="12"
        :fill="item.color"
        opacity="0.28"
      />
      <!-- Arrow shaft -->
      <path
        :d="item.shaftPath"
        fill="none"
        :stroke="item.color"
        stroke-width="15"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.86"
      />
      <!-- Arrowhead -->
      <polygon
        :points="item.headPoints"
        :fill="item.color"
        opacity="0.92"
      />
    </g>
  </svg>
</template>

<style scoped>
@keyframes arrow-appear {
  0% {
    opacity: 0;
    transform: scale(0.94);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.tactical-arrow-group {
  transform-origin: center;
  animation: arrow-appear 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .tactical-arrow-group {
    animation: none;
  }
}
</style>
