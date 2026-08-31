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
      title: 'JCPMF Running',
      meta: [{ name: 'theme-color', content: '#2b8a57' }],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'JCPMF Running',
      short_name: 'JCPMF',
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
    workbox: {
      globPatterns: ['**/*.{js,css,png,svg,ico,woff2,mp3}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/[^/]+\/(?:$|login(?:\/|$)|register(?:\/|$)|profil(?:\/|$)|admin(?:\/|$)|session(?:\/|$))/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'jcpmf-pages',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /\.(?:js|css|woff2|png|svg|ico|mp3)(?:\?.*)?$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'jcpmf-assets',
            expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: { enabled: false },
  },
  css: ['~/assets/main.css'],
})
