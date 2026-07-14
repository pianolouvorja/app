<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ClockProjectionView from '@modules/clock/views/ClockProjectionView.vue'

const route = useRoute()

const moduleId = computed(() => {
  const value = route.query.module
  return typeof value === 'string' ? value : ''
})
</script>

<template>
  <ClockProjectionView v-if="moduleId === 'clock'" />
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
