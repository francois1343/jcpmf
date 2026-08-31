function toRadians(value) {
  return value * Math.PI / 180
}

function distanceBetween(left, right) {
  const earthRadius = 6371000
  const latitudeDelta = toRadians(right.latitude - left.latitude)
  const longitudeDelta = toRadians(right.longitude - left.longitude)
  const latitudeLeft = toRadians(left.latitude)
  const latitudeRight = toRadians(right.latitude)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeLeft) * Math.cos(latitudeRight) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine))
}

export function useSessionTracking(sessionId) {
  const key = `jcpmf-tracking-${sessionId}`
  const distanceMeters = useState(`${key}-distance`, () => 0)
  const stepsCount = useState(`${key}-steps`, () => 0)
  const isTracking = useState(`${key}-active`, () => false)
  const isPaused = useState(`${key}-paused`, () => false)
  const gpsStatus = useState(`${key}-gps`, () => 'idle')
  const motionStatus = useState(`${key}-motion`, () => 'idle')
  const measurementMessage = useState(`${key}-message`, () => '')

  let geolocationWatchId = null
  let lastPosition = null
  let lastStepAt = 0
  let smoothedGravity = 9.81
  let aboveStepThreshold = false
  let motionListening = false

  const distanceKm = computed(() => Number((distanceMeters.value / 1000).toFixed(2)))

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(key, JSON.stringify({
      distanceMeters: distanceMeters.value,
      stepsCount: stepsCount.value,
      savedAt: new Date().toISOString(),
    }))
  }

  function restore() {
    if (!import.meta.client) return
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null')
      if (!stored) return
      distanceMeters.value = Math.max(0, Number(stored.distanceMeters) || 0)
      stepsCount.value = Math.max(0, Number(stored.stepsCount) || 0)
    } catch {
      localStorage.removeItem(key)
    }
  }

  function resetMeasurements() {
    distanceMeters.value = 0
    stepsCount.value = 0
    lastPosition = null
    lastStepAt = 0
    persist()
  }

  function handlePosition(position) {
    if (!isTracking.value || isPaused.value) return
    const { latitude, longitude, accuracy, speed } = position.coords
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    if (Number.isFinite(accuracy) && accuracy > 60) {
      gpsStatus.value = 'weak'
      return
    }

    const current = { latitude, longitude, timestamp: position.timestamp }
    gpsStatus.value = 'active'
    if (lastPosition) {
      const segment = distanceBetween(lastPosition, current)
      const elapsedSeconds = Math.max(1, (current.timestamp - lastPosition.timestamp) / 1000)
      const calculatedSpeed = segment / elapsedSeconds
      const reliableSpeed = Number.isFinite(speed) && speed >= 0 ? speed : calculatedSpeed
      if (segment >= 2 && segment <= 150 && reliableSpeed <= 12) {
        distanceMeters.value += segment
        persist()
      }
    }
    lastPosition = current
  }

  function handleGeolocationError(error) {
    gpsStatus.value = error?.code === 1 ? 'denied' : 'error'
    measurementMessage.value = error?.code === 1
      ? 'Localisation refusée : la distance restera à zéro.'
      : 'Signal GPS momentanément indisponible.'
  }

  function handleMotion(event) {
    if (!isTracking.value || isPaused.value) return
    const acceleration = event.acceleration
    const includingGravity = event.accelerationIncludingGravity
    const vector = acceleration && [acceleration.x, acceleration.y, acceleration.z].every(Number.isFinite)
      ? acceleration
      : includingGravity
    if (!vector || ![vector.x, vector.y, vector.z].every(Number.isFinite)) return

    const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2)
    let movement
    if (vector === acceleration) {
      movement = magnitude
    } else {
      smoothedGravity = smoothedGravity * 0.9 + magnitude * 0.1
      movement = Math.abs(magnitude - smoothedGravity)
    }

    const now = Date.now()
    if (movement > 1.15 && !aboveStepThreshold && now - lastStepAt > 280) {
      stepsCount.value += 1
      lastStepAt = now
      aboveStepThreshold = true
      persist()
    } else if (movement < 0.35) {
      aboveStepThreshold = false
    }
  }

  async function activateMotion() {
    if (!import.meta.client || typeof window.DeviceMotionEvent === 'undefined') {
      motionStatus.value = 'unavailable'
      return
    }
    try {
      if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
        const permission = await window.DeviceMotionEvent.requestPermission()
        if (permission !== 'granted') {
          motionStatus.value = 'denied'
          return
        }
      }
      if (!motionListening) {
        window.addEventListener('devicemotion', handleMotion, { passive: true })
        motionListening = true
      }
      motionStatus.value = 'active'
    } catch {
      motionStatus.value = 'denied'
    }
  }

  function activateGeolocation() {
    if (!import.meta.client || !('geolocation' in navigator)) {
      gpsStatus.value = 'unavailable'
      return
    }
    if (geolocationWatchId !== null) navigator.geolocation.clearWatch(geolocationWatchId)
    gpsStatus.value = 'requesting'
    geolocationWatchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleGeolocationError,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )
  }

  async function startTracking({ reset = false } = {}) {
    if (!import.meta.client) return
    if (reset) resetMeasurements()
    else restore()
    isTracking.value = true
    isPaused.value = false
    measurementMessage.value = ''
    activateGeolocation()
    await activateMotion()
    if (motionStatus.value === 'denied') {
      measurementMessage.value = 'Capteur de mouvement refusé : les pas ne pourront pas être estimés.'
    }
  }

  function setTrackingActive(active) {
    isPaused.value = !active
    lastPosition = null
    persist()
  }

  function stopTracking() {
    isTracking.value = false
    isPaused.value = true
    if (geolocationWatchId !== null && import.meta.client) {
      navigator.geolocation.clearWatch(geolocationWatchId)
      geolocationWatchId = null
    }
    if (motionListening && import.meta.client) {
      window.removeEventListener('devicemotion', handleMotion)
      motionListening = false
    }
    persist()
  }

  function clearMeasurements() {
    resetMeasurements()
    if (import.meta.client) localStorage.removeItem(key)
  }

  onMounted(restore)
  onBeforeUnmount(stopTracking)

  return {
    distanceMeters, distanceKm, stepsCount, isTracking, isPaused,
    gpsStatus, motionStatus, measurementMessage,
    startTracking, setTrackingActive, stopTracking, clearMeasurements,
  }
}
