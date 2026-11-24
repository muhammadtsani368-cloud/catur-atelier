<script setup lang="ts">
import { BookOpen, Check, Star, ThumbsUp, X } from 'lucide-vue-next'
import { CLASSIFICATION_MAP, type MoveClassification } from '~/utils/gameReviewEngine'

const props = withDefaults(
  defineProps<{
    classification: MoveClassification
    size?: 'xs' | 'sm' | 'md'
    ring?: boolean
  }>(),
  {
    size: 'sm',
    ring: false
  }
)

const meta = computed(() => CLASSIFICATION_MAP[props.classification])

const sizeClass = computed(() => {
  if (props.size === 'xs') return 'w-4 h-4 text-[9px]'
  if (props.size === 'md') return 'w-6 h-6 text-[11px]'
  return 'w-5 h-5 text-[10px]'
})

const iconSizeClass = computed(() => {
  if (props.size === 'xs') return 'w-2.5 h-2.5'
  if (props.size === 'md') return 'w-3.5 h-3.5'
  return 'w-3 h-3'
})
</script>

<template>
  <span
    class="inline-flex items-center justify-center rounded-full font-extrabold leading-none text-white shrink-0 select-none"
    :class="[sizeClass, ring ? 'ring-2 ring-white/95 shadow-md' : 'shadow-xs']"
    :style="{ backgroundColor: meta.color }"
    :title="meta.labelId"
    :aria-label="meta.labelId"
  >
    <BookOpen v-if="classification === 'book'" :class="iconSizeClass" :stroke-width="2.4" />
    <Star v-else-if="classification === 'best'" :class="iconSizeClass" fill="currentColor" :stroke-width="2" />
    <ThumbsUp v-else-if="classification === 'excellent'" :class="iconSizeClass" fill="currentColor" :stroke-width="1.8" />
    <Check v-else-if="classification === 'good'" :class="iconSizeClass" :stroke-width="3" />
    <X v-else-if="classification === 'miss'" :class="iconSizeClass" :stroke-width="3" />
    <span v-else class="tracking-tighter font-sans">{{ meta.symbol }}</span>
  </span>
</template>
