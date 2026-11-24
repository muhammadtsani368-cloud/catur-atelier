<script setup lang="ts">
import { AlertCircle, CheckCircle2, Lightbulb, Sparkles, Trophy } from 'lucide-vue-next'

export type FeedbackState = 'idle' | 'correct' | 'mistake' | 'completed'

withDefaults(
  defineProps<{
    state: FeedbackState
    title: string
    message: string
    moveSan?: string
    showHintButton?: boolean
    hintLevel?: number
  }>(),
  {
    moveSan: '',
    showHintButton: false,
    hintLevel: 0
  }
)

const emit = defineEmits<{
  requestHint: []
}>()
</script>

<template>
  <div
    class="rounded-xl border p-4 transition-all duration-200"
    :class="{
      'bg-white dark:bg-[#19191D] border-zinc-200/90 dark:border-zinc-800': state === 'idle',
      'bg-emerald-50/85 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60':
        state === 'correct',
      'bg-[#FDF6F3] dark:bg-[#2A1B16]/75 border-[#E6C1B5] dark:border-[#6B3B2B]':
        state === 'mistake',
      'bg-[#F1F5F2] dark:bg-[#1B261E] border-[#B9CBBF] dark:border-[#3A5241]':
        state === 'completed'
    }"
  >
    <div class="flex items-start gap-3">
      <div class="mt-0.5 shrink-0">
        <Sparkles v-if="state === 'idle'" class="w-5 h-5 text-[#5D7463] dark:text-[#98B39F]" />
        <CheckCircle2
          v-else-if="state === 'correct'"
          class="w-5 h-5 text-emerald-600 dark:text-emerald-400"
        />
        <AlertCircle
          v-else-if="state === 'mistake'"
          class="w-5 h-5 text-[#B85D43] dark:text-[#E1866B]"
        />
        <Trophy v-else class="w-5 h-5 text-[#5D7463] dark:text-[#A3C4AB]" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {{ title }}
          </h4>
          <span
            v-if="moveSan"
            class="font-mono text-xs px-2 py-0.5 rounded-md font-semibold"
            :class="
              state === 'correct'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            "
          >
            {{ moveSan }}
          </span>
        </div>

        <p class="text-sm text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
          {{ message }}
        </p>

        <div v-if="showHintButton" class="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 text-[#9A4831] dark:text-[#E59880] border border-[#DFB6A8] dark:border-[#6B3B2B] hover:bg-[#F9EDE8] dark:hover:bg-[#38221B] transition cursor-pointer"
            @click="emit('requestHint')"
          >
            <Lightbulb class="w-3.5 h-3.5" />
            <span>
              {{ hintLevel === 0 ? 'Tampilkan Petunjuk (Hint)' : 'Tunjukkan Petak Tujuan' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
