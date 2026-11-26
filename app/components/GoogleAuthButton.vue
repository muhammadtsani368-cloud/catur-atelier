<script setup lang="ts">
import { Check, CheckCircle2, Cloud, Copy, LogOut, ShieldCheck, X } from 'lucide-vue-next'

const {
  user,
  isAuthenticated,
  isGoogleConfigured,
  oauthRedirectUri,
  authLoading,
  loginWithGoogle,
  logout
} = useAuth()
const { refreshFromCloud } = useChessProgress()
const route = useRoute()

const menuOpen = ref(false)
const setupModalOpen = ref(false)
const copiedUri = ref(false)
const avatarLoadFailed = ref(false)

watch(
  () => user.value?.avatarUrl,
  () => {
    avatarLoadFailed.value = false
  }
)

// Auto-open friendly setup modal if redirected back with ?auth_error=not_configured
watch(
  () => route.query.auth_error,
  (err) => {
    if (err === 'not_configured') {
      setupModalOpen.value = true
    }
  },
  { immediate: true }
)

const displayFirstName = computed(() => {
  const full = user.value?.name?.trim() || 'Akun'
  return full.split(/\s+/)[0] || full
})

const userInitial = computed(() => {
  const ch = (user.value?.name || user.value?.email || 'G').trim().charAt(0).toUpperCase()
  return ch || 'G'
})

function handleLoginClick() {
  if (!isGoogleConfigured.value) {
    setupModalOpen.value = true
    return
  }
  loginWithGoogle()
}

async function handleLogout() {
  menuOpen.value = false
  await logout()
  await refreshFromCloud()
}

async function copyRedirectUri() {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  try {
    await navigator.clipboard.writeText(oauthRedirectUri.value)
    copiedUri.value = true
    setTimeout(() => {
      copiedUri.value = false
    }, 2000)
  } catch {
    // Ignore clipboard error
  }
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target?.closest('[data-auth-menu-root]')) {
    menuOpen.value = false
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    menuOpen.value = false
    setupModalOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="relative" data-auth-menu-root>
    <!-- Signed-in User Pill -->
    <template v-if="isAuthenticated && user">
      <button
        type="button"
        class="min-h-[44px] inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-lg border border-[#E4DFD5] dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 hover:border-[#718675] text-[#202321] dark:text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none active:scale-[0.97] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        :title="`Akun Google: ${user.email}`"
        @click.stop="menuOpen = !menuOpen"
      >
        <img
          v-if="user.avatarUrl && !avatarLoadFailed"
          :src="user.avatarUrl"
          :alt="user.name"
          referrerpolicy="no-referrer"
          class="w-7 h-7 rounded-full object-cover ring-1 ring-[#526857]/40"
          @error="avatarLoadFailed = true"
        >
        <span
          v-else
          class="w-7 h-7 rounded-full bg-[#526857] text-white text-xs font-bold inline-flex items-center justify-center"
        >
          {{ userInitial }}
        </span>
        <span class="hidden md:inline text-xs font-semibold max-w-[96px] truncate">
          {{ displayFirstName }}
        </span>
      </button>

      <!-- Account Dropdown -->
      <div
        v-if="menuOpen"
        role="menu"
        class="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-2xl p-3 space-y-2.5 z-50"
      >
        <div class="flex items-center gap-2.5 pb-2.5 border-b border-[#E8E4DC] dark:border-zinc-800">
          <img
            v-if="user.avatarUrl && !avatarLoadFailed"
            :src="user.avatarUrl"
            :alt="user.name"
            referrerpolicy="no-referrer"
            class="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[#526857]/40"
          >
          <span
            v-else
            class="w-9 h-9 rounded-full bg-[#526857] text-white text-sm font-bold inline-flex items-center justify-center shrink-0"
          >
            {{ userInitial }}
          </span>
          <div class="min-w-0">
            <p class="text-xs font-bold text-[#202321] dark:text-zinc-100 truncate">
              {{ user.name }}
            </p>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {{ user.email }}
            </p>
          </div>
        </div>

        <div class="rounded-xl bg-[#F7F5F0] dark:bg-zinc-900 px-2.5 py-2 flex items-center gap-2 text-[11px] text-[#3B5240] dark:text-[#A4CBB3]">
          <Cloud class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Progres &amp; riwayat tersinkron ke akun Google.</span>
        </div>

        <button
          type="button"
          role="menuitem"
          class="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#9B452C] dark:text-[#F0A48E] bg-[#FDF6F3] dark:bg-[#2A1B16] hover:bg-[#B85D43] hover:text-white transition cursor-pointer"
          @click="handleLogout"
        >
          <LogOut class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </template>

    <!-- Signed-out "Masuk Google" Button -->
    <button
      v-else
      type="button"
      :disabled="authLoading"
      class="min-h-[44px] inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4DFD5] dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 hover:border-[#718675] text-[#202321] dark:text-zinc-100 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-none active:scale-[0.97] transition cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#718675]"
      title="Masuk dengan akun Google untuk sinkronisasi progres lintas perangkat"
      @click="handleLoginClick"
    >
      <!-- Official Google G Emblem SVG -->
      <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span class="hidden sm:inline">Masuk Google</span>
      <span class="sm:hidden">Masuk</span>
    </button>

    <!-- Friendly Setup Guide Modal when GOOGLE_CLIENT_ID / SECRET not yet configured in .env -->
    <Teleport to="body">
      <div
        v-if="setupModalOpen"
        class="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Aktivasi Login Google OAuth"
        @click.self="setupModalOpen = false"
      >
        <div
          class="w-full max-w-lg rounded-3xl border border-[#E4DFD5] dark:border-zinc-800 bg-white dark:bg-[#19191D] shadow-2xl overflow-hidden"
        >
          <div class="bg-[#1B1E1C] px-6 py-4 text-[#F7F5F0] flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <ShieldCheck class="w-5 h-5 text-[#C59B46]" aria-hidden="true" />
              <div>
                <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-[#E7C878]">
                  Konfigurasi Google OAuth 2.0
                </p>
                <h2 class="font-serif text-lg font-semibold">
                  Aktifkan Login dengan Google
                </h2>
              </div>
            </div>
            <button
              type="button"
              class="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label="Tutup panduan"
              @click="setupModalOpen = false"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-6 space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>
              Endpoint login Google &amp; tabel akun TiDB Cloud sudah siap. Agar tombol <strong>Masuk Google</strong> langsung aktif, isi kredensial OAuth dari <strong>Google Cloud Console</strong> ke file <code class="font-mono px-1.5 py-0.5 rounded bg-[#F7F5F0] dark:bg-zinc-800">.env</code>:
            </p>

            <div class="space-y-1.5">
              <p class="font-mono text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                1. Daftarkan Authorized Redirect URI ini di Google Cloud Console:
              </p>
              <div class="flex items-center gap-2 rounded-xl border border-[#E4DFD5] dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-900 px-3 py-2">
                <code class="font-mono text-[11px] flex-1 truncate text-[#202321] dark:text-zinc-100">
                  {{ oauthRedirectUri }}
                </code>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#202321] text-white dark:bg-[#EDEAE0] dark:text-[#202321] cursor-pointer shrink-0"
                  @click="copyRedirectUri"
                >
                  <Check v-if="copiedUri" class="w-3 h-3" />
                  <Copy v-else class="w-3 h-3" />
                  <span>{{ copiedUri ? 'Tersalin' : 'Salin' }}</span>
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <p class="font-mono text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                2. Tambahkan 3 baris berikut ke file .env lalu restart server:
              </p>
              <pre class="rounded-xl bg-[#141416] text-[#EDEAE0] p-3.5 font-mono text-[11px] overflow-x-auto leading-relaxed">GOOGLE_CLIENT_ID=isi-client-id-google-anda
GOOGLE_CLIENT_SECRET=isi-client-secret-google-anda
AUTH_SESSION_SECRET=ganti-dengan-string-acak-minimal-32-karakter</pre>
            </div>

            <div class="flex items-center justify-between pt-2">
              <span class="inline-flex items-center gap-1.5 text-[11px] text-[#526857] dark:text-[#A4CBB3]">
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>Cookie HttpOnly + HMAC-SHA256 aman</span>
              </span>
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#202321] text-white dark:bg-[#EDEAE0] dark:text-[#202321] cursor-pointer"
                @click="setupModalOpen = false"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
