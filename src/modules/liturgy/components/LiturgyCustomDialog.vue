<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

defineProps<{
  open: boolean
  name: string
}>()

const emit = defineEmits<{
  close: []
  create: []
  'update:name': [value: string]
}>()

const { t } = useI18n()


function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:name', target.value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="liturgy-dialog-backdrop"
    >
      <GlassCard
        class="liturgy-dialog"
        elevated
      >
        <h2 class="liturgy-dialog__title">
          {{ t('liturgy.custom.new') }}
        </h2>

        <label class="liturgy-dialog__field">
          <span>{{ t('liturgy.fields.name') }}</span>
          <input
            :value="name"
            type="text"
            :placeholder="t('liturgy.custom.namePlaceholder')"
            autofocus
            @input="onInput"
            @keydown.enter="emit('create')"
          >
        </label>

        <div class="liturgy-dialog__actions">
          <button
            type="button"
            class="liturgy-dialog__btn liturgy-dialog__btn--ghost"
            @click="emit('close')"
          >
            {{ t('liturgy.actions.cancel') }}
          </button>
          <button
            type="button"
            class="liturgy-dialog__btn"
            :disabled="!name.trim()"
            @click="emit('create')"
          >
            {{ t('liturgy.actions.create') }}
          </button>
        </div>
      </GlassCard>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.liturgy-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: color-mix(in srgb, #000 55%, transparent);
  backdrop-filter: blur(6px);
}

.liturgy-dialog {
  width: min(28rem, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.liturgy-dialog__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ds-color-on-surface);
}

.liturgy-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--ds-color-on-surface) 75%, transparent);

  input {
    min-height: 2.75rem;
    border-radius: var(--ds-radius-md, 0.75rem 0 0.75rem 0);
    border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
    background: color-mix(in srgb, var(--ds-color-surface) 60%, transparent);
    color: var(--ds-color-on-surface);
    padding: 0.65rem 0.9rem;
    font: inherit;

    &:focus {
      outline: 2px solid color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
    }
  }
}

.liturgy-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.liturgy-dialog__btn {
  min-height: 2.4rem;
  padding: 0.45rem 1.1rem;
  border: 0;
  border-radius: var(--ds-radius-md, 0.75rem 0 0.75rem 0);
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary, #fff);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--ghost {
    background: transparent;
    color: var(--ds-color-on-surface);
    border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 14%, transparent);
  }
}
</style>
