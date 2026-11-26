<script setup lang="ts">
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import gsap from 'gsap'
import { Crosshair } from 'lucide-vue-next'
import type {
  BoardEffectEvent,
  ConstellationSightline,
  EditorialStampKind
} from '~/components/BoardEffectsLayer.vue'
import type { TacticalArrow } from '~/components/TacticalArrowOverlay.vue'
import type { MoveClassification } from '~/utils/gameReviewEngine'

const props = withDefaults(
  defineProps<{
    fen: string
    orientation?: Color
    interactive?: boolean
    allowedColor?: Color | 'both'
    lastMove?: { from: string; to: string } | null
    correctSquare?: string | null
    errorSquare?: string | null
    hintFrom?: string | null
    hintTo?: string | null
    hangingSquares?: string[]
    tensionSquares?: string[]
    arrows?: TacticalArrow[]
    moveBadge?: { square: string; classification: MoveClassification } | null
    showCenterControlToggle?: boolean
    shake?: boolean
    surfaceTone?: 'light' | 'dark'
    hideCoordinates?: boolean
    pieceVisibilityMode?: 'normal' | 'fog' | 'blind'
    squarePickMode?: boolean
  }>(),
  {
    orientation: 'w',
    interactive: true,
    allowedColor: 'both',
    lastMove: null,
    correctSquare: null,
    errorSquare: null,
    hintFrom: null,
    hintTo: null,
    hangingSquares: () => [],
    tensionSquares: () => [],
    arrows: () => [],
    moveBadge: null,
    showCenterControlToggle: true,
    shake: false,
    surfaceTone: 'light',
    hideCoordinates: false,
    pieceVisibilityMode: 'normal',
    squarePickMode: false
  }
)

const hangingSquareSet = computed(() => new Set(props.hangingSquares))
const tensionSquareSet = computed(() => new Set(props.tensionSquares))

const emit = defineEmits<{
  move: [payload: { from: Square; to: Square; promotion?: PieceSymbol }]
  squareClick: [square: Square]
}>()

const { currentBoardPalette, cinematicEffects } = useTheme()

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const
const CENTER_SQUARES = new Set<Square>(['d4', 'e4', 'd5', 'e5'])

const selectedSquare = ref<Square | null>(null)
const dragOrigin = ref<Square | null>(null)
const dragHoverSquare = ref<Square | null>(null)
const pendingPromotion = ref<{ from: Square; to: Square; color: Color } | null>(null)
const showCenterControl = ref(false)

// Smooth 250ms glide animation state for the latest moved piece
const animatedSquare = ref<string | null>(null)
const animateOffset = ref<{ x: number; y: number } | null>(null)

// GSAP board effects, recoil map & check tension glow refs
const boardEffect = ref<BoardEffectEvent | null>(null)
const checkGlowEl = ref<HTMLElement | null>(null)
const pieceDomMap = new Map<string, HTMLElement>()
let effectSeq = 0
let checkGlowTween: gsap.core.Tween | null = null
let recoilTweens: gsap.core.Tween[] = []

function snapshotBoardPieces(fenStr: string): Record<string, { type: PieceSymbol; color: Color }> {
  const map: Record<string, { type: PieceSymbol; color: Color }> = {}
  try {
    const g = new Chess(fenStr)
    for (const row of g.board()) {
      for (const cell of row) {
        if (cell) map[cell.square] = { type: cell.type, color: cell.color }
      }
    }
  } catch {
    // Ignore invalid FEN
  }
  return map
}

let prevBoardPieces = snapshotBoardPieces(props.fen)

const chessInstance = computed(() => {
  try {
    return new Chess(props.fen)
  } catch {
    return new Chess()
  }
})

// Real-time center control analysis for d4, e4, d5, e5 using chess.js attackers()
interface CenterControlInfo {
  white: number
  black: number
  leader: 'w' | 'b' | 'equal' | 'none'
}

const centerControlMap = computed<Record<string, CenterControlInfo>>(() => {
  if (!showCenterControl.value) return {}
  const g = chessInstance.value
  const map: Record<string, CenterControlInfo> = {}
  for (const sq of CENTER_SQUARES) {
    const white = g.attackers(sq, 'w').length
    const black = g.attackers(sq, 'b').length
    let leader: CenterControlInfo['leader'] = 'none'
    if (white > black) leader = 'w'
    else if (black > white) leader = 'b'
    else if (white > 0 && white === black) leader = 'equal'
    map[sq] = { white, black, leader }
  }
  return map
})

// Combine explicit arrows with automatic hint arrow when hintFrom & hintTo are set
const effectiveArrows = computed<TacticalArrow[]>(() => {
  const list = [...props.arrows]
  if (props.hintFrom && props.hintTo) {
    const exists = list.some((a) => a.from === props.hintFrom && a.to === props.hintTo)
    if (!exists) {
      list.push({
        from: props.hintFrom,
        to: props.hintTo,
        tone: 'plan'
      })
    }
  }
  return list
})

const checkedKingSquare = computed<string | null>(() => {
  const g = chessInstance.value
  if (!g.isCheck()) return null
  const turn = g.turn()
  const board = g.board()
  for (let r = 0; r < 8; r++) {
    const row = board[r]
    if (!row) continue
    for (let c = 0; c < 8; c++) {
      const p = row[c]
      if (p && p.type === 'k' && p.color === turn) {
        return p.square
      }
    }
  }
  return null
})

interface SquareRenderItem {
  square: Square
  file: string
  rank: string
  rowIdx: number
  colIdx: number
  isLight: boolean
  piece: { type: PieceSymbol; color: Color } | null
  showRankLabel: boolean
  showFileLabel: boolean
}

const squares = computed<SquareRenderItem[]>(() => {
  const board = chessInstance.value.board()
  const items: SquareRenderItem[] = []

  const rowOrder = props.orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  const colOrder = props.orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]

  for (let displayRow = 0; displayRow < 8; displayRow++) {
    const r = rowOrder[displayRow]!
    const boardRow = board[r]
    for (let displayCol = 0; displayCol < 8; displayCol++) {
      const c = colOrder[displayCol]!
      const file = FILES[c]!
      const rank = RANKS[r]!
      const sq = `${file}${rank}` as Square
      const rawPiece = boardRow?.[c] ?? null
      items.push({
        square: sq,
        file,
        rank,
        rowIdx: displayRow,
        colIdx: displayCol,
        isLight: (r + c) % 2 === 0,
        piece: rawPiece ? { type: rawPiece.type, color: rawPiece.color } : null,
        showRankLabel: displayCol === 0,
        showFileLabel: displayRow === 7
      })
    }
  }
  return items
})

const legalMovesFromSelected = computed<Move[]>(() => {
  const origin = selectedSquare.value ?? dragOrigin.value
  if (!origin || !props.interactive) return []
  return chessInstance.value.moves({ square: origin, verbose: true })
})

const legalTargetSet = computed<Set<string>>(() => {
  return new Set(legalMovesFromSelected.value.map((m) => m.to))
})

// 3. Constellation Sightlines: enemy pieces capturable (#F26B5B) + friendly pieces defended (#4ECDC4)
const constellationSightlines = computed<ConstellationSightline[]>(() => {
  const origin = selectedSquare.value
  if (!origin || !props.interactive || !cinematicEffects.value) return []

  const g = chessInstance.value
  const originPiece = g.get(origin)
  if (!originPiece) return []

  const lines: ConstellationSightline[] = []
  const seenAttack = new Set<string>()

  // Capturable enemy targets
  for (const m of legalMovesFromSelected.value) {
    if (m.captured && !seenAttack.has(m.to)) {
      seenAttack.add(m.to)
      lines.push({ from: origin, to: m.to, kind: 'attack' })
    }
  }

  // Friendly pieces directly defended by the selected piece
  for (const row of g.board()) {
    for (const cell of row) {
      if (!cell || cell.square === origin || cell.color !== originPiece.color) continue
      const defenders = g.attackers(cell.square, originPiece.color)
      if (defenders.includes(origin)) {
        lines.push({ from: origin, to: cell.square, kind: 'defend' })
      }
    }
  }

  return lines
})

function triggerNeighborImpactRecoil(targetSquare: string) {
  if (!cinematicEffects.value || typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  for (const tw of recoilTweens) tw.kill()
  recoilTweens = []

  const fIdx = FILES.indexOf(targetSquare[0] as (typeof FILES)[number])
  const rIdx = RANKS.indexOf(targetSquare[1] as (typeof RANKS)[number])
  if (fIdx < 0 || rIdx < 0) return

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nf = fIdx + dc
      const nr = rIdx + dr
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue
      const neighborSq = `${FILES[nf]}${RANKS[nr]}`
      const el = pieceDomMap.get(neighborSq)
      if (!el) continue

      const tilt = dc === 0 ? (dr < 0 ? 3 : -3) : dc * 3
      const tw = gsap.fromTo(
        el,
        { rotation: 0, y: 0 },
        {
          rotation: tilt,
          y: -2,
          duration: 0.13,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
          clearProps: 'rotation,y'
        }
      )
      recoilTweens.push(tw)
    }
  }
}

function squareToDisplayCoords(sq: string): { row: number; col: number } {
  const fileIdx = FILES.indexOf(sq[0] as (typeof FILES)[number])
  const rankIdx = RANKS.indexOf(sq[1] as (typeof RANKS)[number])
  if (props.orientation === 'w') {
    return { row: rankIdx, col: fileIdx }
  }
  return { row: 7 - rankIdx, col: 7 - fileIdx }
}

// Trigger smooth 250ms transition & GSAP board effects whenever lastMove/fen updates
watch(
  () => [props.fen, props.lastMove?.from, props.lastMove?.to],
  () => {
    selectedSquare.value = null
    dragOrigin.value = null
    dragHoverSquare.value = null
    pendingPromotion.value = null

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const nextBoardPieces = snapshotBoardPieces(props.fen)

    if (props.lastMove && typeof window !== 'undefined') {
      const movedFromPiece = prevBoardPieces[props.lastMove.from]
      const targetBefore = prevBoardPieces[props.lastMove.to]
      const targetAfter = nextBoardPieces[props.lastMove.to]

      // Detect capture (direct capture or en passant pawn diagonal move onto empty square)
      const isEnPassant =
        movedFromPiece?.type === 'p' &&
        !targetBefore &&
        props.lastMove.from[0] !== props.lastMove.to[0]
      const isCapture = Boolean(
        (targetBefore && movedFromPiece && targetBefore.color !== movedFromPiece.color) || isEnPassant
      )

      // Detect promotion
      const isPromotion = Boolean(
        movedFromPiece?.type === 'p' && targetAfter && targetAfter.type !== 'p'
      )

      // Detect Comet Ink Trail when moving distance >= 2 squares
      const fromFile = FILES.indexOf(props.lastMove.from[0] as (typeof FILES)[number])
      const fromRank = RANKS.indexOf(props.lastMove.from[1] as (typeof RANKS)[number])
      const toFile = FILES.indexOf(props.lastMove.to[0] as (typeof FILES)[number])
      const toRank = RANKS.indexOf(props.lastMove.to[1] as (typeof RANKS)[number])
      const chebyshevDist = Math.max(Math.abs(toFile - fromFile), Math.abs(toRank - fromRank))
      const cometTrail =
        chebyshevDist >= 2 && (movedFromPiece || targetAfter)
          ? {
              from: props.lastMove.from,
              to: props.lastMove.to,
              color: (movedFromPiece?.color ?? targetAfter?.color ?? 'w') as Color
            }
          : null

      const g = chessInstance.value
      let stamp: EditorialStampKind | null = null
      if (g.isCheckmate()) stamp = 'SKAKMAT'
      else if (isPromotion) stamp = 'PROMOSI'
      else if (g.isCheck()) stamp = 'SKAK!'

      if ((isCapture || stamp || cometTrail) && cinematicEffects.value && !prefersReducedMotion) {
        effectSeq += 1
        boardEffect.value = {
          id: effectSeq,
          captureSquare: isCapture ? props.lastMove.to : null,
          stamp,
          cometTrail
        }
        if (isCapture) {
          const captureSq = props.lastMove.to
          nextTick(() => triggerNeighborImpactRecoil(captureSq))
        }
      }

      if (!prefersReducedMotion) {
        const fromPos = squareToDisplayCoords(props.lastMove.from)
        const toPos = squareToDisplayCoords(props.lastMove.to)
        animatedSquare.value = props.lastMove.to
        animateOffset.value = {
          x: (fromPos.col - toPos.col) * 100,
          y: (fromPos.row - toPos.row) * 100
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            animateOffset.value = { x: 0, y: 0 }
          })
        })
      } else {
        animatedSquare.value = null
        animateOffset.value = null
      }
    } else {
      animatedSquare.value = null
      animateOffset.value = null
    }

    prevBoardPieces = nextBoardPieces
  }
)

// GSAP Check Tension Glow on outer bezel (skipped cleanly when prefers-reduced-motion is active)
watch(
  checkedKingSquare,
  async (inCheckSq) => {
    if (checkGlowTween) {
      checkGlowTween.kill()
      checkGlowTween = null
    }
    if (!inCheckSq || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    await nextTick()
    if (!checkGlowEl.value) return
    checkGlowTween = gsap.fromTo(
      checkGlowEl.value,
      { opacity: 0.42 },
      {
        opacity: 1,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      }
    )
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (checkGlowTween) {
    checkGlowTween.kill()
    checkGlowTween = null
  }
  for (const tw of recoilTweens) tw.kill()
  recoilTweens = []
})

function canControlPiece(pieceColor: Color): boolean {
  if (!props.interactive || props.squarePickMode) return false
  if (chessInstance.value.turn() !== pieceColor) return false
  if (props.allowedColor !== 'both' && props.allowedColor !== pieceColor) return false
  return true
}

function attemptMove(from: Square, to: Square) {
  const candidates = chessInstance.value
    .moves({ square: from, verbose: true })
    .filter((m) => m.to === to)
  if (candidates.length === 0) return false

  const isPromotion = candidates.some((m) => Boolean(m.promotion))
  if (isPromotion) {
    pendingPromotion.value = {
      from,
      to,
      color: chessInstance.value.turn()
    }
    return true
  }

  emit('move', { from, to })
  selectedSquare.value = null
  return true
}

function choosePromotion(piece: PieceSymbol) {
  if (!pendingPromotion.value) return
  const { from, to } = pendingPromotion.value
  pendingPromotion.value = null
  selectedSquare.value = null
  emit('move', { from, to, promotion: piece })
}

function cancelPromotion() {
  pendingPromotion.value = null
  selectedSquare.value = null
}

function onSquareClick(item: SquareRenderItem) {
  if (!props.interactive || pendingPromotion.value) return

  if (props.squarePickMode) {
    selectedSquare.value = null
    emit('squareClick', item.square)
    return
  }

  if (selectedSquare.value) {
    if (selectedSquare.value === item.square) {
      selectedSquare.value = null
      return
    }
    if (legalTargetSet.value.has(item.square)) {
      attemptMove(selectedSquare.value, item.square)
      return
    }
  }

  if (item.piece && canControlPiece(item.piece.color)) {
    selectedSquare.value = item.square
  } else {
    selectedSquare.value = null
  }
}

function onDragStart(event: DragEvent, item: SquareRenderItem) {
  if (!item.piece || !canControlPiece(item.piece.color)) {
    event.preventDefault()
    return
  }
  dragOrigin.value = item.square
  selectedSquare.value = item.square
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.square)
  }
}

function onDragOver(event: DragEvent, item: SquareRenderItem) {
  if (!dragOrigin.value) return
  if (legalTargetSet.value.has(item.square)) {
    event.preventDefault()
    dragHoverSquare.value = item.square
  }
}

function onDrop(event: DragEvent, item: SquareRenderItem) {
  event.preventDefault()
  const from = dragOrigin.value ?? (event.dataTransfer?.getData('text/plain') as Square | undefined)
  dragOrigin.value = null
  dragHoverSquare.value = null
  if (!from || from === item.square) return
  attemptMove(from, item.square)
}

function onDragEnd() {
  dragOrigin.value = null
  dragHoverSquare.value = null
}

function getPieceStyle(sq: string) {
  if (animatedSquare.value !== sq || !animateOffset.value) return {}
  const { x, y } = animateOffset.value
  if (x === 0 && y === 0) {
    return {
      transform: 'translate3d(0, 0, 0)',
      transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)'
    }
  }
  return {
    transform: `translate3d(${x}%, ${y}%, 0)`,
    transition: 'none'
  }
}
</script>

<template>
  <div
    class="relative w-full max-w-[560px] mx-auto select-none space-y-2"
    :class="{ 'animate-board-shake': shake }"
  >
    <!-- Tactile Editorial Outer Bezel with Inner Top Highlight, Check Tension Glow & Layered Soft Shadow -->
    <div
      class="relative p-1.5 sm:p-2 rounded-[18px] bg-gradient-to-b ring-1 transition-shadow duration-200"
      :class="
        surfaceTone === 'dark'
          ? 'from-[#2C302E] to-[#1D201E] ring-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.45),0_18px_40px_-14px_rgba(0,0,0,0.75)]'
          : 'from-[#ECE7DD] to-[#DDD6C8] dark:from-[#27272D] dark:to-[#19191E] ring-[#202321]/14 dark:ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_5px_rgba(32,35,33,0.07),0_14px_28px_-10px_rgba(32,35,33,0.18),0_28px_54px_-18px_rgba(32,35,33,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.45),0_22px_50px_-12px_rgba(0,0,0,0.75)]'
      "
    >
      <!-- Check Tension Glow border ring (#B85D43 terracotta) -->
      <div
        v-if="checkedKingSquare"
        ref="checkGlowEl"
        aria-hidden="true"
        class="pointer-events-none absolute -inset-[2px] rounded-[20px] border-2 border-[#B85D43] shadow-[0_0_24px_-4px_rgba(184,93,67,0.65)] z-10"
      />
      <div
        class="relative aspect-square w-full rounded-xl overflow-hidden ring-1 ring-[#202321]/18 dark:ring-black/55"
      >
        <div class="grid grid-cols-8 grid-rows-8 w-full h-full">
          <component
            :is="interactive ? 'button' : 'div'"
            v-for="item in squares"
            :key="item.square"
            :type="interactive ? 'button' : undefined"
            :data-square="item.square"
            class="relative w-full h-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#718675] focus-visible:z-30 transition-colors duration-150"
            :class="interactive ? 'cursor-pointer' : 'cursor-default'"
            :style="{
              backgroundColor: item.isLight ? currentBoardPalette.light : currentBoardPalette.dark
            }"
            :aria-label="interactive ? `Petak ${item.square}` : undefined"
            @click="interactive ? onSquareClick(item) : undefined"
            @dragover="interactive ? onDragOver($event, item) : undefined"
            @drop="interactive ? onDrop($event, item) : undefined"
          >
            <!-- Center Control Map overlay (d4, e4, d5, e5) -->
            <span
              v-if="showCenterControl && centerControlMap[item.square]"
              class="absolute inset-0 pointer-events-none transition-colors duration-250"
              :class="{
                'bg-[#718675]/45 ring-inset ring-2 ring-[#4E6954]/85':
                  centerControlMap[item.square]?.leader === 'w',
                'bg-[#C26D53]/42 ring-inset ring-2 ring-[#A94E35]/85':
                  centerControlMap[item.square]?.leader === 'b',
                'bg-amber-400/28 ring-inset ring-2 ring-amber-600/65':
                  centerControlMap[item.square]?.leader === 'equal',
                'ring-inset ring-1 ring-dashed ring-zinc-700/35':
                  centerControlMap[item.square]?.leader === 'none'
              }"
            />

            <!-- Center Control W:B score micro-pill -->
            <span
              v-if="showCenterControl && centerControlMap[item.square]"
              class="absolute top-0.5 right-0.5 z-30 px-1 py-[1px] rounded text-[8px] sm:text-[9px] font-mono font-bold leading-none pointer-events-none shadow-xs"
              :class="{
                'bg-[#202321]/85 text-[#F7F5F0]': centerControlMap[item.square]?.leader === 'b',
                'bg-[#F7F5F0]/92 text-[#202321] ring-1 ring-[#718675]/60':
                  centerControlMap[item.square]?.leader === 'w',
                'bg-amber-100/95 text-amber-950': centerControlMap[item.square]?.leader === 'equal',
                'bg-white/70 text-zinc-600': centerControlMap[item.square]?.leader === 'none'
              }"
            >
              {{ centerControlMap[item.square]?.white }}:{{ centerControlMap[item.square]?.black }}
            </span>

            <!-- Last move warm ochre tint -->
            <span
              v-if="lastMove && (lastMove.from === item.square || lastMove.to === item.square)"
              class="absolute inset-0 bg-[#E6C25A]/40 pointer-events-none"
            />

            <!-- Selected square highlight -->
            <span
              v-if="selectedSquare === item.square"
              class="absolute inset-0 bg-[#5D7463]/40 dark:bg-[#8BA893]/45 pointer-events-none"
            />

            <!-- Correct move emerald glow -->
            <span
              v-if="correctSquare === item.square"
              class="absolute inset-0 bg-emerald-500/35 ring-inset ring-2 ring-emerald-600/80 pointer-events-none"
            />

            <!-- Mistake terracotta highlight -->
            <span
              v-if="errorSquare === item.square"
              class="absolute inset-0 bg-[#B85D43]/40 ring-inset ring-2 ring-[#B85D43] pointer-events-none"
            />

            <!-- Adaptive Lens: Hanging / under-defended piece alert frame (Apprentice) -->
            <span
              v-if="hangingSquareSet.has(item.square)"
              class="absolute inset-0 bg-[#B85D43]/22 ring-inset ring-2 ring-[#B85D43]/90 pointer-events-none"
              aria-hidden="true"
            >
              <span
                class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#B85D43] ring-1 ring-white/85"
              />
            </span>

            <!-- Adaptive Lens: Structural / capture tension corner brackets (Apprentice & Club) -->
            <span
              v-else-if="tensionSquareSet.has(item.square)"
              class="absolute inset-1 border border-dashed border-[#8C6D23]/75 dark:border-[#E6C25A]/75 rounded-[3px] pointer-events-none"
              aria-hidden="true"
            />

            <!-- Hint origin ring -->
            <span
              v-if="hintFrom === item.square"
              class="absolute inset-0 animate-hint-ring pointer-events-none"
            />

            <!-- Hint destination marker -->
            <span
              v-if="hintTo === item.square"
              class="absolute inset-1.5 rounded-full border-2 border-dashed border-[#718675] pointer-events-none"
            />

            <!-- Drag hover frame -->
            <span
              v-if="dragHoverSquare === item.square"
              class="absolute inset-0 ring-inset ring-3 ring-zinc-900/35 pointer-events-none"
            />

            <!-- Checked King subtle crimson radial glow -->
            <span
              v-if="checkedKingSquare === item.square"
              class="absolute inset-0 pointer-events-none"
              style="background: radial-gradient(circle, rgba(220,38,38,0.62) 0%, rgba(220,38,38,0.18) 62%, transparent 80%)"
            />

            <!-- Rank coordinate (left edge) -->
            <span
              v-if="item.showRankLabel && !hideCoordinates"
              class="absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-mono font-semibold leading-none pointer-events-none"
              :style="{
                color: item.isLight ? currentBoardPalette.coordOnLight : currentBoardPalette.coordOnDark
              }"
              aria-hidden="true"
            >
              {{ item.rank }}
            </span>

            <!-- File coordinate (bottom edge) -->
            <span
              v-if="item.showFileLabel && !hideCoordinates"
              class="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-mono font-semibold leading-none pointer-events-none"
              :style="{
                color: item.isLight ? currentBoardPalette.coordOnLight : currentBoardPalette.coordOnDark
              }"
              aria-hidden="true"
            >
              {{ item.file }}
            </span>

            <!-- Legal move indicator (empty square dot) -->
            <span
              v-if="legalTargetSet.has(item.square) && !item.piece"
              class="w-[28%] h-[28%] rounded-full bg-zinc-900/22 dark:bg-zinc-950/32 pointer-events-none z-10"
            />

            <!-- Legal move capture indicator (ring around enemy piece) -->
            <span
              v-if="legalTargetSet.has(item.square) && item.piece"
              class="absolute inset-[6%] rounded-full border-[3.5px] sm:border-[4px] border-zinc-900/28 pointer-events-none z-10"
            />

            <!-- Move Classification Badge (Game Review overlay on destination square) -->
            <span
              v-if="moveBadge && moveBadge.square === item.square && !showCenterControl"
              class="absolute top-0.5 right-0.5 z-30 pointer-events-none"
            >
              <MoveClassificationBadge
                :classification="moveBadge.classification"
                size="sm"
                ring
              />
            </span>

            <!-- Piece -->
            <div
              v-if="item.piece"
              :ref="
                (el) => {
                  if (el) pieceDomMap.set(item.square, el as HTMLElement)
                  else pieceDomMap.delete(item.square)
                }
              "
              class="relative w-[84%] h-[84%] z-20 flex items-center justify-center"
              :class="canControlPiece(item.piece.color) ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'"
              :draggable="canControlPiece(item.piece.color)"
              :style="getPieceStyle(item.square)"
              @dragstart="onDragStart($event, item)"
              @dragend="onDragEnd"
            >
              <ChessPiece :type="item.piece.type" :color="item.piece.color" />
            </div>
          </component>
        </div>

        <!-- Tactical SVG Arrow Overlay -->
        <TacticalArrowOverlay :arrows="effectiveArrows" :orientation="orientation" />

        <!-- GSAP Cosmic Signature Effects Layer -->
        <BoardEffectsLayer
          :effect="boardEffect"
          :orientation="orientation"
          :sightlines="constellationSightlines"
          :checked-king-square="checkedKingSquare"
        />

        <!-- Pawn Promotion Picker Overlay -->
        <div
          v-if="pendingPromotion"
          class="absolute inset-0 z-30 bg-zinc-950/55 flex items-center justify-center p-4"
          @click.self="cancelPromotion"
        >
          <div
            class="bg-[#F8F7F4] dark:bg-[#1A1A1E] border border-[#E4DFD5] dark:border-zinc-700 rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_20px_40px_-14px_rgba(0,0,0,0.45)] max-w-xs w-full text-center"
          >
            <p class="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Pilih Perwira Promosi
            </p>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="p in (['q', 'r', 'b', 'n'] as PieceSymbol[])"
                :key="p"
                type="button"
                class="aspect-square rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#718675] hover:bg-[#EDEAE0]/50 dark:hover:bg-zinc-700 active:scale-[0.95] p-2 transition flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
                :aria-label="`Promosi ke ${p.toUpperCase()}`"
                @click="choosePromotion(p)"
              >
                <ChessPiece :type="p" :color="pendingPromotion.color" />
              </button>
            </div>
            <button
              type="button"
              class="mt-3 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 underline cursor-pointer"
              @click="cancelPromotion"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Optional Center Control Map Toggle Strip -->
    <div
      v-if="showCenterControlToggle"
      class="flex flex-wrap items-center justify-between gap-2 px-1"
    >
      <button
        type="button"
        class="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
        :aria-pressed="showCenterControl"
        :class="
          surfaceTone === 'dark'
            ? showCenterControl
              ? 'bg-[#718675]/28 text-[#D7E8DA] border-[#8FA894]/55'
              : 'bg-white/[0.06] text-zinc-200 border-white/12 hover:border-[#8FA894]/60 hover:bg-white/[0.11]'
            : showCenterControl
              ? 'bg-[#718675]/15 text-[#3B4E3F] dark:text-[#B8CEBC] border-[#718675]/55'
              : 'bg-white/85 dark:bg-zinc-900/75 text-zinc-700 dark:text-zinc-300 border-[#E4DFD5] dark:border-zinc-800 hover:border-[#718675]'
        "
        @click="showCenterControl = !showCenterControl"
      >
        <Crosshair class="w-3.5 h-3.5" aria-hidden="true" />
        <span>Peta Kontrol Pusat</span>
      </button>

      <div
        v-if="showCenterControl"
        class="flex items-center gap-2.5 text-[10px] font-mono"
        :class="surfaceTone === 'dark' ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'"
      >
        <span class="inline-flex items-center gap-1">
          <span class="w-2 h-2 rounded-xs bg-[#718675]" />
          Putih
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2 h-2 rounded-xs bg-[#C26D53]" />
          Hitam
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2 h-2 rounded-xs bg-amber-400" />
          Imbang
        </span>
      </div>
    </div>
  </div>
</template>
