import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  runtimeConfig: {
    // Diisi murni saat runtime melalui env (jangan bake secret ke bundle build)
    tidbHost: '',
    tidbPort: 4000,
    tidbUser: '',
    tidbPassword: '',
    tidbDatabase: 'grandmaster_atelier',
    tidbSsl: true,
    tidbCaPath: '',
    googleClientId: '',
    googleClientSecret: '',
    authSessionSecret: '',
    appOrigin: ''
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
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23171A18'/%3E%3Crect x='3' y='3' width='34' height='34' rx='7.5' fill='none' stroke='%23D4B064' stroke-opacity='0.45'/%3E%3Cpath d='M20 6.5V12.5M17.2 9.1H22.8' stroke='%23FAF0D2' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M11.6 26.8L9.6 17.5C9.3 15.9 10.9 14.7 12.4 15.3L16.3 17.1L18.9 13.6C19.5 12.8 20.5 12.8 21.1 13.6L23.7 17.1L27.6 15.3C29.1 14.7 30.7 15.9 30.4 17.5L28.4 26.8H11.6Z' fill='%23D9B462'/%3E%3Cpath d='M20 19.3L21.9 21.5L20 23.7L18.1 21.5Z' fill='%237FA086'/%3E%3Crect x='11.2' y='28.3' width='17.6' height='2.2' rx='1.1' fill='%23D9B462'/%3E%3Crect x='9.5' y='31.5' width='21' height='2.3' rx='1.15' fill='%23C59B46'/%3E%3C/svg%3E"
        },
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
