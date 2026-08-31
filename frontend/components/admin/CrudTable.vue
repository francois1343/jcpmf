<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  canEdit: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: true },
  editLabel: { type: String, default: 'Modifier' },
})

defineEmits(['edit', 'delete'])
</script>

<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
          <th v-if="canEdit || canDelete">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row[rowKey]">
          <td v-for="column in columns" :key="column.key">{{ row[column.key] }}</td>
          <td v-if="canEdit || canDelete" class="actions">
            <button v-if="canEdit" type="button" class="text-button" @click="$emit('edit', row)">{{ editLabel }}</button>
            <button v-if="canDelete" type="button" class="text-button danger" @click="$emit('delete', row)">Supprimer</button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length + (canEdit || canDelete ? 1 : 0)">Aucune donnée.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: .75rem; border-bottom: 1px solid #ddd; text-align: left; }
.actions { display: flex; gap: .5rem; }
</style>
