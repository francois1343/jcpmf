<script setup>
const { api } = useAuth()
const activeSection = ref('content')
const selectedResource = ref('seasons')
const editingId = ref(null)
const form = reactive({})
const errorMessage = ref('')
const userDetail = ref(null)

const definitions = {
  seasons: {
    label: 'Saisons',
    columns: [{ key: 'title', label: 'Titre' }, { key: 'position', label: 'Position' }],
    fields: [
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'position', label: 'Position', type: 'number', required: true },
    ],
  },
  weeks: {
    label: 'Semaines',
    columns: [{ key: 'seasonTitle', label: 'Saison' }, { key: 'title', label: 'Titre' }, { key: 'position', label: 'Position' }],
    fields: [
      { key: 'seasonId', label: 'Saison', type: 'season', required: true },
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'position', label: 'Position', type: 'number', required: true },
    ],
  },
  sessions: {
    label: 'Sessions',
    columns: [{ key: 'weekTitle', label: 'Semaine' }, { key: 'title', label: 'Titre' }, { key: 'position', label: 'Position' }],
    fields: [
      { key: 'weekId', label: 'Semaine', type: 'week', required: true },
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'position', label: 'Position', type: 'number', required: true },
    ],
  },
  exercises: {
    label: 'Exercices',
    columns: [
      { key: 'sessionTitle', label: 'Session' }, { key: 'title', label: 'Titre' },
      { key: 'type', label: 'Type' }, { key: 'durationSeconds', label: 'Durée (s)' }, { key: 'position', label: 'Position' },
    ],
    fields: [
      { key: 'trainingSessionId', label: 'Session', type: 'session', required: true },
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'exerciseType', required: true },
      { key: 'durationSeconds', label: 'Durée (secondes)', type: 'number', required: true },
      { key: 'position', label: 'Position', type: 'number', required: true },
    ],
  },
}

const exerciseTypes = [
  { value: 'warmup', label: 'Échauffement' }, { value: 'run', label: 'Course' },
  { value: 'walk', label: 'Marche' }, { value: 'sprint', label: 'Sprint' },
  { value: 'cooldown', label: 'Retour au calme' }, { value: 'other', label: 'Autre' },
]

async function fetchAdminData() {
  const [seasons, weeks, sessions, exercises, users] = await Promise.all([
    api('/admin/content/seasons'), api('/admin/content/weeks'), api('/admin/content/sessions'),
    api('/admin/content/exercises'), api('/admin/users'),
  ])
  return { seasons, weeks, sessions, exercises, users }
}

const { data, error, refresh } = await useAsyncData('admin-data', fetchAdminData)
const currentDefinition = computed(() => definitions[selectedResource.value])
const currentRows = computed(() => data.value?.[selectedResource.value] || [])

function optionsFor(field) {
  if (field.type === 'season') return (data.value?.seasons || []).map((item) => ({ value: item.id, label: item.title }))
  if (field.type === 'week') return (data.value?.weeks || []).map((item) => ({ value: item.id, label: `${item.seasonTitle} — ${item.title}` }))
  if (field.type === 'session') return (data.value?.sessions || []).map((item) => ({ value: item.id, label: `${item.weekTitle} — ${item.title}` }))
  if (field.type === 'exerciseType') return exerciseTypes
  return []
}

function resetForm() {
  editingId.value = null
  for (const key of Object.keys(form)) delete form[key]
  for (const field of currentDefinition.value.fields) {
    form[field.key] = field.type === 'number' ? 1 : ''
  }
}

function switchResource(resource) {
  selectedResource.value = resource
  nextTick(resetForm)
}

function edit(row) {
  editingId.value = row.id
  for (const key of Object.keys(form)) delete form[key]
  for (const field of currentDefinition.value.fields) form[field.key] = row[field.key] ?? ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function save() {
  errorMessage.value = ''
  try {
    const path = `/admin/content/${selectedResource.value}${editingId.value ? `/${editingId.value}` : ''}`
    await api(path, { method: editingId.value ? 'PUT' : 'POST', body: { ...form } })
    await refresh()
    resetForm()
  } catch (requestError) {
    errorMessage.value = requestError?.data?.message || 'Enregistrement impossible.'
  }
}

async function remove(row) {
  if (!confirm(`Supprimer « ${row.title} » et ses éléments enfants ?`)) return
  await api(`/admin/content/${selectedResource.value}/${row.id}`, { method: 'DELETE' })
  await refresh()
  if (editingId.value === row.id) resetForm()
}

async function showUser(row) {
  errorMessage.value = ''
  try {
    userDetail.value = await api(`/admin/users/${row.id}/progress`)
  } catch (requestError) {
    errorMessage.value = requestError?.data?.message || 'Progression indisponible.'
  }
}

watch(selectedResource, resetForm, { immediate: true })
</script>

<template>
  <main class="page-shell admin-page">
    <header class="page-heading">
      <div><p class="eyebrow">Back-office</p><h1>Administration JCPMS</h1></div>
      <button type="button" class="button button-secondary" @click="refresh">Actualiser</button>
    </header>

    <div class="tabs">
      <button type="button" :class="{ active: activeSection === 'content' }" @click="activeSection = 'content'">Contenu du programme</button>
      <button type="button" :class="{ active: activeSection === 'users' }" @click="activeSection = 'users'">Suivi des coureurs</button>
    </div>
    <p v-if="error || errorMessage" class="error" role="alert">{{ errorMessage || 'Chargement impossible.' }}</p>

    <template v-if="activeSection === 'content'">
      <div class="resource-tabs">
        <button
          v-for="(definition, key) in definitions" :key="key" type="button"
          :class="{ active: selectedResource === key }" @click="switchResource(key)"
        >{{ definition.label }}</button>
      </div>

      <section class="admin-grid">
        <form class="card admin-form" @submit.prevent="save">
          <h2>{{ editingId ? 'Modifier' : 'Créer' }} · {{ currentDefinition.label }}</h2>
          <label v-for="field in currentDefinition.fields" :key="field.key">
            {{ field.label }}
            <textarea v-if="field.type === 'textarea'" v-model.trim="form[field.key]" rows="4" />
            <select v-else-if="['season', 'week', 'session', 'exerciseType'].includes(field.type)" v-model.number="form[field.key]" :required="field.required">
              <option disabled value="">Sélectionner</option>
              <option v-for="option in optionsFor(field)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input v-else v-model="form[field.key]" :type="field.type" :min="field.type === 'number' ? 0 : undefined" :required="field.required">
          </label>
          <div class="form-actions">
            <button class="button">{{ editingId ? 'Enregistrer' : 'Créer' }}</button>
            <button v-if="editingId" type="button" class="button button-ghost" @click="resetForm">Annuler</button>
          </div>
        </form>

        <section class="card content-table">
          <h2>{{ currentDefinition.label }}</h2>
          <AdminCrudTable :rows="currentRows" :columns="currentDefinition.columns" @edit="edit" @delete="remove" />
        </section>
      </section>
    </template>

    <template v-else>
      <section class="card">
        <h2>Coureurs inscrits</h2>
        <AdminCrudTable
          :rows="data?.users || []"
          :columns="[
            { key: 'username', label: 'Utilisateur' }, { key: 'email', label: 'E-mail' },
            { key: 'completedSessions', label: 'Sessions terminées' }, { key: 'progressPercent', label: 'Progression (%)' },
          ]"
          :can-delete="false" edit-label="Voir" @edit="showUser"
        />
      </section>

      <section v-if="userDetail" class="card user-detail">
        <div class="page-heading">
          <div><p class="eyebrow">Progression</p><h2>{{ userDetail.user.username }}</h2><p>{{ userDetail.user.email }}</p></div>
          <button type="button" class="text-button" @click="userDetail = null">Fermer</button>
        </div>
        <AdminCrudTable
          :rows="userDetail.sessions"
          :columns="[
            { key: 'seasonTitle', label: 'Saison' }, { key: 'weekTitle', label: 'Semaine' },
            { key: 'sessionTitle', label: 'Session' }, { key: 'status', label: 'Statut' },
            { key: 'distanceKm', label: 'Distance (km)' }, { key: 'stepsCount', label: 'Pas' },
          ]"
          :can-edit="false" :can-delete="false"
        />
      </section>
    </template>
  </main>
</template>
