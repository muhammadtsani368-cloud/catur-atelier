<script setup lang="ts">
import { Compass, Eye, Shield } from 'lucide-vue-next'
import {
  ADAPTIVE_LENS_PRESETS,
  type AdaptiveLensId
} from '~/utils/adaptiveLensEngine'

const props = withDefaults(
  defineProps<{
    modelValue: AdaptiveLensId
    surface?: 'adaptive' | 'dark-panel'
    compact?: boolean
  }>(),
  {
    surface: 'adaptive',
    compact: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: AdaptiveLensId]
}>()

const activePreset = computed(
  () => ADAPTIVE_LENS_PRESETS.find((p) => p.id === props.modelValue) ?? ADAPTIVE_LENS_PRESETS[0]!
)

function selectLens(id: AdaptiveLensId) {
  emit('update:modelValue', id)
}
</script>

<template>
  <div
    class="rounded-2xl border transition-colors"
    :class="
      surface === 'dark-panel'
        ? 'border-white/12 bg-[#2B2E2B] p-3 text-[#F4F3EE]'
        : 'border-[#E4DFD5] dark:border-zinc-800 bg-[#FAF8F4] dark:bg-zinc-900/75 p-3 sm:p-3.5 text-[#202321] dark:text-[#F4F3EE]'
    "
  >
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-1.5">
        <Eye
          class="w-3.5 h-3.5 shrink-0"
          :class="surface === 'dark-panel' ? 'text-[#9FC0A8]' : 'text-[#526857] dark:text-[#9FC0A8]'"
          aria-hidden="true"
        />
        <span
          class="text-xs font-semibold"
          :class="surface === 'dark-panel' ? 'text-zinc-100' : 'text-zinc-800 dark:text-zinc-100'"
        >
          Level Bahasa &amp; Panduan (Adaptive Lens)
        </span>
      </div>
      <span
        class="text-[11px] font-medium px-2 py-0.5 rounded-md border"
        :class="
          surface === 'dark-panel'
            ? 'border-[#9FC0A8]/35 bg-[#718675]/20 text-[#D4E6D9]'
            : 'border-[#718675]/35 bg-[#718675]/12 text-[#3D5142] dark:text-[#CBE0D0]'
        "
      >
        {{ activePreset.badge }}
      </span>
    </div>

    <div
      role="radiogroup"
      aria-label="Pilih tingkat bantuan visual Adaptive Lens"
      class="grid grid-cols-3 gap-1.5"
    >
      <button
        v-for="preset in ADAPTIVE_LENS_PRESETS"
        :key="preset.id"
        type="button"
        role="radio"
        :aria-checked="modelValue === preset.id"
        class="min-h-[44px] px-2.5 py-2 rounded-xl border text-left transition flex flex-col justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#718675]"
        :class="
          modelValue === preset.id
            ? surface === 'dark-panel'
              ? 'bg-[#EDEAE0] text-[#1D201E] border-[#EDEAE0] font-semibold'
              : 'bg-[#202321] text-[#F7F5F0] border-[#202321] dark:bg-[#EDEAE0] dark:text-[#202321] dark:border-[#EDEAE0] font-semibold'
            : surface === 'dark-panel'
              ? 'bg-white/[0.04] text-zinc-200 border-white/12 hover:bg-white/[0.09] hover:border-white/25'
              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-[#E4DFD5] dark:border-zinc-700 hover:border-[#718675]'
        "
        @click="selectLens(preset.id)"
      >
        <span class="flex items-center gap-1 text-xs leading-tight font-semibold">
          <Shield
            v-if="preset.id === 'apprentice'"
            class="w-3.5 h-3.5 shrink-0 opacity-85"
            aria-hidden="true"
          />
          <Compass
            v-else-if="preset.id === 'club'"
            class="w-3.5 h-3.5 shrink-0 opacity-85"
            aria-hidden="true"
          />
          <Eye v-else class="w-3.5 h-3.5 shrink-0 opacity-85" aria-hidden="true" />
          <span>{{ preset.label }}</span>
        </span>
        <span
          class="text-[10px] leading-snug mt-0.5"
          :class="
            modelValue === preset.id
              ? surface === 'dark-panel'
                ? 'text-zinc-700'
                : 'text-zinc-300 dark:text-zinc-700'
              : surface === 'dark-panel'
                ? 'text-zinc-300'
                : 'text-zinc-600 dark:text-zinc-400'
          "
        >
          {{ preset.badge }}
        </span>
      </button>
    </div>

    <p
      class="mt-2 text-xs leading-relaxed"
      :class="surface === 'dark-panel' ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-300'"
    >
      {{ compact ? activePreset.shortDesc : activePreset.detailDesc }}
    </p>
  </div>
</template>
