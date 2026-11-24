import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  runtimeConfig: {
    // Diisi murni saat runtime melalui env NUXT_TIDB_* atau TIDB_* (jangan bake secret ke bundle build)
    tidbHost: '',
    tidbPort: 4000,
    tidbUser: '',
    tidbPassword: '',
    tidbDatabase: 'grandmaster_atelier',
    tidbSsl: true,
    tidbCaPath: ''
  },
  typescript: {
    strict: true,
    typeCheck: false
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Grandmaster Atelier | Pelatih Pembukaan & Babak Akhir Catur',
      meta: [
        {
          name: 'description',
          content:
            'Pelatih repertoar pembukaan dan taktik babak akhir catur interaktif dalam Bahasa Indonesia bergaya editorial.'
        },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
        }
      ]
    }
  }
})
