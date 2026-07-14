<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <button
    type="button"
    class="settings-toggle"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="settings-toggle__track"
      :class="{ 'settings-toggle__track--on': modelValue }"
      aria-hidden="true"
    >
      <span class="settings-toggle__thumb" />
    </span>
  </button>
</template>

<style scoped lang="scss">
.settings-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.settings-toggle__track {
  position: relative;
  width: 2.75rem;
  height: 1.375rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-on-surface) 22%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  transition: background-color 200ms ease;

  &--on {
    background: var(--ds-color-primary);
    box-shadow: none;
  }
}

.settings-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
  transition: transform 200ms ease;

  .settings-toggle__track--on & {
    transform: translateX(1.375rem);
  }
}

.settings-toggle:focus-visible .settings-toggle__track {
  outline: 2px solid var(--ds-color-primary);
  outline-offset: 3px;
}

.settings-toggle:active .settings-toggle__thumb {
  transform: scale(0.96);
}

.settings-toggle__track--on:active .settings-toggle__thumb {
  transform: translateX(1.375rem) scale(0.96);
}
</style>
