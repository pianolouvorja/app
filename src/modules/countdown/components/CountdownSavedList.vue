<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { formatElapsedMs } from '../services/countdown-format'
import type { CountdownTimeFormat } from '../types/countdown'

const props = defineProps<{
  items: number[]
  timeFormat: CountdownTimeFormat
}>()

const emit = defineEmits<{
  remove: [index: number]
  clear: []
}>()

const { t } = useI18n()

function labelFor(ms: number) {
  return formatElapsedMs(ms, props.timeFormat)
}
</script>

<template>
  <aside
    v-if="items.length > 0"
    class="countdown-saved"
  >
    <header class="countdown-saved__header">
      <h2 class="countdown-saved__title">
        <span class="countdown-saved__count">{{ items.length }}</span>
        {{ t('countdown.savedTimes') }}
      </h2>
      <button
        type="button"
        class="countdown-saved__clear"
        @click="emit('clear')"
      >
        {{ t('countdown.clearAll') }}
      </button>
    </header>

    <ul class="countdown-saved__list">
      <li
        v-for="(ms, index) in items"
        :key="`${ms}-${index}`"
        class="countdown-saved__item"
      >
        <i
          class="mdi mdi-timer"
          aria-hidden="true"
        />
        <span class="countdown-saved__value">{{ labelFor(ms) }}</span>
        <button
          type="button"
          class="countdown-saved__remove"
          :aria-label="t('countdown.removeSaved')"
          @click="emit('remove', index)"
        >
          <i
            class="mdi mdi-delete"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped lang="scss">
.countdown-saved {
  display: flex;
  width: 100%;
  max-width: 16rem;
  max-height: 100%;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--ds-radius-md, 0.75rem);
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
}

.countdown-saved__header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.countdown-saved__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 0.95rem;
  font-weight: 700;
}

.countdown-saved__count {
  display: inline-flex;
  min-width: 1.4rem;
  height: 1.4rem;
  align-items: center;
  justify-content: center;
  padding: 0 0.35rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  color: var(--ds-color-primary);
  font-size: 0.7rem;
}

.countdown-saved__clear {
  height: 2rem;
  border: 0;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 16%, transparent);
  color: var(--ds-color-error, #ffb4ab);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
}

.countdown-saved__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.countdown-saved__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.25rem;
  color: var(--ds-color-on-surface);

  > .mdi {
    color: var(--ds-color-primary);
    font-size: 1rem;
  }
}

.countdown-saved__value {
  flex: 1;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.countdown-saved__remove {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--ds-color-error, #ffb4ab);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 14%, transparent);
  }
}
</style>
