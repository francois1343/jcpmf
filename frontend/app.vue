<script setup>
const route = useRoute()
const { user, logout } = useAuth()
const showNavigation = computed(() => !['/login', '/register'].includes(route.path))
</script>

<template>
  <div>
    <nav v-if="showNavigation" class="app-nav">
      <NuxtLink :to="user?.role === 'admin' ? '/admin' : '/'" class="brand">JCPMF</NuxtLink>
      <div class="nav-actions">
        <span>{{ user?.username }}</span>
        <NuxtLink v-if="user?.role === 'admin'" to="/admin">Administration</NuxtLink>
        <button type="button" class="button button-ghost" @click="logout">Déconnexion</button>
      </div>
    </nav>
    <NuxtPage />
  </div>
</template>
