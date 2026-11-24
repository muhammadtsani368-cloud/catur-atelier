<script setup lang="ts">
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-vue-next'

export interface HistoryMoveItem {
  ply: number // 1-based ply index
  san: string
  color: 'w' | 'b'
  moveNumber: number
  isBook?: boolean
}

const props = withDefaults(
  defineProps<{
    moves: HistoryMoveItem[]
    activePly: number // 0 = starting position, 1..N = after ply
    showNavControls?: boolean
    emptyMessage?: string
  }>(),
  {
    showNavControls: true,
    emptyMessage: 'Belum ada langkah dimainkan.'
  }
)

const emit = defineEmits<{
  selectPly: [ply: number]
}>()

interface MoveRow {
  moveNumber: number
  white?: HistoryMoveItem
  black?: HistoryMoveItem
}

const rows = computed<MoveRow[]>(() => {
  const result: MoveRow[] = []
  for (const m of props.moves) {
    if (m.color === 'w') {
      result.push({ moveNumber: m.moveNumber, white: m })
    } else {
      const last = result[result.length - 1]
      if (last && last.moveNumber === m.moveNumber && !last.black) {
        last.black = m
      } else {
        result.push({ moveNumber: m.moveNumber, black: m })
      }
    }
  }
  return result
})

const maxPly = computed(() => props.moves.length)
</script>

<template>
  <div
    class="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#19191D] flex flex-col overflow-hidden"
  >
    <div
      class="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between"
    >
      <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Notasi & Riwayat Langkah
      </span>
      <span class="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
        {{ activePly }} / {{ maxPly }} ply
      </span>
    </div>

    <div class="p-3 overflow-y-auto max-h-[260px] min-h-[140px]">
      <div
        v-if="rows.length === 0"
        class="h-full min-h-[110px] flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 italic text-center px-4"
      >
        {{ emptyMessage }}
      </div>

      <div v-else class="space-y-1 font-mono text-xs">
        <div
          v-for="row in rows"
          :key="row.moveNumber"
          class="grid grid-cols-[2.25rem_1fr_1fr] items-center gap-1"
        >
          <span class="text-zinc-400 dark:text-zinc-500 text-right pr-2 select-none">
            {{ row.moveNumber }}.
          </span>

          <button
            v-if="row.white"
            type="button"
            class="text-left px-2 py-1 rounded-md transition cursor-pointer"
            :class="
              activePly === row.white.ply
                ? row.white.isBook === false
                  ? 'bg-[#B85D43] text-white font-semibold shadow-xs'
                  : 'bg-[#5D7463] text-white font-semibold shadow-xs'
                : row.white.isBook === false
                  ? 'text-[#9A4831] dark:text-[#E59880] italic hover:bg-[#B85D43]/10'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            "
            @click="emit('selectPly', row.white.ply)"
          >
            {{ row.white.san }}
          </button>
          <span v-else class="px-2 py-1 text-zinc-300 dark:text-zinc-700">…</span>

          <button
            v-if="row.black"
            type="button"
            class="text-left px-2 py-1 rounded-md transition cursor-pointer"
            :class="
              activePly === row.black.ply
                ? row.black.isBook === false
                  ? 'bg-[#B85D43] text-white font-semibold shadow-xs'
                  : 'bg-[#5D7463] text-white font-semibold shadow-xs'
                : row.black.isBook === false
                  ? 'text-[#9A4831] dark:text-[#E59880] italic hover:bg-[#B85D43]/10'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            "
            @click="emit('selectPly', row.black.ply)"
          >
            {{ row.black.san }}
          </button>
          <span v-else />
        </div>
      </div>
    </div>

    <div
      v-if="showNavControls"
      class="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-[#F8F7F4]/60 dark:bg-zinc-900/50 flex items-center justify-between gap-1"
    >
      <button
        type="button"
        class="flex-1 flex items-center justify-center py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-35 transition cursor-pointer"
        :disabled="activePly <= 0"
        title="Posisi Awal"
        @click="emit('selectPly', 0)"
      >
        <ChevronFirst class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="flex-1 flex items-center justify-center py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-35 transition cursor-pointer"
        :disabled="activePly <= 0"
        title="Langkah Sebelumnya"
        @click="emit('selectPly', Math.max(0, activePly - 1))"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="flex-1 flex items-center justify-center py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-35 transition cursor-pointer"
        :disabled="activePly >= maxPly"
        title="Langkah Berikutnya"
        @click="emit('selectPly', Math.min(maxPly, activePly + 1))"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="flex-1 flex items-center justify-center py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-35 transition cursor-pointer"
        :disabled="activePly >= maxPly"
        title="Langkah Terakhir"
        @click="emit('selectPly', maxPly)"
      >
        <ChevronLast class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
