<script setup>
defineProps({
  title: { type: String, required: true },
  stepLabel: { type: String, required: true },
  stepType: { type: String, default: 'other' },
  remainingSeconds: { type: Number, required: true },
  currentStep: { type: Number, required: true },
  stepCount: { type: Number, required: true },
  running: { type: Boolean, default: false },
})

defineEmits(['toggle', 'next', 'finish'])

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

const typeLabels = {
  warmup: 'Échauffement', run: 'Course', walk: 'Marche', sprint: 'Sprint',
  cooldown: 'Retour au calme', other: 'Exercice',
}
</script>

<template>
  <section class="active-session">
    <div class="active-heading">
      <div>
        <p class="eyebrow">{{ title }}</p>
        <h1>{{ stepLabel }}</h1>
        <span class="exercise-type">{{ typeLabels[stepType] }}</span>
      </div>
      <span>Étape {{ currentStep + 1 }}/{{ stepCount }}</span>
    </div>

    <div class="timer" role="timer" :aria-label="`${remainingSeconds} secondes restantes`">
      {{ formatTime(remainingSeconds) }}
    </div>
    <RunnerProgressTracker :value="currentStep + 1" :total="stepCount" />

    <div class="session-controls">
      <button type="button" class="button button-large" @click="$emit('toggle')">{{ running ? 'Pause' : 'Reprendre' }}</button>
      <button type="button" class="button button-secondary" @click="$emit('next')">Étape suivante</button>
    </div>
    <button type="button" class="text-button danger finish-early" @click="$emit('finish')">Passer au bilan</button>
  </section>
</template>
