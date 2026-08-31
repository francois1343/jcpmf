<script setup>
const { user, api } = useAuth()
if (user.value?.role === 'admin') await navigateTo('/admin')

const errorMessage = ref('')
const { data: plan, error, refresh } = await useAsyncData('runner-plan', () => api('/runner/plan'))

const progressPercent = computed(() => {
  const total = plan.value?.progress.total || 0
  return total ? Math.round((plan.value.progress.completed / total) * 100) : 0
})

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

async function resetAll() {
  if (!confirm('Réinitialiser toute votre progression ? Cette action est irréversible.')) return
  await api('/runner/progress/all', { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <main class="page-shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Tableau de bord</p>
        <h1>Bonjour {{ user?.username }}</h1>
        <p>Avancez à votre rythme, une session après l’autre.</p>
      </div>
      <div class="progress-card">
        <strong>{{ plan?.progress.completed || 0 }}/{{ plan?.progress.total || 0 }}</strong>
        <span>sessions accomplies</span>
        <RunnerProgressTracker :value="progressPercent" :total="100" />
      </div>
    </section>

    <p v-if="error || errorMessage" class="error" role="alert">{{ errorMessage || 'Impossible de charger le programme.' }}</p>
    <RunnerPlanHierarchy :seasons="plan?.seasons || []" @reset="reset" />

    <section class="danger-zone">
      <div><strong>Réinitialiser tout le programme</strong><p>Efface uniquement votre progression et vos bilans.</p></div>
      <button type="button" class="button button-danger" @click="resetAll">Tout réinitialiser</button>
    </section>
  </main>
</template>
