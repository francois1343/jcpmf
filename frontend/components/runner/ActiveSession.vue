<script setup>
const props = defineProps({
  title: { type: String, required: true },
  seasonTitle: { type: String, default: '' },
  weekTitle: { type: String, default: '' },
  exercises: { type: Array, required: true },
  initialExerciseIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['exercise-change', 'complete', 'finish'])
const { requestWakeLock, releaseWakeLock } = useWakeLock()

const currentIndex = ref(Math.max(0, Math.min(props.initialExerciseIndex, Math.max(props.exercises.length - 1, 0))))
const running = ref(true)
const remainingSeconds = ref(durationOf(props.exercises[currentIndex.value]))
const cueMessage = ref('')
const audio = shallowRef(null)
let timerId

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
}

function nextExercise() {
  if (isLastExercise.value) {
    running.value = false
    emit('complete')
    return
  }

  currentIndex.value += 1
  remainingSeconds.value = durationOf(currentExercise.value)
  emit('exercise-change', currentIndex.value)
  playCue()
}

function repeatCue() {
  playCue()
}

watch(running, async (isRunning) => {
  if (isRunning) await requestWakeLock()
  else await releaseWakeLock()
})

onMounted(async () => {
  await requestWakeLock()
  await playCue()
  timerId = window.setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timerId)
  stopAudio()
  releaseWakeLock()
})
</script>

<template>
  <section class="active-session" :class="`exercise-${normalizedType}`">
    <nav class="session-breadcrumb" aria-label="Fil d’Ariane de la séance">
      <NuxtLink to="/">Programme</NuxtLink>
      <span>Saisons</span>
      <span>{{ seasonTitle }}</span>
      <span>{{ weekTitle }}</span>
      <strong>{{ title }}</strong>
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
    <button type="button" class="text-button repeat-cue" @click="repeatCue">Répéter la consigne</button>
    <button type="button" class="text-button danger finish-early" @click="$emit('finish')">Passer au bilan</button>

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
      <NuxtLink class="text-button" to="/">Retour au programme et à la hiérarchie complète</NuxtLink>
    </section>
  </section>
</template>
