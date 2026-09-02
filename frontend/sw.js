// Changez ce nom lors d’une mise en production importante pour renouveler le cache installé.
const CACHE_NAME = 'jcpmf-static-2026-09-02-4'
const APP_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/session.html',
  '/profile.html',
  '/admin.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/api.js',
  '/js/common.js',
  '/js/pwa.js',
  '/js/login.js',
  '/js/register.js',
  '/js/dashboard.js',
  '/js/session.js',
  '/js/profile.js',
  '/js/admin.js',
  '/manifest.webmanifest',
  '/images/image.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sons/warmup.mp3',
  '/sons/run.mp3',
  '/sons/walk.mp3',
  '/sons/sprint.mp3',
  '/sons/stretching.mp3'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('jcpmf-static-') && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: event.request.mode === 'navigate' })
        return cached || (event.request.mode === 'navigate' ? caches.match('/login.html') : Response.error())
      }),
  )
})
