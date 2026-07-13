<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  project: []
}>()

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="bible-project-fab"
    :disabled="disabled"
    :aria-label="t('bible.project')"
    :title="t('bible.project')"
    @click="emit('project')"
  >
    <i
      class="mdi mdi-play"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped lang="scss">
.bible-project-fab {
  position: fixed;
  right: 2rem;
  bottom: calc(var(--ds-dock-height, 5.5rem) + 1.25rem);
  z-index: 35;
  width: 4rem;
  height: 4rem;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary, #003258);
  box-shadow: 0 8px 30px color-mix(in srgb, var(--ds-color-primary-soft) 40%, transparent);
  cursor: pointer;
  transition:
    transform 160ms ease,
    opacity 160ms ease;

  .mdi {
    font-size: 2rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    transform: scale(1.08);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
</style>
