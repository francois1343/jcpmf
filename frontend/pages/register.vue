<script setup>
const { register } = useAuth()
const form = reactive({ username: '', email: '', password: '' })
const errorMessage = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  errorMessage.value = ''
  try {
    await register(form.username, form.email, form.password)
    await navigateTo('/')
  } catch (error) {
    errorMessage.value = error?.data?.message || 'Inscription impossible.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <div>
        <p class="eyebrow">Je cours pour ma forme</p>
        <h1>Créer mon compte</h1>
      </div>
      <label>Nom d’utilisateur <input v-model.trim="form.username" minlength="3" maxlength="50" autocomplete="username" required></label>
      <label>E-mail <input v-model.trim="form.email" type="email" autocomplete="email" required></label>
      <label>Mot de passe <input v-model="form.password" type="password" minlength="10" autocomplete="new-password" required></label>
      <small>10 caractères minimum.</small>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="button" :disabled="pending">{{ pending ? 'Création…' : 'Créer mon compte' }}</button>
      <NuxtLink to="/login">J’ai déjà un compte</NuxtLink>
    </form>
  </main>
</template>
