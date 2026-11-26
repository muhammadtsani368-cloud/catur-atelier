<script setup lang="ts">
const { initTheme } = useTheme()
const { hydrateProgress, refreshFromCloud } = useChessProgress()
const { hydrateAuth } = useAuth()

onMounted(async () => {
  initTheme()
  await hydrateAuth()
  hydrateProgress()
  // Jika baru selesai login Google (?auth=google_ok), pastikan progres tersinkron & URL bersih
  if (typeof window !== 'undefined' && window.location.search.includes('auth=google_ok')) {
    await refreshFromCloud()
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
