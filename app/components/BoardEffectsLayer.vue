<script setup lang="ts">
import type { Color } from 'chess.js'
import gsap from 'gsap'

export type EditorialStampKind = 'SKAK!' | 'SKAKMAT' | 'PROMOSI'

export interface ConstellationSightline {
  from: string
  to: string
  kind: 'attack' | 'defend'
}

export interface BoardEffectEvent {
  id: number
  captureSquare?: string | null
  stamp?: EditorialStampKind | null
  cometTrail?: {
    from: string
    to: string
    color: Color
  } | null
}

interface BurstParticle {
  key: string
  dx: number
  dy: number
  rot: number
  scale: number
  color: string
  shape: 'diamond' | 'square' | 'shard' | 'star' | 'heart'
}

const props = withDefaults(
  defineProps<{
    effect?: BoardEffectEvent | null
    orientation?: Color
    sightlines?: ConstellationSightline[]
    checkedKingSquare?: string | null
  }>(),
  {
    effect: null,
    orientation: 'w',
    sightlines: () => [],
    checkedKingSquare: null
  }
)

const { pieceSet, cinematicEffects } = useTheme()

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

const CLASSIC_COLORS = ['#718675', '#C9A45C', '#EDEAE0', '#526857', '#DFC178'] as const
const ANIMAL_COLORS = ['#F4A7B9', '#F6D574', '#9ED3B4', '#A9C6F2', '#F5B796'] as const

// Capture burst & concentric ripple state
const burstOrigin = ref<{ left: string; top: string } | null>(null)
const burstParticles = ref<BurstParticle[]>([])
const particleEls = ref<HTMLElement[]>([])
const rippleOrigin = ref<{ left: string; top: string } | null>(null)
const rippleOuterEl = ref<HTMLElement | null>(null)
const rippleInnerEl = ref<HTMLElement | null>(null)

// Comet ink trail state
const activeComet = ref<{
  key: number
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
} | null>(null)
const cometGroupEl = ref<SVGGElement | null>(null)

// Editorial stamp state
const activeStamp = ref<EditorialStampKind | null>(null)
const stampEl = ref<HTMLElement | null>(null)

// Check spotlight ref
const spotlightEl = ref<HTMLElement | null>(null)

let stampTimeline: gsap.core.Timeline | null = null
let cometTween: gsap.core.Tween | null = null
let rippleTweens: gsap.core.Tween[] = []
let burstTweens: gsap.core.Tween[] = []
let spotlightTween: gsap.core.Tween | null = null

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function canRunCinematicGsap(): boolean {
  return cinematicEffects.value && !prefersReducedMotion()
}

function squareToViewBoxCoords(square: string): { x: number; y: number } {
  const fileIdx = FILES.indexOf(square[0] as (typeof FILES)[number])
  const rankIdx = RANKS.indexOf(square[1] as (typeof RANKS)[number])
  if (fileIdx < 0 || rankIdx < 0) return { x: 50, y: 50 }

  const displayCol = props.orientation === 'w' ? fileIdx : 7 - fileIdx
  const displayRow = props.orientation === 'w' ? rankIdx : 7 - rankIdx

  return {
    x: (displayCol + 0.5) * 12.5,
    y: (displayRow + 0.5) * 12.5
  }
}

function squareToPercentCenter(square: string): { left: string; top: string } {
  const pt = squareToViewBoxCoords(square)
  return {
    left: `${pt.x}%`,
    top: `${pt.y}%`
  }
}

// Computed constellation SVG geometry (Tactile Editorial sage/terracotta)
const renderedSightlines = computed(() => {
  if (!cinematicEffects.value || props.sightlines.length === 0) return []
  return props.sightlines.map((line, idx) => {
    const a = squareToViewBoxCoords(line.from)
    const b = squareToViewBoxCoords(line.to)
    return {
      key: `${line.from}-${line.to}-${idx}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      stroke: line.kind === 'attack' ? '#B85D43' : '#526857',
      kind: line.kind
    }
  })
})

// Computed Check Spotlight radial gradient style
const checkSpotlightStyle = computed(() => {
  if (!props.checkedKingSquare || !cinematicEffects.value) return null
  const pt = squareToViewBoxCoords(props.checkedKingSquare)
  return {
    background: `radial-gradient(circle 13% at ${pt.x}% ${pt.y}%, transparent 0%, rgba(184, 93, 67, 0.14) 55%, rgba(24, 24, 27, 0.28) 100%)`
  }
})

function killActiveEffects() {
  for (const tw of burstTweens) tw.kill()
  burstTweens = []
  for (const tw of rippleTweens) tw.kill()
  rippleTweens = []
  if (cometTween) {
    cometTween.kill()
    cometTween = null
  }
  if (stampTimeline) {
    stampTimeline.kill()
    stampTimeline = null
  }
  if (spotlightTween) {
    spotlightTween.kill()
    spotlightTween = null
  }
}

async function playCometTrail(from: string, to: string, color: Color, eventId: number) {
  if (!canRunCinematicGsap()) return
  if (cometTween) {
    cometTween.kill()
    cometTween = null
  }

  const a = squareToViewBoxCoords(from)
  const b = squareToViewBoxCoords(to)
  activeComet.value = {
    key: eventId,
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
    color: color === 'w' ? '#718675' : '#B85D43'
  }

  await nextTick()
  if (!cometGroupEl.value) return

  cometTween = gsap.fromTo(
    cometGroupEl.value,
    { opacity: 0.92 },
    {
      opacity: 0,
      duration: 0.42,
      ease: 'power2.out',
      onComplete: () => {
        if (activeComet.value?.key === eventId) {
          activeComet.value = null
        }
      }
    }
  )
}

async function playCaptureBurstAndRipple(square: string, eventId: number) {
  if (!canRunCinematicGsap()) return

  for (const tw of burstTweens) tw.kill()
  burstTweens = []
  for (const tw of rippleTweens) tw.kill()
  rippleTweens = []

  const origin = squareToPercentCenter(square)
  rippleOrigin.value = origin

  const isAnimal = pieceSet.value === 'animal'
  const count = 10
  const palette = isAnimal ? ANIMAL_COLORS : CLASSIC_COLORS
  const shapes: BurstParticle['shape'][] = isAnimal
    ? ['star', 'heart']
    : ['diamond', 'square', 'shard']

  const list: BurstParticle[] = []
  for (let i = 0; i < count; i++) {
    const baseAngle = (Math.PI * 2 * i) / count
    const jitter = (Math.random() - 0.5) * 0.45
    const angle = baseAngle + jitter
    const dist = 22 + Math.random() * 34
    list.push({
      key: `${eventId}-${i}`,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      rot: (Math.random() - 0.5) * 260,
      scale: 0.75 + Math.random() * 0.45,
      color: palette[i % palette.length]!,
      shape: shapes[i % shapes.length]!
    })
  }

  burstOrigin.value = origin
  burstParticles.value = list
  particleEls.value = []

  await nextTick()

  // 1. Concentric tactile impact ripples
  if (rippleOuterEl.value) {
    rippleTweens.push(
      gsap.fromTo(
        rippleOuterEl.value,
        { scale: 0.25, opacity: 0.9 },
        {
          scale: 2.1,
          opacity: 0,
          duration: 0.44,
          ease: 'power2.out',
          onComplete: () => {
            if (props.effect?.id === eventId) rippleOrigin.value = null
          }
        }
      )
    )
  }
  if (rippleInnerEl.value) {
    rippleTweens.push(
      gsap.fromTo(
        rippleInnerEl.value,
        { scale: 0.2, opacity: 0.8 },
        {
          scale: 1.45,
          opacity: 0,
          duration: 0.34,
          delay: 0.05,
          ease: 'power2.out'
        }
      )
    )
  }

  // 2. Adaptive micro-particle burst
  const nodes = particleEls.value
  let finished = 0
  nodes.forEach((el, idx) => {
    const p = list[idx]
    if (!p || !el) return
    const tween = gsap.fromTo(
      el,
      { x: 0, y: 0, scale: 0.3, opacity: 1, rotation: 0 },
      {
        x: p.dx,
        y: p.dy,
        scale: p.scale,
        opacity: 0,
        rotation: p.rot,
        duration: 0.54 + (idx % 3) * 0.06,
        ease: 'power3.out',
        onComplete: () => {
          finished += 1
          if (finished >= nodes.length && props.effect?.id === eventId) {
            burstParticles.value = []
          }
        }
      }
    )
    burstTweens.push(tween)
  })
}

async function playEditorialStamp(kind: EditorialStampKind, eventId: number) {
  if (!canRunCinematicGsap()) return

  if (stampTimeline) {
    stampTimeline.kill()
    stampTimeline = null
  }

  activeStamp.value = kind
  await nextTick()

  if (!stampEl.value) return

  const holdDuration = kind === 'SKAKMAT' ? 1.1 : 0.7
  stampTimeline = gsap.timeline({
    onComplete: () => {
      if (props.effect?.id === eventId) {
        activeStamp.value = null
      }
    }
  })

  stampTimeline
    .fromTo(
      stampEl.value,
      { opacity: 0, scale: 0.76, y: 12, rotation: -3 },
      { opacity: 1, scale: 1, y: 0, rotation: 0, duration: 0.24, ease: 'back.out(1.7)' }
    )
    .to(stampEl.value, {
      opacity: 0,
      scale: 1.05,
      y: -14,
      duration: 0.32,
      delay: holdDuration,
      ease: 'power2.in'
    })
}

watch(
  () => props.effect,
  (ev) => {
    if (!ev || !canRunCinematicGsap()) return
    if (ev.cometTrail) {
      playCometTrail(ev.cometTrail.from, ev.cometTrail.to, ev.cometTrail.color, ev.id)
    }
    if (ev.captureSquare) {
      playCaptureBurstAndRipple(ev.captureSquare, ev.id)
    }
    if (ev.stamp) {
      playEditorialStamp(ev.stamp, ev.id)
    }
  }
)

watch(
  () => [props.checkedKingSquare, cinematicEffects.value],
  async ([sq, enabled]) => {
    if (spotlightTween) {
      spotlightTween.kill()
      spotlightTween = null
    }
    if (!sq || !enabled || prefersReducedMotion()) return
    await nextTick()
    if (!spotlightEl.value) return
    spotlightTween = gsap.fromTo(
      spotlightEl.value,
      { opacity: 0 },
      { opacity: 1, duration: 0.28, ease: 'power2.out' }
    )
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  killActiveEffects()
})
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none"
    aria-hidden="true"
  >
    <!-- 4. Check Spotlight Drama (radial cosmic vignette spotlighting the checked King) -->
    <div
      v-if="checkSpotlightStyle"
      ref="spotlightEl"
      class="absolute inset-0 transition-opacity duration-200"
      :style="checkSpotlightStyle"
    />

    <!-- SVG Overlay for Constellation Sightlines + Comet Ink Trail -->
    <svg
      v-if="renderedSightlines.length > 0 || activeComet"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      class="absolute inset-0 w-full h-full"
    >
      <defs>
        <linearGradient
          v-if="activeComet"
          :id="`comet-grad-${activeComet.key}`"
          gradientUnits="userSpaceOnUse"
          :x1="activeComet.x1"
          :y1="activeComet.y1"
          :x2="activeComet.x2"
          :y2="activeComet.y2"
        >
          <stop offset="0%" :stop-color="activeComet.color" stop-opacity="0.04" />
          <stop offset="55%" :stop-color="activeComet.color" stop-opacity="0.45" />
          <stop offset="100%" :stop-color="activeComet.color" stop-opacity="0.88" />
        </linearGradient>
      </defs>

      <!-- 3. Constellation Sightlines (attack = #F26B5B, defend = #4ECDC4) -->
      <g v-if="renderedSightlines.length > 0">
        <g v-for="line in renderedSightlines" :key="line.key">
          <line
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            :stroke="line.stroke"
            stroke-width="0.95"
            stroke-dasharray="2.4 2.2"
            stroke-linecap="round"
            opacity="0.88"
          />
          <circle
            :cx="line.x2"
            :cy="line.y2"
            :r="line.kind === 'attack' ? 2.2 : 1.7"
            :fill="line.kind === 'attack' ? 'none' : line.stroke"
            :stroke="line.stroke"
            stroke-width="0.85"
            opacity="0.9"
          />
        </g>
      </g>

      <!-- 1. Comet Ink Trail (distance >= 2 squares, fades over 420ms via GSAP) -->
      <g v-if="activeComet" ref="cometGroupEl">
        <line
          :x1="activeComet.x1"
          :y1="activeComet.y1"
          :x2="activeComet.x2"
          :y2="activeComet.y2"
          :stroke="`url(#comet-grad-${activeComet.key})`"
          stroke-width="4.4"
          stroke-linecap="round"
        />
        <line
          :x1="activeComet.x1"
          :y1="activeComet.y1"
          :x2="activeComet.x2"
          :y2="activeComet.y2"
          stroke="#FAF8F5"
          stroke-width="1.2"
          stroke-linecap="round"
          opacity="0.65"
        />
        <circle
          :cx="activeComet.x2"
          :cy="activeComet.y2"
          r="2.4"
          :fill="activeComet.color"
          opacity="0.8"
        />
      </g>
    </svg>

    <!-- 2a. Concentric Impact Ripple Rings on Capture -->
    <div
      v-if="rippleOrigin"
      class="absolute"
      :style="{ left: rippleOrigin.left, top: rippleOrigin.top }"
    >
      <span
        ref="rippleOuterEl"
        class="block w-12 h-12 -ml-6 -mt-6 rounded-full border-2 border-[#B85D43]/80 will-change-transform"
      />
      <span
        ref="rippleInnerEl"
        class="block w-10 h-10 -ml-5 -mt-11 rounded-full border border-[#C9A45C]/85 will-change-transform"
      />
    </div>

    <!-- 2b. Adaptive Capture Micro-Particle Burst -->
    <div
      v-if="burstOrigin && burstParticles.length > 0"
      class="absolute"
      :style="{ left: burstOrigin.left, top: burstOrigin.top }"
    >
      <div
        v-for="(p, idx) in burstParticles"
        :key="p.key"
        :ref="
          (el) => {
            if (el) particleEls[idx] = el as HTMLElement
          }
        "
        class="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform"
      >
        <span
          v-if="p.shape === 'diamond'"
          class="block w-2.5 h-2.5 rotate-45 shadow-xs"
          :style="{ backgroundColor: p.color }"
        />
        <span
          v-else-if="p.shape === 'square'"
          class="block w-2 h-2 rounded-[2px] shadow-xs"
          :style="{ backgroundColor: p.color }"
        />
        <span
          v-else-if="p.shape === 'shard'"
          class="block w-1.5 h-3.5 rounded-full"
          :style="{ backgroundColor: p.color }"
        />
        <svg
          v-else-if="p.shape === 'star'"
          viewBox="0 0 20 20"
          class="w-3.5 h-3.5 drop-shadow-xs"
          :fill="p.color"
        >
          <path d="M10 1.5l2.5 5.1 5.6.8-4.1 4 1 5.6L10 14.3 5 17l1-5.6-4.1-4 5.6-.8L10 1.5z" />
        </svg>
        <svg
          v-else
          viewBox="0 0 20 20"
          class="w-3.5 h-3.5 drop-shadow-xs"
          :fill="p.color"
        >
          <path
            d="M10 17.2l-1.2-1.1C4.5 12.2 2 9.9 2 6.9 2 4.6 3.8 2.8 6.1 2.8c1.4 0 2.8.7 3.9 1.8 1.1-1.1 2.5-1.8 3.9-1.8 2.3 0 4.1 1.8 4.1 4.1 0 3-2.5 5.3-6.8 9.2L10 17.2z"
          />
        </svg>
      </div>
    </div>

    <!-- Editorial Typography Stamp (SKAK! / SKAKMAT / PROMOSI) -->
    <div
      v-if="activeStamp"
      class="absolute inset-0 flex items-center justify-center p-4"
    >
      <div
        ref="stampEl"
        class="px-5 py-2 rounded-xl border-2 backdrop-blur-[2px] shadow-2xl will-change-transform"
        :class="
          activeStamp === 'SKAKMAT'
            ? 'bg-[#181A19]/92 border-[#D4B064] text-[#F7F5F0]'
            : activeStamp === 'PROMOSI'
              ? 'bg-[#1E2B22]/92 border-[#8FA894] text-[#F7F5F0]'
              : 'bg-[#261815]/92 border-[#D9846A] text-[#FDF6F3]'
        "
      >
        <span class="block font-serif text-xl sm:text-2xl font-bold tracking-[0.18em] uppercase">
          {{ activeStamp }}
        </span>
      </div>
    </div>
  </div>
</template>
