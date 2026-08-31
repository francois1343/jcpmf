<script setup>
defineProps({ seasons: { type: Array, default: () => [] } })
defineEmits(['reset'])

function minutes(seconds) {
  return Math.max(1, Math.round(seconds / 60))
}

const statusLabels = {
  not_started: 'À faire',
  in_progress: 'En cours',
  completed: 'Terminée',
}
</script>

<template>
  <div class="plan">
    <details v-for="season in seasons" :key="season.id" class="season" open>
      <summary>
        <span><strong>{{ season.title }}</strong><small>{{ season.completedCount }}/{{ season.sessionCount }} sessions</small></span>
      </summary>
      <div class="details-actions">
        <button type="button" class="text-button danger" @click="$emit('reset', 'season', season.id, season.title)">Réinitialiser la saison</button>
      </div>
      <p v-if="season.description" class="muted">{{ season.description }}</p>

      <details v-for="week in season.weeks" :key="week.id" class="week">
        <summary>
          <span><strong>{{ week.title }}</strong><small>{{ week.completedCount }}/{{ week.sessions.length }} sessions</small></span>
        </summary>
        <div class="details-actions">
          <button type="button" class="text-button danger" @click="$emit('reset', 'week', week.id, week.title)">Réinitialiser la semaine</button>
        </div>

        <div class="session-list">
          <article v-for="session in week.sessions" :key="session.id" class="session-row">
            <div>
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
          <p v-if="!week.sessions.length" class="empty">Aucune session dans cette semaine.</p>
        </div>
      </details>
      <p v-if="!season.weeks.length" class="empty">Aucune semaine dans cette saison.</p>
    </details>
  </div>
</template>
