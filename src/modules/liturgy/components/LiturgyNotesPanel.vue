<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <GlassCard class="liturgy-notes">
    <h2 class="liturgy-notes__title">
      {{ t('liturgy.notes') }}
    </h2>
    <textarea
      class="liturgy-notes__input"
      :value="modelValue"
      :placeholder="t('liturgy.notesPlaceholder')"
      rows="12"
      @input="onInput"
    />
  </GlassCard>
</template>

<style scoped lang="scss">
.liturgy-notes {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  height: 100%;
  min-height: 12rem;
}

.liturgy-notes__title {
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  color: var(--ds-color-primary);
  font-size: 1.125rem;
  font-weight: 600;
}

.liturgy-notes__input {
  flex: 1;
  width: 100%;
  min-height: 10rem;
  resize: vertical;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  border-radius: var(--ds-radius-md, 0.75rem 0 0.75rem 0);
  background: color-mix(in srgb, var(--ds-color-surface) 55%, transparent);
  color: var(--ds-color-on-surface);
  padding: 0.85rem 1rem;
  font: inherit;
  line-height: 1.5;

  &::placeholder {
    color: color-mix(in srgb, var(--ds-color-on-surface) 45%, transparent);
  }

  &:focus {
    outline: 2px solid color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
    outline-offset: 1px;
  }
}
</style>
