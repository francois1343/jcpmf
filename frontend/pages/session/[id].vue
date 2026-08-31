<script setup>
const route = useRoute()
const { api } = useAuth()
const { data: session, error } = await useAsyncData(
  `session-${route.params.id}`,
  () => api(`/runner/sessions/${route.params.id}`),
)

const phase = ref(
  session.value?.status === 'in_progress'
    ? 'active'
    : session.value?.status === 'completed' ? 'history' : 'intro',
)
const result = reactive({ distanceKm: session.value?.distanceKm ?? '', stepsCount: session.value?.stepsCount ?? '' })
const errorMessage = ref('')
const resumeStored = ref(session.value?.status === 'in_progress')
const tracking = useSessionTracking(route.params.id)

function durationOf(exercise) {
  return Number(exercise.duration_seconds ?? exercise.durationSeconds ?? 0)
}

async function start() {
  if (!session.value.exercises.length) {
    errorMessage.value = 'Cette session ne contient aucun exercice.'
    return
  }
  errorMessage.value = ''
  try {
    await tracking.startTracking({ reset: true })
    await api(`/runner/sessions/${session.value.id}/start`, { method: 'PUT' })
    resumeStored.value = false
    phase.value = 'active'
  } catch (requestError) {
    tracking.stopTracking()
    errorMessage.value = requestError?.data?.message || 'Impossible de démarrer la séance.'
  }
}

async function saveExerciseProgress(currentExerciseIndex) {
  try {
    await api(`/runner/sessions/${session.value.id}/progress`, {
      method: 'PATCH', body: { currentExerciseIndex },
    })
  } catch (requestError) {
    errorMessage.value = requestError?.data?.message || 'Progression non enregistrée.'
  }
}

function showResult() {
  tracking.stopTracking()
  result.distanceKm = tracking.distanceKm.value
  result.stepsCount = tracking.stepsCount.value
  phase.value = 'result'
}

async function complete() {
  errorMessage.value = ''
  try {
    await api(`/runner/sessions/${session.value.id}/complete`, {
      method: 'PUT',
      body: {
        distanceKm: Number(tracking.distanceKm.value),
        stepsCount: Number(tracking.stepsCount.value),
      },
    })
    phase.value = 'completed'
  } catch (requestError) {
    errorMessage.value = requestError?.data?.message || 'Bilan non enregistré.'
  }
}

onMounted(() => {
  if (phase.value === 'active') tracking.startTracking({ reset: false })
})
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
          <span>{{ exercise.title }}</span><strong>{{ Math.ceil(durationOf(exercise) / 60) }} min</strong>
        </li>
      </ol>
      <p class="measurement-consent">Au lancement, autorisez la localisation et les mouvements pour calculer automatiquement votre distance et estimer vos pas.</p>
      <button type="button" class="button button-large" @click="start">Lancer la session</button>
    </section>

    <RunnerActiveSession
      v-else-if="session && phase === 'active'"
      :title="session.title"
      :season-title="session.seasonTitle"
      :week-title="session.weekTitle"
      :exercises="session.exercises"
      :initial-exercise-index="session.currentExerciseIndex"
      :session-id="session.id"
      :resume-stored="resumeStored"
      :distance-km="tracking.distanceKm.value"
      :steps-count="tracking.stepsCount.value"
      :tracking-active="tracking.isTracking.value"
      :gps-status="tracking.gpsStatus.value"
      :motion-status="tracking.motionStatus.value"
      :measurement-message="tracking.measurementMessage.value"
      @exercise-change="saveExerciseProgress"
      @running-change="tracking.setTrackingActive"
      @request-tracking="tracking.startTracking({ reset: false })"
      @complete="showResult"
      @finish="showResult"
    />

    <section v-else-if="session && phase === 'result'" class="card result-form">
      <p class="eyebrow">Bilan de session</p>
      <h1>Bravo, entraînement terminé !</h1>
      <p>Les valeurs ont été calculées automatiquement pendant votre séance.</p>
      <div class="automatic-result-grid">
        <article><span aria-hidden="true">⌖</span><small>Distance parcourue</small><strong>{{ Number(result.distanceKm || 0).toFixed(2) }} km</strong></article>
        <article><span aria-hidden="true">↟</span><small>Pas estimés</small><strong>{{ Number(result.stepsCount || 0) }} pas</strong></article>
      </div>
      <p class="measurement-disclaimer">La distance dépend de la précision GPS. Le nombre de pas est une estimation issue du capteur de mouvement du téléphone.</p>
      <button type="button" class="button button-large" @click="complete">Enregistrer automatiquement le bilan</button>
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
