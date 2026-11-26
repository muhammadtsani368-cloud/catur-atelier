<script setup lang="ts">
import { ArrowUpRight, Radar, Sparkles, Swords } from 'lucide-vue-next'
import { computePlayerDnaProfile, type MatchSummaryInput } from '~/utils/playerDnaEngine'
import { getAtelierProfileHeaders } from '~/utils/profileId'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  { embedded: false }
)

const { progress } = useChessProgress()

const recentMatches = ref<MatchSummaryInput[]>([])
const loadingMatches = ref(false)

onMounted(async () => {
  loadingMatches.value = true
  try {
    const res = await $fetch<{ ok: boolean; matches?: MatchSummaryInput[] }>('/api/matches', {
      headers: getAtelierProfileHeaders()
    })
    if (res?.ok && Array.isArray(res.matches)) {
      recentMatches.value = res.matches
    }
  } catch {
    // Offline-safe fallback
  } finally {
    loadingMatches.value = false
  }
})

const dna = computed(() => computePlayerDnaProfile(progress.value, recentMatches.value))

// Pentagon SVG geometry (center 130, 125; max radius 84)
const CX = 130
const CY = 125
const MAX_R = 82

function polarPoint(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle)
  }
}

const ringPolygons = computed(() => {
  const levels = [0.25, 0.5, 0.75, 1]
  return levels.map((ratio) =>
    dna.value.axes
      .map((_, i) => {
        const pt = polarPoint(i, dna.value.axes.length, MAX_R * ratio)
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
      })
      .join(' ')
  )
})

const axisSpokes = computed(() =>
  dna.value.axes.map((axis, i) => {
    const outer = polarPoint(i, dna.value.axes.length, MAX_R)
    const label = polarPoint(i, dna.value.axes.length, MAX_R + 22)
    const data = polarPoint(i, dna.value.axes.length, (axis.score / 100) * MAX_R)
    return { axis, outer, label, data }
  })
)

const dataPolygonPoints = computed(() =>
  axisSpokes.value.map((s) => `${s.data.x.toFixed(1)},${s.data.y.toFixed(1)}`).join(' ')
)
</script>

<template>
  <section
    :class="
      props.embedded
        ? 'space-y-5'
        : 'rounded-3xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 sm:p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_34px_-22px_rgba(32,35,33,0.16)] dark:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.65)] space-y-6'
    "
    aria-label="Radar DNA Gaya Bermain"
  >
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em] font-semibold bg-[#526857]/12 text-[#3B5240] dark:bg-[#718675]/20 dark:text-[#B8D4BE]"
          >
            <Radar class="w-3 h-3" aria-hidden="true" />
            <span>DNA Gaya Bermain</span>
          </span>
          <span class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            {{ loadingMatches ? 'Menyelaraskan riwayat...' : dna.sampleSizeLabel }}
          </span>
        </div>
        <h2 class="font-serif text-2xl sm:text-[26px] font-semibold text-[#202321] dark:text-zinc-50 mt-2">
          {{ dna.archetypeName }}
        </h2>
        <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
          {{ dna.archetypeTagline }}
        </p>
      </div>

      <NuxtLink
        to="/play"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E4DFD5] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-900 text-[#202321] dark:text-zinc-200 hover:border-[#718675] transition shrink-0"
      >
        <Swords class="w-3.5 h-3.5 text-[#526857] dark:text-[#9DB5A1]" />
        <span>Tantang Bot Sekarang</span>
      </NuxtLink>
    </div>

    <!-- Main 2-Column Layout: SVG Radar + 3 Prescriptions -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      <!-- Radar Pentagon Chart + Axis Bars -->
      <div class="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-center gap-4">
        <div
          class="w-full max-w-[260px] rounded-2xl border border-[#E8E4DC] dark:border-zinc-800 bg-[#F7F5F0]/70 dark:bg-[#121214] p-3 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 260 250"
            class="w-full h-auto overflow-visible"
            role="img"
            :aria-label="`Radar gaya bermain: ${dna.archetypeName}`"
          >
            <!-- Concentric pentagon grid -->
            <polygon
              v-for="(pts, idx) in ringPolygons"
              :key="idx"
              :points="pts"
              fill="none"
              class="stroke-[#D8D2C5] dark:stroke-zinc-800"
              stroke-width="1"
            />

            <!-- Spokes -->
            <line
              v-for="spoke in axisSpokes"
              :key="`spoke-${spoke.axis.key}`"
              :x1="CX"
              :y1="CY"
              :x2="spoke.outer.x"
              :y2="spoke.outer.y"
              class="stroke-[#D8D2C5] dark:stroke-zinc-800"
              stroke-width="1"
            />

            <!-- Player DNA Polygon -->
            <polygon
              :points="dataPolygonPoints"
              fill="rgba(82, 104, 87, 0.28)"
              stroke="#526857"
              stroke-width="2.2"
              stroke-linejoin="round"
            />

            <!-- Peak dots & Labels -->
            <g v-for="spoke in axisSpokes" :key="`pt-${spoke.axis.key}`">
              <circle
                :cx="spoke.data.x"
                :cy="spoke.data.y"
                r="4"
                :fill="spoke.axis.key === dna.strongestAxis.key ? '#C59B46' : '#526857'"
                class="stroke-white dark:stroke-[#121214]"
                stroke-width="1.6"
              />
              <text
                :x="spoke.label.x"
                :y="spoke.label.y - 4"
                text-anchor="middle"
                class="fill-[#202321] dark:fill-zinc-200 text-[9.5px] font-mono font-semibold"
              >
                {{ spoke.axis.shortLabel }}
              </text>
              <text
                :x="spoke.label.x"
                :y="spoke.label.y + 8"
                text-anchor="middle"
                class="fill-[#526857] dark:fill-[#A4CBB3] text-[9px] font-mono font-bold"
              >
                {{ spoke.axis.score }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Strongest vs Focus Summary Pills -->
        <div class="w-full grid grid-cols-2 gap-2.5 text-xs">
          <div class="rounded-xl border border-[#526857]/30 bg-[#526857]/8 dark:bg-[#526857]/15 p-2.5">
            <span class="font-mono text-[10px] uppercase tracking-wider text-[#495C4D] dark:text-[#A4CBB3]">
              Kekuatan Utama
            </span>
            <p class="font-semibold text-[#202321] dark:text-zinc-100 mt-0.5">
              {{ dna.strongestAxis.label }} ({{ dna.strongestAxis.score }})
            </p>
          </div>
          <div class="rounded-xl border border-[#C59B46]/35 bg-[#C59B46]/10 dark:bg-[#C59B46]/12 p-2.5">
            <span class="font-mono text-[10px] uppercase tracking-wider text-[#8C6A1F] dark:text-[#E7C878]">
              Fokus Berikutnya
            </span>
            <p class="font-semibold text-[#202321] dark:text-zinc-100 mt-0.5">
              {{ dna.focusAxis.label }} ({{ dna.focusAxis.score }})
            </p>
          </div>
        </div>
      </div>

      <!-- 3 Personalized 1-Click Prescriptions -->
      <div class="lg:col-span-7 space-y-3">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <Sparkles class="w-3.5 h-3.5 text-[#C59B46]" aria-hidden="true" />
          <span>Resep Latihan Otomatis untukmu</span>
        </div>

        <div class="space-y-2.5">
          <NuxtLink
            v-for="rx in dna.prescriptions"
            :key="rx.id"
            :to="rx.to"
            class="group flex items-center justify-between gap-3 rounded-2xl border border-[#E8E4DC] dark:border-zinc-800 bg-[#F7F5F0]/75 dark:bg-zinc-900/70 hover:border-[#718675] hover:bg-[#EFECE4]/80 dark:hover:bg-zinc-800/80 p-3.5 transition-all"
          >
            <div class="min-w-0 space-y-0.5">
              <span class="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-[#526857] dark:text-[#A4CBB3]">
                {{ rx.category }}
              </span>
              <h3 class="font-serif text-base font-semibold text-[#202321] dark:text-zinc-100">
                {{ rx.title }}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {{ rx.reason }}
              </p>
            </div>

            <span
              class="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] group-hover:bg-[#526857] group-hover:text-white transition"
            >
              <span>{{ rx.actionLabel }}</span>
              <ArrowUpRight class="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
