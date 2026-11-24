<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Crown,
  Layers,
  Sparkles,
  X
} from 'lucide-vue-next'
import type { RepertoireModule } from '~/utils/chessData'
import {
  computeOpeningLinePreview,
  computeScenarioPreview,
  getModulePreview
} from '~/utils/repertoirePreview'

const props = defineProps<{
  module: RepertoireModule | null
  mastered: number
  total: number
  percent: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { isLineMastered } = useChessProgress()

const activeItemIndex = ref(0)

watch(
  () => props.module?.id,
  () => {
    activeItemIndex.value = 0
  }
)

const targetRoute = computed(() => {
  if (!props.module) return '/dashboard'
  return props.module.category === 'opening'
    ? `/trainer/opening/${props.module.id}`
    : `/trainer/endgame/${props.module.id}`
})

const ecoLabel = computed(() => {
  if (!props.module) return ''
  if (props.module.category === 'opening') {
    return props.module.isCustom ? 'KUSTOM' : props.module.eco
  }
  return 'BABAK AKHIR'
})

const activePreview = computed(() => {
  const mod = props.module
  if (!mod) return { fen: null, highlights: [], notationSnippet: '', hoverMove: null }

  if (mod.category === 'opening') {
    const line = mod.lines[activeItemIndex.value] ?? mod.lines[0]
    if (activeItemIndex.value === 0) {
      return getModulePreview(mod)
    }
    return computeOpeningLinePreview(line, mod.startingFen, 10)
  }

  const sc = mod.scenarios[activeItemIndex.value] ?? mod.scenarios[0]
  if (activeItemIndex.value === 0) {
    return getModulePreview(mod)
  }
  return computeScenarioPreview(sc)
})

const activeOrientation = computed(() => {
  const mod = props.module
  if (!mod) return 'w'
  if (mod.category === 'endgame') {
    return mod.scenarios[activeItemIndex.value]?.side ?? mod.side
  }
  return mod.side
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.module) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="module"
        class="fixed inset-0 z-50 flex justify-end bg-[#202321]/45 dark:bg-black/65 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        :aria-label="`Detail Repertoar ${module.title}`"
        @click.self="emit('close')"
      >
        <div
          class="relative w-full max-w-xl h-full bg-[#F7F5F0] dark:bg-[#141417] border-l border-[#E8E4DC] dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        >
          <!-- Drawer Top Header -->
          <div
            class="px-6 py-4 bg-white dark:bg-[#19191D] border-b border-[#E8E4DC] dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                :class="
                  module.side === 'w'
                    ? 'bg-[#F7F5F0] text-[#202321] border-[#DCD6CA] dark:bg-zinc-100 dark:text-[#202321]'
                    : 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-zinc-800 dark:text-zinc-100'
                "
              >
                {{ module.side === 'w' ? 'Putih' : 'Hitam' }}
              </span>

              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#718675]/12 text-[#495C4D] dark:bg-[#718675]/25 dark:text-[#B8CEBC]"
              >
                <BookOpen v-if="module.category === 'opening'" class="w-3 h-3" />
                <Crown v-else class="w-3 h-3" />
                {{ module.category === 'opening' ? 'Pembukaan' : 'Babak Akhir' }}
              </span>

              <span class="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {{ ecoLabel }}
              </span>

              <span
                class="text-[11px] px-2 py-0.5 rounded-md bg-[#F7F5F0] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-[#E8E4DC] dark:border-zinc-700"
              >
                {{ module.difficulty }}
              </span>
            </div>

            <button
              type="button"
              class="p-2 rounded-xl text-zinc-500 hover:text-[#202321] dark:hover:text-white hover:bg-[#F7F5F0] dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Tutup panel detail"
              @click="emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div>
              <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-[#202321] dark:text-zinc-50 leading-tight">
                {{ module.title }}
              </h2>
              <p class="text-sm font-medium text-[#495C4D] dark:text-[#9DB5A1] mt-1">
                {{ module.subtitle }}
              </p>
              <p class="text-sm text-zinc-600 dark:text-zinc-300 mt-3 leading-relaxed">
                {{ module.summary }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-[#E8E4DC] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 flex flex-col sm:flex-row items-center gap-5"
            >
              <MiniBoardPreview
                :fen="activePreview.fen"
                :hover-move="activePreview.hoverMove"
                :orientation="activeOrientation"
                :highlight-squares="activePreview.highlights"
                :hovered="true"
                size="drawer"
              />

              <div class="flex-1 min-w-0 w-full space-y-3">
                <div>
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Pratinjau Posisi Aktif
                  </span>
                  <p class="text-sm font-semibold text-[#202321] dark:text-zinc-100 mt-0.5">
                    {{
                      module.category === 'opening'
                        ? module.lines[activeItemIndex]?.name ?? 'Jalur Utama'
                        : module.scenarios[activeItemIndex]?.title ?? 'Skenario Utama'
                    }}
                  </p>
                </div>

                <p
                  v-if="activePreview.notationSnippet"
                  class="font-mono text-xs px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 border border-[#E8E4DC] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 leading-relaxed"
                >
                  {{ activePreview.notationSnippet }}
                </p>

                <div class="pt-1">
                  <div class="flex items-center justify-between text-xs mb-1.5">
                    <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                      Progres Penguasaan
                    </span>
                    <span class="font-mono font-semibold text-[#202321] dark:text-zinc-100">
                      {{ mastered }} / {{ total }} ({{ percent }}%)
                    </span>
                  </div>
                  <div class="h-2 rounded-full bg-[#EFECE5] dark:bg-zinc-800 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-[#718675] transition-all duration-500 motion-reduce:transition-none"
                      :style="{ width: `${percent}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-[#718675]" />
                <span>Konsep &amp; Tag Strategi</span>
              </h3>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="theme in module.keyThemes"
                  :key="theme"
                  class="px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-[#19191D] text-zinc-700 dark:text-zinc-300 border border-[#E8E4DC] dark:border-zinc-800"
                >
                  {{ theme }}
                </span>
              </div>
            </div>

            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <Layers class="w-3.5 h-3.5 text-[#718675]" />
                <span>
                  {{
                    module.category === 'opening'
                      ? `Daftar Variasi (${module.lines.length})`
                      : `Daftar Skenario Latihan (${module.scenarios.length})`
                  }}
                </span>
              </h3>

              <div v-if="module.category === 'opening'" class="space-y-2.5">
                <button
                  v-for="(line, idx) in module.lines"
                  :key="line.id"
                  type="button"
                  class="w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer"
                  :class="
                    activeItemIndex === idx
                      ? 'bg-white dark:bg-[#19191D] border-[#718675] ring-1 ring-[#718675]/30'
                      : 'bg-white/70 dark:bg-[#19191D]/70 border-[#E8E4DC] dark:border-zinc-800 hover:border-[#718675]/60'
                  "
                  @click="activeItemIndex = idx"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <CheckCircle2
                        v-if="isLineMastered(line.id)"
                        class="w-4 h-4 text-[#718675] dark:text-emerald-400 shrink-0"
                      />
                      <Circle v-else class="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                      <span class="text-sm font-semibold text-[#202321] dark:text-zinc-100 truncate">
                        {{ line.name }}
                      </span>
                    </div>
                    <span class="font-mono text-[11px] text-zinc-400 shrink-0">
                      {{ line.moves.length }} ply
                    </span>
                  </div>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 pl-6 leading-relaxed">
                    {{ line.description }}
                  </p>
                </button>
              </div>

              <div v-else class="space-y-2.5">
                <button
                  v-for="(sc, idx) in module.scenarios"
                  :key="sc.id"
                  type="button"
                  class="w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer"
                  :class="
                    activeItemIndex === idx
                      ? 'bg-white dark:bg-[#19191D] border-[#718675] ring-1 ring-[#718675]/30'
                      : 'bg-white/70 dark:bg-[#19191D]/70 border-[#E8E4DC] dark:border-zinc-800 hover:border-[#718675]/60'
                  "
                  @click="activeItemIndex = idx"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <CheckCircle2
                        v-if="isLineMastered(sc.id)"
                        class="w-4 h-4 text-[#718675] dark:text-emerald-400 shrink-0"
                      />
                      <Circle v-else class="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                      <span class="text-sm font-semibold text-[#202321] dark:text-zinc-100">
                        {{ sc.title }}
                      </span>
                    </div>
                    <span
                      class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0"
                      :class="
                        sc.goalType === 'win'
                          ? 'bg-[#718675]/15 text-[#495C4D] dark:text-[#B8CEBC]'
                          : 'bg-[#F7F5F0] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      "
                    >
                      {{ sc.goalType === 'win' ? 'Menang' : 'Remis' }}
                    </span>
                  </div>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 pl-6 leading-relaxed">
                    {{ sc.objective }}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <!-- Sticky Bottom Action Footer -->
          <div
            class="px-6 py-4 bg-white dark:bg-[#19191D] border-t border-[#E8E4DC] dark:border-zinc-800 flex items-center gap-3 shrink-0"
          >
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E8E4DC] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800 text-[#202321] dark:text-zinc-200 hover:border-[#718675] transition cursor-pointer"
              @click="emit('close')"
            >
              Tutup
            </button>

            <NuxtLink
              :to="targetRoute"
              class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#202321] text-[#F7F5F0] dark:bg-[#EDEAE0] dark:text-[#202321] hover:bg-[#343A36] dark:hover:bg-white transition"
              @click="emit('close')"
            >
              <span>Mulai Latihan Sekarang</span>
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.drawer-fade-enter-active > div,
.drawer-fade-leave-active > div {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from > div,
.drawer-fade-leave-to > div {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-fade-enter-active,
  .drawer-fade-leave-active,
  .drawer-fade-enter-active > div,
  .drawer-fade-leave-active > div {
    transition: none;
  }
}
</style>
