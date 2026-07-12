<script setup lang="ts">
import { computed } from 'vue'

import { useBlurSystem } from '@design-system/composables'

withDefaults(
  defineProps<{
    padding?: boolean
    elevated?: boolean
  }>(),
  {
    padding: true,
    elevated: false,
  },
)

const { backdropFilter } = useBlurSystem()

const style = computed(() => ({
  backdropFilter: backdropFilter.value,
  WebkitBackdropFilter: backdropFilter.value,
}))
</script>

<template>
  <div
    class="ds-glass-card"
    :class="{
      'ds-glass-card--padded': padding,
      'ds-glass-card--elevated': elevated,
    }"
    :style="style"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.ds-glass-card {
  border-radius: var(--ds-radius-lg);
  background: color-mix(in srgb, var(--ds-color-surface-card) 72%, transparent);
  border: 1px solid var(--ds-color-outline-strong);
  color: var(--ds-color-on-surface);
  transition:
    background-color 280ms ease,
    border-color 280ms ease,
    transform 200ms ease;

  &--padded {
    padding: var(--ds-spacing-page, 20px);
    padding: 20px;
  }

  &--elevated {
    background: color-mix(in srgb, var(--ds-color-surface-elevated) 80%, transparent);
  }

  &:hover {
    background: color-mix(in srgb, var(--ds-color-surface-card) 88%, transparent);
  }
}
</style>
