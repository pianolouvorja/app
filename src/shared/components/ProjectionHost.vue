<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const _moduleId = computed(() => {
  const value = route.query.module
  return typeof value === 'string' ? value : ''
})
</script>

<template>
  <ClockProjectionView v-if="moduleId === 'clock'" />
  <TimerProjectionView v-else-if="moduleId === 'timer'" />
  <CountdownProjectionView v-else-if="moduleId === 'countdown'" />
  <RandomProjectionView v-else-if="moduleId === 'random'" />
  <BibleProjectionView v-else-if="moduleId === 'bible'" />
  <MediaProjectionView v-else-if="moduleId === 'media'" />
  <LiturgyWebProjectionView v-else-if="moduleId === 'liturgy-web'" />
  <div
    v-else
    class="projection-host-empty"
  />
</template>

<style scoped lang="scss">
.projection-host-empty {
  width: 100vw;
  height: 100vh;
  background: #000;
}
</style>
