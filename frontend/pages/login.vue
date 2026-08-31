<script setup>
const { login } = useAuth()
const identifier = ref('')
const password = ref('')
const errorMessage = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  errorMessage.value = ''
  try {
    const user = await login(identifier.value, password.value)
    await navigateTo(user.role === 'admin' ? '/admin' : '/')
  } catch (error) {
    errorMessage.value = error?.data?.message || 'Connexion impossible.'
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
        <h1>Connexion</h1>
      </div>
      <label>E-mail ou nom d’utilisateur <input v-model.trim="identifier" autocomplete="username" required></label>
      <label>Mot de passe <input v-model="password" type="password" autocomplete="current-password" required></label>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="button" :disabled="pending">{{ pending ? 'Connexion…' : 'Se connecter' }}</button>
      <NuxtLink to="/register">Créer un compte coureur</NuxtLink>
    </form>
  </main>
</template>
