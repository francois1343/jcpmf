export function useWakeLock() {
  const wakeLock = shallowRef(null)
  const isSupported = computed(() => import.meta.client && 'wakeLock' in navigator)

  async function requestWakeLock() {
    if (!isSupported.value || document.visibilityState !== 'visible') return
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
      wakeLock.value.addEventListener('release', () => { wakeLock.value = null })
    } catch {
      wakeLock.value = null
    }
  }

  async function releaseWakeLock() {
    await wakeLock.value?.release()
    wakeLock.value = null
  }

  onMounted(() => document.addEventListener('visibilitychange', requestWakeLock))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', requestWakeLock)
    releaseWakeLock()
  })

  return { isSupported, wakeLock, requestWakeLock, releaseWakeLock }
}
