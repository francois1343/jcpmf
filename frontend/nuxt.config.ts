export default defineNuxtConfig({
  compatibilityDate: '2026-08-31',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4000/api',
    },
  },
  app: {
    head: {
      title: 'JCPMS Running',
      meta: [{ name: 'theme-color', content: '#2b8a57' }],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'JCPMS Running',
      short_name: 'JCPMS',
      description: 'Suivi de séances de course à pied',
      lang: 'fr',
      start_url: '/',
      scope: '/',
      theme_color: '#2b8a57',
      background_color: '#f4f7f5',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    // Service Worker présent pour l’installation, sans cache offline métier dans ce MVP.
    workbox: { globPatterns: [], runtimeCaching: [], navigateFallback: null },
    devOptions: { enabled: false },
  },
  css: ['~/assets/main.css'],
})
