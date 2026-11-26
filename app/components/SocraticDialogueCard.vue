<script setup lang="ts">
import { ChevronDown, ChevronUp, GitBranch, HelpCircle, Undo2 } from 'lucide-vue-next'
import type { AdaptiveLensId } from '~/utils/adaptiveLensEngine'
import type { AnalyzedMove } from '~/utils/gameReviewEngine'
import { generateSocraticReview } from '~/utils/socraticCoachEngine'

const props = defineProps<{
  move: AnalyzedMove
  lens: AdaptiveLensId
  whatIfActive: boolean
  humanSide?: 'w' | 'b'
}>()

const emit = defineEmits<{
  launchWhatIf: [candidateSan?: string]
  rewindToHumanTurn: []
}>()

const showDeepExplanation = ref(true)

const insight = computed(() => generateSocraticReview(props.move, props.lens, props.humanSide))
const isHumanMove = computed(() => (props.humanSide ? props.move.color === props.humanSide : true))

const isErrorMove = computed(
  () =>
    props.move.classification === 'blunder' ||
    props.move.classification === 'mistake' ||
    props.move.classification === 'miss' ||
    props.move.classification === 'inaccuracy'
)

watch(
  () => props.move.ply,
  () => {
    showDeepExplanation.value = props.lens === 'apprentice' || !isErrorMove.value
  },
  { immediate: true }
)
</script>

<template>
  <section
    aria-label="Dialog Pelatih Sokratik"
    class="rounded-xl border p-3.5 space-y-2.5 transition-colors"
    :class="
      isErrorMove || insight.suggestRewindToHumanTurn
        ? 'border-[#B85D43]/45 bg-[#2E2624]'
        : 'border-[#718675]/40 bg-[#262C27]'
    "
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-1.5 flex-wrap">
        <HelpCircle
          class="w-4 h-4 shrink-0"
          :class="isErrorMove || insight.suggestRewindToHumanTurn ? 'text-[#E59A85]' : 'text-[#A8C6AF]'"
          aria-hidden="true"
        />
        <h4 class="text-xs font-bold text-[#F4F3EE]">
          Refleksi Pelatih Sokratik
        </h4>
        <span
          class="text-[11px] font-semibold px-2 py-0.5 rounded border"
          :class="isHumanMove ? 'border-[#9FC0A8]/45 bg-[#718675]/20 text-[#DCEBDD]' : 'border-white/15 bg-white/8 text-zinc-200'"
        >
          {{ isHumanMove ? 'Langkahmu' : 'Langkah Lawan' }}
        </span>
      </div>
      <span
        v-if="insight.opponentThreatSan"
        class="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#B85D43]/25 text-[#F6CEC2] border border-[#B85D43]/40 shrink-0"
      >
        Ancaman: {{ insight.opponentThreatSan }}
      </span>
    </div>

    <!-- Socratic Question -->
    <p class="text-xs font-medium text-[#F4F3EE] leading-relaxed">
      {{ insight.socraticQuestion }}
    </p>

    <!-- Toggle Causal Answer -->
    <div>
      <button
        type="button"
        class="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer"
        :class="
          showDeepExplanation
            ? 'border-white/15 bg-white/8 text-zinc-200 hover:bg-white/14'
            : 'border-[#9FC0A8]/45 bg-[#718675]/25 text-[#E5F2E8] hover:bg-[#718675]/35'
        "
        :aria-expanded="showDeepExplanation"
        @click="showDeepExplanation = !showDeepExplanation"
      >
        <span>{{ showDeepExplanation ? 'Sembunyikan Penjelasan' : 'Buka Penjelasan' }}</span>
        <ChevronUp v-if="showDeepExplanation" class="w-3.5 h-3.5" aria-hidden="true" />
        <ChevronDown v-else class="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>

    <div v-if="showDeepExplanation" class="space-y-2 pt-1 border-t border-white/10">
      <p class="text-xs text-zinc-200 leading-relaxed">
        {{ insight.humanExplanation }}
      </p>
      <p class="text-xs text-[#CBE0D0] leading-relaxed font-medium">
        {{ insight.bestPlanNarrative }}
      </p>
      <p class="text-[11px] text-zinc-300 leading-relaxed bg-black/20 rounded-lg px-2.5 py-2 border border-white/8">
        {{ insight.lensNote }}
      </p>
    </div>

    <!-- Special Action when Opponent just delivered Checkmate -->
    <div v-if="insight.suggestRewindToHumanTurn" class="pt-1">
      <button
        type="button"
        class="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#EDEAE0] text-[#1E201E] hover:opacity-95 transition cursor-pointer"
        @click="emit('rewindToHumanTurn')"
      >
        <Undo2 class="w-3.5 h-3.5" aria-hidden="true" />
        <span>Mundur ke Giliranmu Sebelum Skakmat</span>
      </button>
    </div>

    <!-- Quick What-If Candidate Launchers (Always YOUR legal moves!) -->
    <div v-else-if="!move.isMate" class="pt-1 space-y-1.5">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          class="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
          :class="
            whatIfActive
              ? 'bg-[#EDEAE0] text-[#1E201E]'
              : 'bg-[#3F5344] text-[#F7F5F0] hover:bg-[#334438]'
          "
          @click="emit('launchWhatIf')"
        >
          <GitBranch class="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {{
              whatIfActive
                ? 'Simulasi What-If Aktif'
                : isHumanMove
                  ? 'Coba Langkah Lain (What-If)'
                  : 'Coba Balasanmu (What-If)'
            }}
          </span>
        </button>

        <button
          v-for="cand in insight.suggestedCandidates"
          :key="cand"
          type="button"
          class="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold border border-white/15 bg-white/[0.05] text-zinc-100 hover:bg-white/[0.12] hover:border-[#9FC0A8] transition cursor-pointer"
          :aria-label="`${isHumanMove ? 'Uji langkah' : 'Balas dengan'} ${cand} di simulator What-If`"
          @click="emit('launchWhatIf', cand)"
        >
          {{ isHumanMove ? `Uji ${cand}` : `Balas ${cand}` }}
        </button>
      </div>
    </div>
  </section>
</template>
