<script setup>
const { user, api } = useAuth()
if (user.value?.role === 'admin') await navigateTo('/admin')

const errorMessage = ref('')
const statusFilter = ref('all')
const theme = useCookie('jcpmf-dashboard-theme', { default: () => 'forest', sameSite: 'lax' })
const { data: plan, error, refresh } = await useAsyncData('runner-plan', () => api('/runner/plan'))

const allSessions = computed(() => (
  (plan.value?.seasons || []).flatMap((season) => (
    season.weeks.flatMap((week) => week.sessions.map((session) => ({
      ...session,
      seasonTitle: season.title,
      weekTitle: week.title,
    })))
  ))
))

const progressPercent = computed(() => {
  const total = plan.value?.progress.total || 0
  return total ? Math.round((plan.value.progress.completed / total) * 100) : 0
})

const nextSession = computed(() => (
  allSessions.value.find((session) => session.status === 'in_progress')
  || allSessions.value.find((session) => session.status === 'not_started')
  || allSessions.value.at(-1)
))

const plannedMinutes = computed(() => Math.round(
  allSessions.value.reduce((total, session) => total + Number(session.durationSeconds || 0), 0) / 60,
))

const filteredCount = computed(() => (
  statusFilter.value === 'all'
    ? allSessions.value.length
    : allSessions.value.filter((session) => session.status === statusFilter.value).length
))

const filters = [
  { value: 'all', label: 'Toutes' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'not_started', label: 'À faire' },
  { value: 'completed', label: 'Terminées' },
]

const themes = [
  { value: 'forest', label: 'Forêt', icon: '●' },
  { value: 'sunrise', label: 'Aube', icon: '◐' },
  { value: 'night', label: 'Nuit', icon: '◑' },
]

function minutes(seconds) {
  return Math.max(1, Math.round(Number(seconds || 0) / 60))
}

async function reset(scope, id, label) {
  if (!confirm(`Réinitialiser la progression de « ${label} » ?`)) return
  errorMessage.value = ''
  try {
    await api(`/runner/progress/${scope}/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (requestError) {
    errorMessage.value = requestError?.data?.message || 'Réinitialisation impossible.'
  }
}
</script>

<template>
  <main class="page-shell dashboard-shell" :class="`theme-${theme}`">
    <section class="dashboard-hero">
      <span class="hero-orb hero-orb-one" aria-hidden="true" />
      <span class="hero-orb hero-orb-two" aria-hidden="true" />

      <div class="hero-copy">
        <div class="hero-topline">
          <p class="eyebrow">Votre terrain d’entraînement</p>
          <div class="theme-picker" aria-label="Thème du tableau de bord">
            <button
              v-for="item in themes"
              :key="item.value"
              type="button"
              :class="{ active: theme === item.value }"
              :aria-pressed="theme === item.value"
              :title="`Thème ${item.label}`"
              @click="theme = item.value"
            ><span aria-hidden="true">{{ item.icon }}</span><span class="theme-label">{{ item.label }}</span></button>
          </div>
        </div>

        <h1>Prêt·e pour la prochaine foulée,<br><span>{{ user?.username }}</span> ?</h1>
        <p class="hero-lead">Votre programme avance avec vous. Une séance régulière vaut mieux qu’un départ trop rapide.</p>

        <div v-if="nextSession" class="hero-actions">
          <NuxtLink :to="`/session/${nextSession.id}`" class="button button-glow button-large">
            {{ nextSession.status === 'in_progress' ? 'Reprendre la séance' : nextSession.status === 'completed' ? 'Voir le dernier bilan' : 'Lancer la prochaine séance' }}
            <span aria-hidden="true">→</span>
          </NuxtLink>
          <a href="#programme" class="hero-link">Explorer le programme</a>
        </div>
      </div>

      <div class="progress-orbit" :style="{ '--progress': `${progressPercent * 3.6}deg` }">
        <div class="progress-orbit-inner">
          <strong>{{ progressPercent }}%</strong>
          <span>{{ plan?.progress.completed || 0 }} sur {{ plan?.progress.total || 0 }}</span>
          <small>sessions</small>
        </div>
      </div>
    </section>

    <p v-if="error || errorMessage" class="error" role="alert">{{ errorMessage || 'Impossible de charger le programme.' }}</p>

    <section class="dashboard-metrics" aria-label="Votre progression en chiffres">
      <article>
        <span class="metric-icon" aria-hidden="true">↗</span>
        <div><strong>{{ plan?.progress.completed || 0 }}</strong><span>Séances accomplies</span></div>
      </article>
      <article>
        <span class="metric-icon" aria-hidden="true">◎</span>
        <div><strong>{{ plan?.seasons.length || 0 }}</strong><span>Saisons à parcourir</span></div>
      </article>
      <article>
        <span class="metric-icon" aria-hidden="true">◷</span>
        <div><strong>{{ plannedMinutes }}</strong><span>Minutes au programme</span></div>
      </article>
    </section>

    <section v-if="nextSession" class="next-session-card">
      <div class="next-session-copy">
        <p class="eyebrow">{{ nextSession.status === 'in_progress' ? 'À reprendre' : 'Prochaine étape' }}</p>
        <h2>{{ nextSession.title }}</h2>
        <p>{{ nextSession.seasonTitle }} <span>·</span> {{ nextSession.weekTitle }}</p>
      </div>
      <div class="session-preview">
        <span>{{ nextSession.exerciseCount }} exercices</span>
        <span>{{ minutes(nextSession.durationSeconds) }} min</span>
        <span class="status" :class="`status-${nextSession.status}`">{{ nextSession.status === 'in_progress' ? 'En cours' : nextSession.status === 'completed' ? 'Terminée' : 'À faire' }}</span>
      </div>
      <NuxtLink :to="`/session/${nextSession.id}`" class="round-arrow" :aria-label="`Ouvrir ${nextSession.title}`">→</NuxtLink>
    </section>

    <section id="programme" class="program-section">
      <header class="section-heading">
        <div>
          <p class="eyebrow">Saisons · Semaines · Sessions</p>
          <h2>Mon parcours</h2>
          <p>{{ filteredCount }} séance{{ filteredCount > 1 ? 's' : '' }} affichée{{ filteredCount > 1 ? 's' : '' }}</p>
        </div>
        <div class="filter-pills" aria-label="Filtrer les sessions">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            :class="{ active: statusFilter === filter.value }"
            :aria-pressed="statusFilter === filter.value"
            @click="statusFilter = filter.value"
          >{{ filter.label }}</button>
        </div>
      </header>

      <RunnerPlanHierarchy
        :seasons="plan?.seasons || []"
        :status-filter="statusFilter"
        @reset="reset"
      />
    </section>
  </main>
</template>
