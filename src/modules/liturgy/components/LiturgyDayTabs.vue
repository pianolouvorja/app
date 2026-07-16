<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { LITURGY_DAY_TAB_ORDER, type LiturgyDayKey } from '../types/liturgy'

defineProps<{
  selectedDay: LiturgyDayKey
}>()

const emit = defineEmits<{
  select: [day: LiturgyDayKey]
}>()

const { t } = useI18n()

function onWheel(event: WheelEvent) {
  const target = event.currentTarget as HTMLElement
  if (event.deltaY !== 0) {
    target.scrollLeft += event.deltaY
  }
}
</script>

<template>
  <div
    class="liturgy-day-tabs"
    @wheel.prevent="onWheel"
  >
    <button
      v-for="day in LITURGY_DAY_TAB_ORDER"
      :key="day"
      type="button"
      class="liturgy-day-tabs__chip"
      :class="{ 'liturgy-day-tabs__chip--active': selectedDay === day }"
      @click="emit('select', day)"
    >
      {{ t(`liturgy.daysShort.${day}`) }}
    </button>

    <span
      class="liturgy-day-tabs__divider"
      aria-hidden="true"
    />

    <button
      type="button"
      class="liturgy-day-tabs__chip"
      :class="{ 'liturgy-day-tabs__chip--active': selectedDay === 'custom' }"
      @click="emit('select', 'custom')"
    >
      {{ t('liturgy.daysShort.custom') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.liturgy-day-tabs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
    border-radius: 999px;
  }
}

.liturgy-day-tabs__chip {
  flex: 0 0 auto;
  min-height: 2.25rem;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    box-shadow 200ms ease,
    transform 160ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  }

  &--active {
    background: var(--ds-color-primary);
    border-color: transparent;
    color: var(--ds-color-on-primary, #003258);
    font-weight: 700;
    box-shadow: 0 0 20px color-mix(in srgb, var(--ds-color-primary) 30%, transparent);
  }
}

.liturgy-day-tabs__divider {
  flex: 0 0 auto;
  width: 1px;
  height: 1rem;
  margin: 0 0.35rem;
  background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
}
</style>
