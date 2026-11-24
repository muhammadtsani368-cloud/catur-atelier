<script setup lang="ts">
import { ArrowRight, BookOpen, Check, CheckCircle2, Crown, Eye, Trash2 } from 'lucide-vue-next'
import type { RepertoireModule } from '~/utils/chessData'
import { getModulePreview } from '~/utils/repertoirePreview'

const props = withDefaults(
  defineProps<{
    module: RepertoireModule
    mastered: number
    total: number
    percent: number
    selected?: boolean
  }>(),
  {
    selected: false
  }
)

const emit = defineEmits<{
  select: [module: RepertoireModule]
  deleteCustom: [id: string]
}>()

const isHovered = ref(false)

const targetRoute = computed(() =>
  props.module.category === 'opening'
    ? `/trainer/opening/${props.module.id}`
    : `/trainer/endgame/${props.module.id}`
)

const isCustom = computed(() => props.module.category === 'opening' && Boolean(props.module.isCustom))
const isComplete = computed(() => props.total > 0 && props.mastered >= props.total)

const ecoLabel = computed(() => {
  if (props.module.category === 'opening') {
    return isCustom.value ? 'KUSTOM' : props.module.eco
  }
  return 'BABAK AKHIR'
})

const unitLabel = computed(() => (props.module.category === 'opening' ? 'variasi' : 'skenario'))

const visibleTags = computed(() => props.module.keyThemes.slice(0, 3))
const extraTags = computed(() => props.module.keyThemes.slice(3))

const previewBoardData = computed(() => getModulePreview(props.module))

function handleCardClick() {
  emit('select', props.module)
}

function handleCardKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('select', props.module)
  }
}
</script>

<template>
  <article
    role="button"
    tabindex="0"
    :aria-pressed="selected"
    :aria-label="`Lihat detail ${module.title}`"
    class="group relative rounded-2xl border bg-white dark:bg-[#19191D] p-5 flex flex-col justify-between cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#718675] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F0] dark:focus-visible:ring-offset-[#121214] transition-all duration-250 ease-out motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    :class="
      selected
        ? 'surface-tactile-card-selected border-[#718675] -translate-y-0.5'
        : 'surface-tactile-card border-[#E4DFD5] dark:border-zinc-800 hover:-translate-y-1 hover:border-[#718675] dark:hover:border-[#718675]'
    "
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleCardClick"
    @keydown="handleCardKeydown"
  >
    <!-- Selected state non-color indicator pill -->
    <div
      v-if="selected"
      class="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#526857] text-white font-mono text-[10px] uppercase tracking-[0.12em] font-semibold shadow-xs"
    >
      <Check class="w-3 h-3 stroke-[2.5]" />
      <span>Dipilih</span>
    </div>

    <div>
      <!-- A. HEADER: Piece side + Category on left, ECO code on right -->
      <div
        class="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E8E4DC]/90 dark:border-zinc-800/80"
      >
        <div class="flex flex-wrap items-center gap-1.5 min-w-0">
          <!-- Side Badge -->
          <span
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[0.1em] font-semibold border"
            :class="
              module.side === 'w'
                ? 'bg-[#F7F5F0] text-[#202321] border-[#DCD6CA] dark:bg-zinc-100 dark:text-[#202321] dark:border-zinc-200'
                : 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700'
            "
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="module.side === 'w' ? 'bg-white ring-1 ring-[#202321]/50' : 'bg-zinc-400'"
            />
            {{ module.side === 'w' ? 'Putih' : 'Hitam' }}
          </span>

          <!-- Category Badge -->
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[0.1em] font-medium border"
            :class="
              module.category === 'opening'
                ? 'bg-[#718675]/10 text-[#3B4E3F] border-[#718675]/25 dark:bg-[#718675]/20 dark:text-[#B8CEBC] dark:border-[#718675]/35'
                : 'bg-[#F7F5F0] text-zinc-700 border-[#E4DFD5] dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700'
            "
          >
            <BookOpen v-if="module.category === 'opening'" class="w-3 h-3" />
            <Crown v-else class="w-3 h-3" />
            {{ module.category === 'opening' ? 'Pembukaan' : 'Babak Akhir' }}
          </span>
        </div>

        <!-- ECO Code / Status on Right -->
        <div class="flex items-center gap-1.5 shrink-0">
          <span
            class="font-mono text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-400 tracking-[0.14em]"
          >
            {{ ecoLabel }}
          </span>

          <CheckCircle2
            v-if="isComplete && !isCustom"
            class="w-3.5 h-3.5 text-[#526857] dark:text-emerald-400"
            title="Seluruh variasi telah dikuasai"
          />

          <button
            v-if="isCustom"
            type="button"
            class="p-1 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-90 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Hapus Repertoar Kustom"
            aria-label="Hapus Repertoar Kustom"
            @click.stop="emit('deleteCustom', module.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- B. TITLE & DESCRIPTION + C. VISUAL PREVIEW -->
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <h3
            class="font-serif text-[19px] sm:text-[20px] font-semibold tracking-[-0.015em] text-[#202321] dark:text-zinc-100 group-hover:text-[#3E5242] dark:group-hover:text-[#A4BFA9] transition-colors duration-200 leading-[1.22] line-clamp-2"
          >
            {{ module.title }}
          </h3>

          <p class="text-[11px] font-mono font-medium tracking-[0.03em] text-[#495C4D] dark:text-[#9DB5A1] mt-1.5 line-clamp-1">
            {{ module.subtitle }}
          </p>

          <p
            class="text-[13px] text-zinc-600 dark:text-zinc-400 mt-2.5 leading-[1.6] line-clamp-3"
          >
            {{ module.summary }}
          </p>
        </div>

        <MiniBoardPreview
          :fen="previewBoardData.fen"
          :hover-move="previewBoardData.hoverMove"
          :orientation="module.side"
          :highlight-squares="previewBoardData.highlights"
          :hovered="isHovered || selected"
          size="card"
        />
      </div>

      <!-- D. STRATEGY TAGS -->
      <div class="flex flex-wrap items-center gap-1.5 mt-4">
        <span
          v-for="theme in visibleTags"
          :key="theme"
          class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F7F5F0] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-[#E6E1D7] dark:border-zinc-700/80"
        >
          {{ theme }}
        </span>

        <span
          v-if="extraTags.length > 0"
          class="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white dark:bg-zinc-900 text-[#495C4D] dark:text-[#9DB5A1] border border-[#E6E1D7] dark:border-zinc-700"
          :title="`Tag tambahan: ${extraTags.join(', ')}`"
        >
          +{{ extraTags.length }}
        </span>
      </div>
    </div>

    <!-- E. PROGRESS SECTION + F. DUAL ACTION BUTTONS -->
    <div class="mt-5 pt-4 border-t border-[#E8E4DC]/90 dark:border-zinc-800/80 space-y-3.5">
      <div>
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="text-zinc-600 dark:text-zinc-400 font-medium">
            {{ mastered }} / {{ total }} {{ unitLabel }} dikuasai
          </span>
          <span
            class="font-mono text-[11px] font-semibold tabular-nums"
            :class="isComplete ? 'text-[#3E5242] dark:text-emerald-400' : 'text-[#202321] dark:text-zinc-200'"
          >
            {{ percent }}%
          </span>
        </div>
        <div
          class="h-1.5 w-full rounded-full bg-[#EFECE5] dark:bg-zinc-800 overflow-hidden"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
            :class="isComplete ? 'bg-[#526857]' : 'bg-[#718675]'"
            :style="{ width: `${percent}%` }"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F7F5F0] dark:bg-zinc-800/90 text-[#202321] dark:text-zinc-200 border border-[#E4DFD5] dark:border-zinc-700 hover:border-[#718675] hover:bg-[#EFECE4] dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
          @click.stop="emit('select', module)"
        >
          <Eye class="w-3.5 h-3.5 text-[#495C4D] dark:text-[#9DB5A1]" />
          <span>Lihat Detail</span>
        </button>

        <NuxtLink
          :to="targetRoute"
          class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
          :class="
            selected
              ? 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321] dark:border-[#EDEAE0] hover:bg-[#526857] hover:border-[#526857] dark:hover:bg-white'
              : 'bg-[#F4F1EA] text-[#202321] border-[#DFD9CC] dark:bg-zinc-800/90 dark:text-zinc-100 dark:border-zinc-700 group-hover:bg-[#202321] group-hover:text-[#F7F5F0] group-hover:border-[#202321] dark:group-hover:bg-[#EDEAE0] dark:group-hover:text-[#202321] dark:group-hover:border-[#EDEAE0] hover:!bg-[#526857] hover:!border-[#526857] hover:!text-white dark:hover:!bg-white dark:hover:!text-[#202321]'
          "
          @click.stop
        >
          <span>Mulai Latihan</span>
          <ArrowRight class="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
