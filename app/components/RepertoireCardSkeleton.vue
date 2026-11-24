<template>
  <div
    class="rounded-2xl border border-[#E8E4DC] dark:border-zinc-800 bg-white dark:bg-[#19191D] p-5 flex flex-col justify-between animate-pulse motion-reduce:animate-none"
    aria-hidden="true"
  >
    <div>
      <!-- Header badges skeleton -->
      <div class="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-[#E8E4DC]/70 dark:border-zinc-800">
        <div class="flex items-center gap-2">
          <div class="h-5 w-14 rounded-full bg-[#E8E4DC]/80 dark:bg-zinc-800" />
          <div class="h-5 w-20 rounded-full bg-[#E8E4DC]/60 dark:bg-zinc-800/80" />
        </div>
        <div class="h-4 w-12 rounded-md bg-[#E8E4DC]/70 dark:bg-zinc-800" />
      </div>

      <!-- Title + Mini board skeleton -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 space-y-2.5">
          <div class="h-5 w-4/5 rounded-md bg-[#E8E4DC]/90 dark:bg-zinc-800" />
          <div class="h-3.5 w-3/5 rounded-md bg-[#E8E4DC]/60 dark:bg-zinc-800/80" />
          <div class="space-y-1.5 pt-1">
            <div class="h-3 w-full rounded bg-[#E8E4DC]/50 dark:bg-zinc-800/60" />
            <div class="h-3 w-5/6 rounded bg-[#E8E4DC]/50 dark:bg-zinc-800/60" />
          </div>
        </div>
        <div class="w-[108px] h-[108px] sm:w-[114px] sm:h-[114px] rounded-xl bg-[#E8E4DC]/70 dark:bg-zinc-800 shrink-0" />
      </div>

      <!-- Tags skeleton -->
      <div class="flex gap-1.5 mt-4">
        <div class="h-5 w-20 rounded-full bg-[#F7F5F0] dark:bg-zinc-800/80" />
        <div class="h-5 w-24 rounded-full bg-[#F7F5F0] dark:bg-zinc-800/80" />
        <div class="h-5 w-16 rounded-full bg-[#F7F5F0] dark:bg-zinc-800/80" />
      </div>
    </div>

    <!-- Progress & dual CTA skeleton -->
    <div class="mt-5 pt-3.5 border-t border-[#E8E4DC]/70 dark:border-zinc-800 space-y-3">
      <div class="space-y-1.5">
        <div class="flex justify-between">
          <div class="h-3 w-28 rounded bg-[#E8E4DC]/60 dark:bg-zinc-800" />
          <div class="h-3 w-8 rounded bg-[#E8E4DC]/60 dark:bg-zinc-800" />
        </div>
        <div class="h-1.5 w-full rounded-full bg-[#E8E4DC]/60 dark:bg-zinc-800" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="h-9 rounded-xl bg-[#F7F5F0] dark:bg-zinc-800" />
        <div class="h-9 rounded-xl bg-[#E8E4DC] dark:bg-zinc-700" />
      </div>
    </div>
  </div>
</template>
