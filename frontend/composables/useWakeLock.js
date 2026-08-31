export function useWakeLock() {
  const wakeLock = shallowRef(null)
  const isRequested = ref(false)
  const isSupported = computed(() => import.meta.client && 'wakeLock' in navigator)

  async function acquire() {
    if (!isRequested.value || !isSupported.value || document.visibilityState !== 'visible') return
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
      wakeLock.value.addEventListener('release', () => { wakeLock.value = null })
    } catch {
      wakeLock.value = null
    }
  }

  async function requestWakeLock() {
    isRequested.value = true
    await acquire()
  }

  async function releaseWakeLock() {
    isRequested.value = false
    await wakeLock.value?.release()
    wakeLock.value = null
  }

  function restoreAfterVisibilityChange() {
    if (document.visibilityState === 'visible') acquire()
  }

  onMounted(() => document.addEventListener('visibilitychange', restoreAfterVisibilityChange))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', restoreAfterVisibilityChange)
    releaseWakeLock()
  })

  return { isSupported, wakeLock, requestWakeLock, releaseWakeLock }
}
