<script setup>
const { user, api } = useAuth()
if (user.value?.role === 'admin') await navigateTo('/admin')
const activePanel = ref('profile')
const message = ref('')
const errorMessage = ref('')
const resetting = ref(false)

async function resetAll() {
  if (!confirm('Réinitialiser toute votre progression ? Vos sessions et bilans seront effacés.')) return
  message.value = ''
  errorMessage.value = ''
  resetting.value = true
  try {
    await api('/runner/progress/all', { method: 'DELETE' })
    message.value = 'Votre progression a été réinitialisée.'
  } catch (error) {
    errorMessage.value = error?.data?.message || 'Réinitialisation impossible.'
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <main class="page-shell profile-page">
    <header class="profile-header">
      <div class="profile-avatar" aria-hidden="true">{{ user?.username?.slice(0, 1).toUpperCase() }}</div>
      <div>
        <p class="eyebrow">Espace personnel</p>
        <h1>Mon profil</h1>
        <p>Retrouvez votre compte et les réglages de votre parcours.</p>
      </div>
    </header>

    <div class="profile-tabs" role="tablist" aria-label="Sections du profil">
      <button type="button" role="tab" :aria-selected="activePanel === 'profile'" :class="{ active: activePanel === 'profile' }" @click="activePanel = 'profile'">Mon profil</button>
      <button type="button" role="tab" :aria-selected="activePanel === 'program'" :class="{ active: activePanel === 'program' }" @click="activePanel = 'program'">Mon programme</button>
    </div>

    <p v-if="message" class="success-message" role="status">{{ message }}</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <section v-if="activePanel === 'profile'" class="profile-card card" role="tabpanel">
      <div class="profile-field"><span>Nom d’utilisateur</span><strong>{{ user?.username }}</strong></div>
      <div class="profile-field"><span>Adresse e-mail</span><strong>{{ user?.email }}</strong></div>
      <div class="profile-field"><span>Type de compte</span><strong>{{ user?.role === 'admin' ? 'Administrateur' : 'Coureur' }}</strong></div>
    </section>

    <section v-else class="profile-program card" role="tabpanel">
      <div class="profile-program-intro">
        <div class="profile-program-icon" aria-hidden="true">↗</div>
        <div>
          <h2>Mon programme</h2>
          <p>Les réinitialisations d’une session, d’une semaine ou d’une saison restent disponibles directement dans votre parcours.</p>
        </div>
        <NuxtLink to="/#programme" class="button button-ghost">Voir mon parcours</NuxtLink>
      </div>

      <details class="advanced-settings">
        <summary>
          <span><strong>Options avancées</strong><small>Réinitialisation complète du programme</small></span>
        </summary>
        <div class="advanced-settings-content">
          <div>
            <strong>Réinitialiser tout le programme</strong>
            <p>Efface uniquement votre progression et vos bilans. Le contenu du programme et votre compte sont conservés.</p>
          </div>
          <button type="button" class="button button-danger" :disabled="resetting" @click="resetAll">
            {{ resetting ? 'Réinitialisation…' : 'Tout réinitialiser' }}
          </button>
        </div>
      </details>
    </section>
  </main>
</template>
