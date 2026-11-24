<script setup lang="ts">
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import { Crown } from 'lucide-vue-next'
import type { PreviewMoveMotion } from '~/utils/repertoirePreview'

const props = withDefaults(
  defineProps<{
    fen: string | null
    hoverMove?: PreviewMoveMotion | null
    orientation?: Color
    highlightSquares?: string[]
    hovered?: boolean
    size?: 'card' | 'drawer'
  }>(),
  {
    hoverMove: null,
    orientation: 'w',
    highlightSquares: () => [],
    hovered: false,
    size: 'card'
  }
)

const { currentBoardPalette } = useTheme()

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

const highlightSet = computed(() => new Set(props.highlightSquares))

function squareToDisplayPos(sq: string): { row: number; col: number } {
  const fileIdx = FILES.indexOf(sq[0] as (typeof FILES)[number])
  const rankIdx = RANKS.indexOf(sq[1] as (typeof RANKS)[number])
  if (props.orientation === 'w') {
    return { row: rankIdx, col: fileIdx }
  }
  return { row: 7 - rankIdx, col: 7 - fileIdx }
}

// Compute the exact CSS translation delta (in square widths) for the animated signature piece
const hoverGlideTransform = computed<string>(() => {
  if (!props.hovered || !props.hoverMove) return 'translate3d(0, 0, 0)'
  const fromPos = squareToDisplayPos(props.hoverMove.from)
  const toPos = squareToDisplayPos(props.hoverMove.to)
  const dx = (toPos.col - fromPos.col) * 100
  const dy = (toPos.row - fromPos.row) * 100
  return `translate3d(${dx}%, ${dy}%, 0) scale(1.08)`
})

interface MiniSquare {
  square: Square
  isLight: boolean
  piece: { type: PieceSymbol; color: Color } | null
  isKey: boolean
  isMovingOrigin: boolean
  isMovingDest: boolean
}

const parsedBoard = computed(() => {
  if (!props.fen) return null
  try {
    return new Chess(props.fen).board()
  } catch {
    return null
  }
})

const cells = computed<MiniSquare[]>(() => {
  const board = parsedBoard.value
  const rowOrder = props.orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  const colOrder = props.orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]

  const out: MiniSquare[] = []
  for (const r of rowOrder) {
    const row = board?.[r]
    for (const c of colOrder) {
      const sq = `${FILES[c]}${RANKS[r]}` as Square
      const p = row?.[c] ?? null
      out.push({
        square: sq,
        isLight: (r + c) % 2 === 0,
        piece: p ? { type: p.type, color: p.color } : null,
        isKey: highlightSet.value.has(sq),
        isMovingOrigin: Boolean(props.hoverMove && props.hoverMove.from === sq),
        isMovingDest: Boolean(props.hoverMove && props.hoverMove.to === sq)
      })
    }
  }
  return out
})

const sizeClasses = computed(() =>
  props.size === 'drawer'
    ? 'w-full max-w-[252px] aspect-square rounded-[14px] p-1'
    : 'w-[112px] h-[112px] sm:w-[118px] sm:h-[118px] rounded-[13px] p-[3px]'
)
</script>

<template>
  <!-- Tactile Editorial Outer Bezel -->
  <div
    class="relative shrink-0 bg-gradient-to-b from-[#EAE4D8] to-[#D9D2C3] dark:from-[#2B2C32] dark:to-[#1C1D22] ring-1 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_2px_5px_-2px_rgba(32,35,33,0.16),0_10px_18px_-12px_rgba(32,35,33,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)]"
    :class="[
      sizeClasses,
      hovered
        ? 'scale-[1.03] ring-[#718675]/80 dark:ring-[#8FA894]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_4px_10px_-3px_rgba(32,35,33,0.18),0_14px_24px_-12px_rgba(113,134,117,0.3)]'
        : 'ring-[#202321]/14 dark:ring-white/10'
    ]"
    aria-hidden="true"
  >
    <div class="relative w-full h-full rounded-[9px] overflow-hidden ring-1 ring-[#202321]/18 dark:ring-black/55">
      <div class="grid grid-cols-8 grid-rows-8 w-full h-full">
        <div
          v-for="cell in cells"
          :key="cell.square"
          class="relative w-full h-full flex items-center justify-center"
          :class="cell.isMovingOrigin && hovered ? 'z-30' : 'z-0'"
          :style="{
            backgroundColor: cell.isLight ? currentBoardPalette.light : currentBoardPalette.dark
          }"
        >
          <!-- Origin & destination soft tactical glow on hover -->
          <span
            v-if="(cell.isMovingOrigin || cell.isMovingDest) && parsedBoard"
            class="absolute inset-0 pointer-events-none transition-opacity duration-250 motion-reduce:transition-none"
            :class="
              hovered
                ? cell.isMovingDest
                  ? 'bg-[#718675]/45 opacity-100 ring-inset ring-1 ring-[#202321]/25'
                  : 'bg-[#E6C25A]/45 opacity-100'
                : 'opacity-0'
            "
          />

          <!-- Static key square subtle tint -->
          <span
            v-else-if="cell.isKey && parsedBoard"
            class="absolute inset-0 pointer-events-none transition-all duration-300 motion-reduce:transition-none"
            :class="hovered ? 'bg-[#718675]/35' : 'bg-[#718675]/16'"
          />

          <!-- Target indicator dot on empty destination/key square -->
          <span
            v-if="cell.isKey && !cell.isMovingDest && !cell.piece && parsedBoard"
            class="w-1.5 h-1.5 rounded-full bg-[#202321]/60 dark:bg-white/75 z-10 transition-all duration-250 motion-reduce:transition-none"
            :class="hovered ? 'opacity-90 scale-100' : 'opacity-0 scale-50'"
          />

          <!-- Piece wrapper is 100% square size so translate3d(N*100%) lands pixel-exact on target square -->
          <div
            v-if="cell.piece"
            class="relative w-full h-full flex items-center justify-center transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none"
            :class="[
              cell.isMovingOrigin ? 'z-30' : 'z-10',
              cell.isMovingDest && hovered ? 'opacity-0 scale-75' : 'opacity-100',
              !cell.isMovingOrigin && !cell.isMovingDest && cell.isKey && hovered ? '-translate-y-0.5 scale-105' : ''
            ]"
            :style="cell.isMovingOrigin ? { transform: hoverGlideTransform } : undefined"
          >
            <div class="w-[86%] h-[86%]">
              <ChessPiece :type="cell.piece.type" :color="cell.piece.color" />
            </div>
          </div>
        </div>
      </div>

      <!-- Consistent chess board placeholder when actual FEN/PGN position is unavailable -->
      <div
        v-if="!parsedBoard"
        class="absolute inset-0 flex flex-col items-center justify-center bg-[#F7F5F0]/80 dark:bg-zinc-900/80 text-[#526857] dark:text-[#9DB5A1]"
      >
        <Crown class="w-5 h-5 opacity-75" />
        <span class="mt-1 text-[9px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Posisi
        </span>
      </div>
    </div>
  </div>
</template>
