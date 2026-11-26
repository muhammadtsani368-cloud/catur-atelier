<script setup lang="ts">
const { initTheme } = useTheme()
const { hydrateProgress } = useChessProgress()

onMounted(() => {
  initTheme()
  hydrateProgress()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
