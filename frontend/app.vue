<script setup>
const route = useRoute()
const { user, token, logout } = useAuth()
const config = useRuntimeConfig()
const { isOnline, pendingCount, syncPending } = useOfflineStore()
const showNavigation = computed(() => !['/login', '/register'].includes(route.path))

async function syncNow() {
  if (!token.value) return
  const scope = user.value?.id ? `user-${user.value.id}` : offlineScopeFromToken(token.value)
  await syncPending(scope, token.value, config.public.apiBase)
}
</script>

<template>
  <div>
    <nav v-if="showNavigation" class="app-nav">
      <NuxtLink :to="user?.role === 'admin' ? '/admin' : '/'" class="brand">JCPMF</NuxtLink>
      <div class="nav-actions">
        <span>{{ user?.username }}</span>
        <NuxtLink v-if="user?.role === 'admin'" to="/admin">Administration</NuxtLink>
        <NuxtLink v-else to="/profil" class="profile-link">Mon profil</NuxtLink>
        <button type="button" class="button button-ghost" @click="logout">Déconnexion</button>
      </div>
    </nav>
    <aside v-if="showNavigation && (!isOnline || pendingCount)" class="offline-banner" role="status">
      <span aria-hidden="true">{{ isOnline ? '↻' : '⌁' }}</span>
      <p v-if="!isOnline"><strong>Mode hors-ligne</strong> Votre programme reste disponible. Les actions seront synchronisées plus tard.</p>
      <p v-else><strong>Synchronisation en attente</strong> {{ pendingCount }} action{{ pendingCount > 1 ? 's' : '' }} à envoyer.</p>
      <button v-if="isOnline" type="button" class="text-button" @click="syncNow">Synchroniser</button>
    </aside>
    <NuxtPage />
  </div>
</template>
