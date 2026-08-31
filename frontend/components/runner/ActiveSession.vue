<script setup>
const props = defineProps({
  title: { type: String, required: true },
  seasonTitle: { type: String, default: '' },
  weekTitle: { type: String, default: '' },
  exercises: { type: Array, required: true },
  initialExerciseIndex: { type: Number, default: 0 },
  sessionId: { type: [Number, String], required: true },
  resumeStored: { type: Boolean, default: false },
  distanceKm: { type: Number, default: 0 },
  stepsCount: { type: Number, default: 0 },
  trackingActive: { type: Boolean, default: false },
  gpsStatus: { type: String, default: 'idle' },
  motionStatus: { type: String, default: 'idle' },
  measurementMessage: { type: String, default: '' },
})

const emit = defineEmits(['exercise-change', 'complete', 'finish', 'running-change', 'request-tracking'])
const { requestWakeLock, releaseWakeLock } = useWakeLock()
const timerStorageKey = `jcpmf-session-timer-${props.sessionId}`

const currentIndex = ref(Math.max(0, Math.min(props.initialExerciseIndex, Math.max(props.exercises.length - 1, 0))))
const running = ref(true)
const remainingSeconds = ref(durationOf(props.exercises[currentIndex.value]))
const cueMessage = ref('')
const audio = shallowRef(null)
let timerId
let sessionEnded = false

const currentExercise = computed(() => props.exercises[currentIndex.value])
const normalizedType = computed(() => normaliseType(currentExercise.value?.type))
const isLastExercise = computed(() => currentIndex.value === props.exercises.length - 1)

const labels = {
  warmup: 'Échauffement',
  run: 'Cours',
  walk: 'Marche',
  sprint: 'Sprint',
  stretching: 'Étirements',
}

function normaliseType(type) {
  if (type === 'cooldown') return 'stretching'
  return labels[type] ? type : 'warmup'
}

function durationOf(exercise) {
  const value = Number(exercise?.duration_seconds ?? exercise?.durationSeconds ?? 0)
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function stopAudio() {
  audio.value?.pause()
  audio.value = null
  if (import.meta.client && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

function speak(text) {
  if (!import.meta.client || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  window.speechSynthesis.speak(utterance)
}

async function playCue() {
  const type = normalizedType.value
  const text = labels[type]
  cueMessage.value = text
  stopAudio()

  try {
    const player = new Audio('/sons/' + type + '.mp3')
    player.volume = 0.9
    audio.value = player
    await player.play()
  } catch {
    audio.value = null
    speak(text)
  }
}

function tick() {
  if (!running.value) return
  if (remainingSeconds.value > 0) {
    remainingSeconds.value -= 1
    if (remainingSeconds.value === 0) nextExercise()
  }
}

function toggleTimer() {
  running.value = !running.value
  emit('running-change', running.value)
  persistTimerState()
}

function persistTimerState() {
  if (!import.meta.client || sessionEnded) return
  localStorage.setItem(timerStorageKey, JSON.stringify({
    currentIndex: currentIndex.value,
    remainingSeconds: remainingSeconds.value,
    savedAt: new Date().toISOString(),
  }))
}

function restoreTimerState() {
  if (!import.meta.client || !props.resumeStored) {
    if (import.meta.client) localStorage.removeItem(timerStorageKey)
    return false
  }
  try {
    const stored = JSON.parse(localStorage.getItem(timerStorageKey) || 'null')
    if (!stored || !Number.isInteger(stored.currentIndex) || stored.currentIndex < 0 || stored.currentIndex >= props.exercises.length) return false
    currentIndex.value = stored.currentIndex
    remainingSeconds.value = Math.max(0, Math.min(Number(stored.remainingSeconds) || 0, durationOf(currentExercise.value)))
    running.value = false
    return true
  } catch {
    localStorage.removeItem(timerStorageKey)
    return false
  }
}

function clearTimerState() {
  if (import.meta.client) localStorage.removeItem(timerStorageKey)
}

function returnToWarmup() {
  running.value = false
  currentIndex.value = 0
  remainingSeconds.value = durationOf(props.exercises[0])
  emit('running-change', false)
  emit('exercise-change', 0)
  persistTimerState()
  playCue()
}

function nextExercise() {
  if (isLastExercise.value) {
    running.value = false
    sessionEnded = true
    emit('running-change', false)
    clearTimerState()
    emit('complete')
    return
  }

  currentIndex.value += 1
  remainingSeconds.value = durationOf(currentExercise.value)
  emit('exercise-change', currentIndex.value)
  persistTimerState()
  playCue()
}

function finishEarly() {
  running.value = false
  sessionEnded = true
  emit('running-change', false)
  clearTimerState()
  emit('finish')
}

function repeatCue() {
  playCue()
}

watch(running, async (isRunning) => {
  if (isRunning) await requestWakeLock()
  else await releaseWakeLock()
})

onMounted(async () => {
  restoreTimerState()
  if (running.value) await requestWakeLock()
  await playCue()
  timerId = window.setInterval(tick, 1000)
})

watch(remainingSeconds, persistTimerState)

onBeforeUnmount(() => {
  window.clearInterval(timerId)
  stopAudio()
  releaseWakeLock()
})
</script>

<template>
  <section class="active-session" :class="`exercise-${normalizedType}`">
    <nav class="session-topbar" aria-label="Navigation de la séance">
      <NuxtLink class="session-back" to="/" aria-label="Retour au programme">← Programme</NuxtLink>
      <span class="session-context" :title="`${seasonTitle} · ${weekTitle} · ${title}`">{{ weekTitle }} · {{ title }}</span>
    </nav>

    <div class="active-heading">
      <div>
        <p class="eyebrow">{{ labels[normalizedType] }}</p>
        <h1>{{ currentExercise?.title || labels[normalizedType] }}</h1>
        <p class="exercise-position">Exercice {{ currentIndex + 1 }} sur {{ exercises.length }}</p>
      </div>
      <span class="session-state" :class="running ? 'is-running' : 'is-paused'" role="status" aria-live="polite">
        <span aria-hidden="true">{{ running ? '●' : 'Ⅱ' }}</span>{{ running ? 'En cours' : 'En pause' }}
      </span>
    </div>

    <p class="cue-message" aria-live="polite">Consigne : {{ cueMessage }}</p>
    <section class="live-measurements" aria-label="Mesures automatiques de la séance">
      <div><small>Distance GPS</small><strong>{{ distanceKm.toFixed(2) }} <span>km</span></strong><em :class="`sensor-${gpsStatus}`">{{ gpsStatus === 'active' ? 'GPS actif' : gpsStatus === 'weak' ? 'Signal faible' : gpsStatus === 'denied' ? 'Refusé' : gpsStatus === 'unavailable' ? 'Indisponible' : 'Connexion…' }}</em></div>
      <div><small>Pas estimés</small><strong>{{ stepsCount }} <span>pas</span></strong><em :class="`sensor-${motionStatus}`">{{ motionStatus === 'active' ? 'Capteur actif' : motionStatus === 'denied' ? 'Refusé' : motionStatus === 'unavailable' ? 'Indisponible' : 'Connexion…' }}</em></div>
      <button v-if="!trackingActive || gpsStatus === 'denied' || motionStatus === 'denied'" type="button" class="text-button" @click="$emit('request-tracking')">Activer les mesures</button>
    </section>
    <p v-if="measurementMessage" class="measurement-message">{{ measurementMessage }}</p>
    <div class="timer-ring" :class="{ 'is-paused': !running }">
      <div class="timer" role="timer" :aria-label="`Temps restant : ${formatTime(remainingSeconds)}`" aria-live="off">
        {{ formatTime(remainingSeconds) }}
        <small>temps restant</small>
      </div>
    </div>

    <div class="session-controls">
      <button type="button" class="button button-large" :aria-pressed="running" @click="toggleTimer">
        {{ running ? 'Mettre en pause' : 'Reprendre' }}
      </button>
      <button type="button" class="button button-secondary" @click="nextExercise">
        {{ isLastExercise ? 'Terminer la séance' : 'Exercice suivant' }}
      </button>
    </div>
    <button v-if="!running && currentIndex > 0" type="button" class="button button-ghost return-warmup" @click="returnToWarmup">
      ↶ Revenir à l’échauffement
    </button>
    <button type="button" class="text-button repeat-cue" @click="repeatCue">Répéter la consigne</button>
    <button type="button" class="text-button danger finish-early" @click="finishEarly">Passer au bilan</button>

    <section class="exercise-history" aria-labelledby="timeline-title">
      <h2 id="timeline-title">Déroulé de la session</h2>
      <ol class="exercise-timeline">
        <li v-for="(exercise, index) in exercises" :key="exercise.id || index" :class="{ done: index < currentIndex, current: index === currentIndex }">
          <span class="timeline-dot" aria-hidden="true">{{ index < currentIndex ? '✓' : index + 1 }}</span>
          <span><strong>{{ exercise.title || labels[normaliseType(exercise.type)] }}</strong><small>{{ formatTime(durationOf(exercise)) }}</small></span>
          <em v-if="index < currentIndex">Terminé</em>
          <em v-else-if="index === currentIndex">En cours</em>
        </li>
      </ol>
      <NuxtLink class="text-button" to="/">← Retour au programme</NuxtLink>
    </section>
  </section>
</template>
