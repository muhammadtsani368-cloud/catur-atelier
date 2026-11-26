<script setup lang="ts">
import { ArrowRight, CheckCircle2, Circle, Clock, Flame, Radar } from 'lucide-vue-next'
import {
  buildDailyRoutineTasks,
  loadDailyRoutineStatus,
  markDailyRoutineTaskComplete,
  type DailyRoutineStatus,
  type DailyRoutineTaskId
} from '~/utils/dailyRoutine'

const { progress, mistakeCount, getQuickDrillRoute } = useChessProgress()

const activeCardTab = ref<'routine' | 'dna'>('routine')
const routineStatus = ref<DailyRoutineStatus>({ date: '', completedIds: [] })

function refreshRoutine() {
  routineStatus.value = loadDailyRoutineStatus()
}

onMounted(() => {
  refreshRoutine()
})

const tasks = computed(() =>
  buildDailyRoutineTasks(routineStatus.value, {
    mistakeCount: mistakeCount.value,
    quickDrillRoute: getQuickDrillRoute()
  })
)

const completedCount = computed(() => tasks.value.filter((t) => t.done).length)
const completionPct = computed(() => Math.round((completedCount.value / tasks.value.length) * 100))

function toggleManualCheck(taskId: DailyRoutineTaskId) {
  routineStatus.value = markDailyRoutineTaskComplete(taskId)
}
</script>

<template>
  <section
    class="rounded-3xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_-20px_rgba(32,35,33,0.16)] dark:shadow-[0_16px_36px_-20px_rgba(0,0,0,0.6)] space-y-5"
    aria-label="Rutinitas Harian dan Radar DNA"
  >
    <!-- Compact Segmented Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div
        class="inline-flex items-center p-1 rounded-xl border border-[#E4DFD5] dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-900 self-start"
        role="tablist"
        aria-label="Pilih tampilan latihan harian atau radar gaya bermain"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeCardTab === 'routine'"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="
            activeCardTab === 'routine'
              ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100'
          "
          @click="activeCardTab = 'routine'"
        >
          <Clock class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Rutinitas 5 Menit</span>
          <span
            class="ml-0.5 px-1.5 py-0.5 rounded-full font-mono text-[10px]"
            :class="
              activeCardTab === 'routine'
                ? 'bg-white/15 text-white dark:bg-black/15 dark:text-[#202321]'
                : 'bg-[#E8E4DC] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            "
          >
            {{ completedCount }}/{{ tasks.length }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="activeCardTab === 'dna'"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="
            activeCardTab === 'dna'
              ? 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-100'
          "
          @click="activeCardTab = 'dna'"
        >
          <Radar class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Radar DNA Saya</span>
        </button>
      </div>

      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1 font-mono text-[11px] text-[#B85D43] dark:text-[#E89B82] font-semibold">
          <Flame class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Streak {{ progress.streakDays }} hari</span>
        </span>
        <div
          v-if="activeCardTab === 'routine'"
          class="w-28 h-2 rounded-full bg-[#E8E4DC] dark:bg-zinc-800 overflow-hidden"
        >
          <div
            class="h-full rounded-full bg-[#526857] dark:bg-[#8BA893] transition-all duration-500"
            :style="{ width: `${completionPct}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Tab 1: 5-Minute Routine -->
    <div v-if="activeCardTab === 'routine'" class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all"
        :class="
          task.done
            ? 'border-[#526857]/45 bg-[#526857]/8 dark:bg-[#526857]/15'
            : 'border-[#E8E4DC] dark:border-zinc-800 bg-[#F7F5F0]/75 dark:bg-zinc-900/70'
        "
      >
        <div class="space-y-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            :class="
              task.done
                ? 'text-[#3B5240] dark:text-[#A4CBB3]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-[#202321] dark:hover:text-zinc-200'
            "
            :title="task.done ? 'Selesai hari ini' : 'Tandai selesai'"
            @click="toggleManualCheck(task.id)"
          >
            <CheckCircle2 v-if="task.done" class="w-4 h-4 text-[#526857] dark:text-[#8BA893]" />
            <Circle v-else class="w-4 h-4" />
            <span>{{ task.done ? 'Tuntas' : `~${task.minutes} menit` }}</span>
          </button>
          <h3 class="font-serif text-base font-semibold text-[#202321] dark:text-zinc-100 leading-snug">
            {{ task.title }}
          </h3>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {{ task.subtitle }}
          </p>
        </div>

        <NuxtLink
          :to="task.to"
          class="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition"
          :class="
            task.done
              ? 'bg-white/80 dark:bg-zinc-900 text-[#3B5240] dark:text-[#A4CBB3] border border-[#526857]/30'
              : 'bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:bg-[#526857] hover:text-white'
          "
        >
          <span>{{ task.done ? 'Ulangi Lagi' : task.ctaLabel }}</span>
          <ArrowRight class="w-3.5 h-3.5" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>

    <!-- Tab 2: Embedded Player DNA Radar -->
    <PlayerDnaRadarCard v-else embedded />
  </section>
</template>
