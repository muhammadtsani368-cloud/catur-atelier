<script setup lang="ts">
import { ChevronDown, ChevronUp, GitBranch, Play, RotateCcw, Undo2, X } from 'lucide-vue-next'
import { getAllLegalSansForFen } from '~/utils/socraticCoachEngine'
import type { WhatIfSessionState } from '~/utils/whatIfSimulator'

const props = defineProps<{
  session: WhatIfSessionState
  suggestedCandidates: string[]
  errorMessage?: string | null
  autoReplyEnabled?: boolean
}>()

const emit = defineEmits<{
  playCandidate: [san: string]
  playOpponentReply: []
  toggleAutoReply: []
  rewindPly: []
  resetOrigin: []
  close: []
}>()

const showAllLegalMoves = ref(false)

const allLegalMoves = computed(() => getAllLegalSansForFen(props.session.currentFen))
const extraLegalMoves = computed(() =>
  allLegalMoves.value.filter((san) => !props.suggestedCandidates.includes(san))
)

watch(
  () => props.session.currentFen,
  () => {
    showAllLegalMoves.value = false
  }
)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})

const verdictStyle = computed(() => {
  switch (props.session.verdictTone) {
    case 'strong':
      return 'border-[#9FC0A8]/60 bg-[#3F5344]/40 text-[#E5F4E8]'
    case 'playable':
      return 'border-[#9FC0A8]/45 bg-[#718675]/22 text-[#E2EFE5]'
    case 'risky':
      return 'border-amber-400/45 bg-amber-500/18 text-amber-100'
    case 'refuted':
      return 'border-[#B85D43]/60 bg-[#B85D43]/24 text-[#FAD7CD]'
    default:
      return 'border-white/15 bg-white/8 text-zinc-200'
  }
})
</script>

<template>
  <section
    role="region"
    aria-label="Simulator Cabang What-If"
    class="rounded-xl border border-[#9FC0A8]/45 bg-[#1D211E] p-3.5 space-y-3 text-[#F4F3EE]"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="space-y-0.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <GitBranch class="w-4 h-4 text-[#9FC0A8] shrink-0" aria-hidden="true" />
          <h4 class="text-xs font-bold text-[#F4F3EE]">
            Simulator What-If: {{ session.originLabel }}
          </h4>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded border border-[#9FC0A8]/40 bg-[#718675]/20 text-[#DCEBDD]">
            Kamu: {{ session.moverPerspective === 'w' ? 'Putih' : 'Hitam' }}
          </span>
        </div>
        <p class="text-[11px] text-zinc-300">
          Pilih kandidat di bawah, buka seluruh langkah sah, atau geser bidak langsung di papan untuk uji cabang sedalam apa pun.
        </p>
      </div>

      <button
        type="button"
        class="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/12 transition cursor-pointer shrink-0"
        aria-label="Tutup simulator What-If dan kembali ke ulasan"
        @click="emit('close')"
      >
        <X class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>

    <!-- Error feedback state if an illegal move was attempted -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-lg border border-[#B85D43]/60 bg-[#B85D43]/20 px-3 py-2 text-xs text-[#FAD7CD]"
    >
      {{ errorMessage }}
    </div>

    <!-- Candidate quick buttons (Up to 8 top ranked + toggle all legal moves!) -->
    <div v-if="!session.pendingOpponentReply && suggestedCandidates.length > 0" class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[11px] font-semibold text-zinc-300">
          {{
            session.branchMoves.length === 0
              ? `Kandidat Utama (${suggestedCandidates.length} dari ${allLegalMoves.length} langkah sah):`
              : `Kandidat Lanjutan (${suggestedCandidates.length} dari ${allLegalMoves.length} langkah sah):`
          }}
        </span>
        <button
          type="button"
          class="text-[10px] font-semibold px-2 py-0.5 rounded border transition cursor-pointer"
          :class="
            autoReplyEnabled
              ? 'border-[#9FC0A8]/50 bg-[#718675]/25 text-[#DCEBDD]'
              : 'border-white/15 bg-white/5 text-zinc-300'
          "
          @click="emit('toggleAutoReply')"
        >
          Auto-Balas: {{ autoReplyEnabled ? 'Aktif' : 'Manual' }}
        </button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(san, idx) in suggestedCandidates"
          :key="`${san}-${session.branchMoves.length}`"
          type="button"
          class="min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer"
          :class="
            idx === 0
              ? 'border-[#81B64C]/70 bg-[#81B64C]/22 hover:bg-[#81B64C]/35 text-[#E8F8D8]'
              : 'border-[#9FC0A8]/40 bg-[#718675]/20 hover:bg-[#718675]/35 text-[#EDF5EF]'
          "
          @click="emit('playCandidate', san)"
        >
          {{ idx === 0 ? `★ ${san}` : san }}
        </button>
      </div>

      <!-- Expandable All Legal Moves Drawer -->
      <div v-if="extraLegalMoves.length > 0" class="space-y-1.5">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A8C6AF] hover:text-white transition cursor-pointer"
          @click="showAllLegalMoves = !showAllLegalMoves"
        >
          <span>
            {{
              showAllLegalMoves
                ? 'Sembunyikan langkah lainnya'
                : `Lihat ${extraLegalMoves.length} langkah sah lainnya`
            }}
          </span>
          <ChevronUp v-if="showAllLegalMoves" class="w-3.5 h-3.5" />
          <ChevronDown v-else class="w-3.5 h-3.5" />
        </button>

        <div
          v-if="showAllLegalMoves"
          class="flex flex-wrap gap-1.5 p-2 rounded-lg bg-black/25 border border-white/10 max-h-32 overflow-y-auto"
        >
          <button
            v-for="san in extraLegalMoves"
            :key="`extra-${san}`"
            type="button"
            class="px-2 py-1 rounded-lg border border-white/12 bg-white/[0.05] hover:bg-white/[0.14] text-[11px] font-mono font-medium text-zinc-200 transition cursor-pointer"
            @click="emit('playCandidate', san)"
          >
            {{ san }}
          </button>
        </div>
      </div>
    </div>

    <!-- Branch move trail -->
    <div
      v-if="session.branchMoves.length > 0"
      class="rounded-lg bg-black/25 border border-white/10 px-2.5 py-2 flex items-center gap-1.5 flex-wrap"
    >
      <span class="text-[11px] text-zinc-300 font-medium mr-1">Cabang Uji ({{ session.branchMoves.length }} ply):</span>
      <span
        v-for="bm in session.branchMoves"
        :key="bm.plyOffset"
        class="px-2 py-0.5 rounded font-mono text-xs font-semibold"
        :class="
          bm.byCoachReply
            ? 'bg-[#B85D43]/28 text-[#FAD7CD] border border-[#B85D43]/40'
            : 'bg-[#718675]/30 text-[#E5F2E8] border border-[#9FC0A8]/35'
        "
      >
        {{ bm.san }}
      </span>
    </div>

    <!-- Verdict & Coach Explanation -->
    <div class="rounded-xl border p-3 space-y-1.5" :class="verdictStyle">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold">
          {{ session.verdictBadge }}
        </span>
        <span
          v-if="session.originalMoveSan && session.branchMoves.length > 0"
          class="font-mono text-[11px] opacity-90"
        >
          Asli: {{ session.originalMoveSan }}
        </span>
      </div>
      <p class="text-xs leading-relaxed">
        {{ session.coachSummaryId }}
      </p>
    </div>

    <!-- Branch Controls -->
    <div class="flex flex-wrap items-center gap-2 pt-0.5">
      <button
        v-if="session.pendingOpponentReply"
        type="button"
        class="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDEAE0] text-[#1D201E] text-xs font-bold hover:opacity-95 transition cursor-pointer"
        @click="emit('playOpponentReply')"
      >
        <Play class="w-3.5 h-3.5" aria-hidden="true" />
        <span>Jalankan Balasan Lawan ({{ session.pendingOpponentReply.san }})</span>
      </button>

      <button
        type="button"
        :disabled="session.branchMoves.length === 0"
        class="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/6 text-xs font-semibold text-zinc-200 hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        @click="emit('rewindPly')"
      >
        <Undo2 class="w-3.5 h-3.5" aria-hidden="true" />
        <span>Mundur 1 Langkah</span>
      </button>

      <button
        type="button"
        :disabled="session.branchMoves.length === 0"
        class="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/6 text-xs font-semibold text-zinc-200 hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        @click="emit('resetOrigin')"
      >
        <RotateCcw class="w-3.5 h-3.5" aria-hidden="true" />
        <span>Ulang Cabang</span>
      </button>
    </div>
  </section>
</template>
