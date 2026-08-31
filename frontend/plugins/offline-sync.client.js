export default defineNuxtPlugin(() => {
  const { token } = useAuth()
  const config = useRuntimeConfig()
  const offline = useOfflineStore()

  function scope() {
    return offlineScopeFromToken(token.value)
  }

  async function synchronize() {
    offline.isOnline.value = navigator.onLine
    await offline.refreshPendingCount(scope())
    if (navigator.onLine && token.value) {
      await offline.syncPending(scope(), token.value, config.public.apiBase)
    }
  }

  window.addEventListener('online', synchronize)
  window.addEventListener('offline', () => { offline.isOnline.value = false })
  onNuxtReady(synchronize)
})
