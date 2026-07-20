<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'
import type { LiturgyCloneSource } from '../types/liturgy'

const props = defineProps<{
  open: boolean
  sources: LiturgyCloneSource[]
  sourceKey: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  'update:sourceKey': [value: string]
}>()

const { t } = useI18n()

const canConfirm = computed(() => Boolean(props.sourceKey))

function sourceOptionValue(source: LiturgyCloneSource): string {
  return source.kind === 'weekday'
    ? `weekday:${source.day}`
    : `custom:${source.id}`
}

function sourceOptionLabel(source: LiturgyCloneSource): string {
  if (source.kind === 'weekday') {
    return `${t(source.labelKey)} (${source.itemCount})`
  }
  return `${t('liturgy.days.custom')}: ${source.name} (${source.itemCount})`
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

function onSelectChange(event: Event) {
  emit('update:sourceKey', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="liturgy-dialog-backdrop"
      @click="onBackdropClick"
    >
      <GlassCard
        class="liturgy-dialog"
        elevated
      >
        <h2 class="liturgy-dialog__title">
          {{ t('liturgy.clone.title') }}
        </h2>

        <p class="liturgy-dialog__hint">
          {{ t('liturgy.clone.hint') }}
        </p>

        <label class="liturgy-dialog__field">
          <span>{{ t('liturgy.clone.source') }}</span>
          <select
            :value="sourceKey"
            autofocus
            @change="onSelectChange"
          >
            <option
              v-if="sources.length === 0"
              value=""
              disabled
            >
              {{ t('liturgy.clone.emptySources') }}
            </option>
            <option
              v-for="source in sources"
              :key="sourceOptionValue(source)"
              :value="sourceOptionValue(source)"
            >
              {{ sourceOptionLabel(source) }}
            </option>
          </select>
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
            :disabled="!canConfirm"
            @click="emit('confirm')"
          >
            {{ t('liturgy.actions.clone') }}
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

.liturgy-dialog__hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--ds-color-on-surface) 65%, transparent);
}

.liturgy-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--ds-color-on-surface) 75%, transparent);

  select {
    min-height: 2.75rem;
    border-radius: var(--ds-radius-md, 0.75rem 0 0.75rem 0);
    border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
    background: color-mix(in srgb, var(--ds-color-surface) 60%, transparent);
    color: var(--ds-color-on-surface);
    padding: 0.65rem 0.9rem;
    font: inherit;
    color-scheme: dark;
  }
}

.liturgy-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.liturgy-dialog__btn {
  min-height: 2.5rem;
  padding: 0.5rem 1.1rem;
  border: 0;
  border-radius: 999px;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary, #003258);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--ghost {
    background: transparent;
    color: var(--ds-color-on-surface);
    border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 14%, transparent);
  }
}
</style>
