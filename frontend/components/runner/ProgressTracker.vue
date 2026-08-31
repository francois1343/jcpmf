<script setup>
const props = defineProps({
  value: { type: Number, default: 0 },
  total: { type: Number, default: 100 },
})

const percentage = computed(() => {
  if (!props.total) return 0
  return Math.min(100, Math.max(0, Math.round((props.value / props.total) * 100)))
})
</script>

<template>
  <div class="tracker" :aria-label="`Progression : ${percentage} %`">
    <div class="bar" :style="{ width: `${percentage}%` }" />
    <span>{{ percentage }} %</span>
  </div>
</template>

<style scoped>
.tracker { position: relative; height: 1.5rem; overflow: hidden; border-radius: 999px; background: #e7ece8; }
.bar { height: 100%; background: #2b8a57; transition: width .25s ease; }
span { position: absolute; inset: 0; display: grid; place-items: center; font-size: .8rem; font-weight: 700; }
</style>
