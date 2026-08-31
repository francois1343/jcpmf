<script setup>
const route = useRoute()
const { api } = useAuth()
const { requestWakeLock, releaseWakeLock } = useWakeLock()
const { data: session, error } = await useAsyncData(
  `session-${route.params.id}`,
  () => api(`/runner/sessions/${route.params.id}`),
)

const phase = ref(
  session.value?.status === 'in_progress'
    ? 'active'
    : session.value?.status === 'completed' ? 'history' : 'intro',
)
const currentIndex = ref(session.value?.currentExerciseIndex || 0)
const remainingSeconds = ref(session.value?.exercises[currentIndex.value]?.durationSeconds || 0)
const running = ref(false)
const advancing = ref(false)
const result = reactive({ distanceKm: session.value?.distanceKm ?? '', stepsCount: session.value?.stepsCount ?? '' })
const errorMessage = ref('')
let timer

const currentExercise = computed(() => session.value?.exercises[currentIndex.value])

onMounted(async () => {
  if (phase.value === 'active') {
    running.value = true
    await requestWakeLock()
  }
  timer = window.setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  releaseWakeLock()
})

function tick() {
  if (!running.value || advancing.value || phase.value !== 'active') return
  if (remainingSeconds.value > 0) {
    remainingSeconds.value -= 1
    if (remainingSeconds.value === 0) advance()
  }
}

async function start() {
  if (!session.value.exercises.length) {
    errorMessage.value = 'Cette session ne contient aucun exercice.'
    return
  }
  errorMessage.value = ''
  await api(`/runner/sessions/${session.value.id}/start`, { method: 'PUT' })
  currentIndex.value = 0
  remainingSeconds.value = session.value.exercises[0].durationSeconds
  phase.value = 'active'
  running.value = true
  await requestWakeLock()
}

function toggleTimer() {
  running.value = !running.value
  if (running.value) requestWakeLock()
}

async function advance() {
  if (advancing.value) return
  advancing.value = true
  try {
    const nextIndex = currentIndex.value + 1
    if (nextIndex >= session.value.exercises.length) {
      running.value = false
      phase.value = 'result'
      await releaseWakeLock()
      return
    }

    currentIndex.value = nextIndex
    remainingSeconds.value = session.value.exercises[nextIndex].durationSeconds
    await api(`/runner/sessions/${session.value.id}/progress`, {
      method: 'PATCH', body: { currentExerciseIndex: nextIndex },
    })
  } catch (requestError) {
    running.value = false
    errorMessage.value = requestError?.data?.message || 'Progression non enregistrée.'
  } finally {
    advancing.value = false
  }
}

async function showResult() {
  running.value = false
  phase.value = 'result'
  await releaseWakeLock()
}

async function complete() {
  errorMessage.value = ''
  try {
    await api(`/runner/sessions/${session.value.id}/complete`, {
      method: 'PUT',
      body: {
        distanceKm: result.distanceKm === '' ? null : Number(result.distanceKm),
        stepsCount: result.stepsCount === '' ? null : Number(result.stepsCount),
      },
    })
    phase.value = 'completed'
  } catch (requestError) {
    errorMessage.value = requestError?.data?.message || 'Bilan non enregistré.'
  }
}
</script>

<template>
  <main class="page-shell session-page">
    <p v-if="error" class="error">Session introuvable ou indisponible.</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <section v-if="session && phase === 'intro'" class="card session-intro">
      <p class="eyebrow">{{ session.seasonTitle }} · {{ session.weekTitle }}</p>
      <h1>{{ session.title }}</h1>
      <p>{{ session.description }}</p>
      <ol class="exercise-list">
        <li v-for="exercise in session.exercises" :key="exercise.id">
          <span>{{ exercise.title }}</span><strong>{{ Math.ceil(exercise.durationSeconds / 60) }} min</strong>
        </li>
      </ol>
      <button type="button" class="button button-large" @click="start">Lancer la session</button>
    </section>

    <RunnerActiveSession
      v-else-if="session && phase === 'active' && currentExercise"
      :title="session.title"
      :step-label="currentExercise.title"
      :step-type="currentExercise.type"
      :remaining-seconds="remainingSeconds"
      :current-step="currentIndex"
      :step-count="session.exercises.length"
      :running="running"
      @toggle="toggleTimer"
      @next="advance"
      @finish="showResult"
    />

    <section v-else-if="session && phase === 'result'" class="card result-form">
      <p class="eyebrow">Bilan de session</p>
      <h1>Bravo, entraînement terminé !</h1>
      <p>Renseignez au moins une des deux valeurs.</p>
      <form @submit.prevent="complete">
        <label>Distance parcourue (km)<input v-model="result.distanceKm" type="number" min="0" max="1000" step="0.01" inputmode="decimal"></label>
        <label>Nombre de pas<input v-model="result.stepsCount" type="number" min="0" max="1000000" step="1" inputmode="numeric"></label>
        <button class="button button-large">Enregistrer le bilan</button>
      </form>
    </section>

    <section v-else-if="session && phase === 'completed'" class="card result-form">
      <p class="eyebrow">Session enregistrée</p>
      <h1>Votre progression est à jour.</h1>
      <div class="result-summary">
        <strong v-if="result.distanceKm !== ''">{{ result.distanceKm }} km</strong>
        <strong v-if="result.stepsCount !== ''">{{ result.stepsCount }} pas</strong>
      </div>
      <NuxtLink to="/" class="button button-large">Retour au programme</NuxtLink>
    </section>

    <section v-else-if="session && phase === 'history'" class="card result-form">
      <p class="eyebrow">Session terminée</p>
      <h1>{{ session.title }}</h1>
      <div class="result-summary">
        <strong v-if="session.distanceKm !== null">{{ session.distanceKm }} km</strong>
        <strong v-if="session.stepsCount !== null">{{ session.stepsCount }} pas</strong>
      </div>
      <NuxtLink to="/" class="button">Retour au programme</NuxtLink>
    </section>
  </main>
</template>
