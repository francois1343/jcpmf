<script setup>
const props = defineProps({
  seasons: { type: Array, default: () => [] },
  statusFilter: { type: String, default: 'all' },
})
defineEmits(['reset'])

function minutes(seconds) {
  return Math.max(1, Math.round(seconds / 60))
}

const statusLabels = {
  not_started: 'À faire',
  in_progress: 'En cours',
  completed: 'Terminée',
}

function visibleSessions(week) {
  if (props.statusFilter === 'all') return week.sessions
  return week.sessions.filter((session) => session.status === props.statusFilter)
}

function visibleWeeks(season) {
  return season.weeks.filter((week) => visibleSessions(week).length)
}

function seasonPercent(season) {
  return season.sessionCount ? Math.round(season.completedCount * 100 / season.sessionCount) : 0
}
</script>

<template>
  <div class="plan">
    <details v-for="season in seasons" :key="season.id" class="season" open>
      <summary>
        <span class="season-summary-copy">
          <span class="season-number">{{ String(season.position).padStart(2, '0') }}</span>
          <span><strong>{{ season.title }}</strong><small>{{ season.completedCount }}/{{ season.sessionCount }} séances · {{ seasonPercent(season) }}%</small></span>
        </span>
        <span class="season-mini-progress" aria-hidden="true"><i :style="{ width: `${seasonPercent(season)}%` }" /></span>
      </summary>
      <div class="details-actions">
        <button type="button" class="text-button danger" @click="$emit('reset', 'season', season.id, season.title)">Réinitialiser la saison</button>
      </div>
      <p v-if="season.description" class="muted">{{ season.description }}</p>

      <details v-for="week in visibleWeeks(season)" :key="week.id" class="week" :open="statusFilter !== 'all'">
        <summary>
          <span><strong>{{ week.title }}</strong><small>{{ week.completedCount }}/{{ week.sessions.length }} séances</small></span>
        </summary>
        <div class="details-actions">
          <button type="button" class="text-button danger" @click="$emit('reset', 'week', week.id, week.title)">Réinitialiser la semaine</button>
        </div>

        <div class="session-list">
          <article v-for="session in visibleSessions(week)" :key="session.id" class="session-row" :class="`session-row-${session.status}`">
            <span class="session-step" aria-hidden="true">{{ session.status === 'completed' ? '✓' : session.position }}</span>
            <div class="session-copy">
              <span class="status" :class="`status-${session.status}`">{{ statusLabels[session.status] }}</span>
              <h3>{{ session.title }}</h3>
              <p>{{ session.exerciseCount }} exercices · {{ minutes(session.durationSeconds) }} min</p>
              <p v-if="session.status === 'completed'" class="result">
                <span v-if="session.distanceKm !== null">{{ session.distanceKm }} km</span>
                <span v-if="session.stepsCount !== null">{{ session.stepsCount }} pas</span>
              </p>
            </div>
            <div class="session-actions">
              <NuxtLink class="button" :to="`/session/${session.id}`">
                {{ session.status === 'in_progress' ? 'Reprendre' : session.status === 'completed' ? 'Voir le bilan' : 'Démarrer' }}
              </NuxtLink>
              <button
                v-if="session.status !== 'not_started'"
                type="button"
                class="button button-ghost danger"
                @click="$emit('reset', 'session', session.id, session.title)"
              >Réinitialiser</button>
            </div>
          </article>
          <p v-if="!visibleSessions(week).length" class="empty">Aucune session ne correspond à ce filtre.</p>
        </div>
      </details>
      <p v-if="!visibleWeeks(season).length" class="empty filtered-empty">Aucune session de cette saison ne correspond au filtre.</p>
    </details>
  </div>
</template>
