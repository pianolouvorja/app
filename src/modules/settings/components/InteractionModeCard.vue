<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'
import type { InteractionKey } from '@design-system/themes'

import { useAppearanceSettings } from '../composables/useAppearanceSettings'

const { t } = useI18n()
const { interactionKey, setInteractionMode } = useAppearanceSettings()

const modes: Array<{ id: InteractionKey; labelKey: string }> = [
  { id: 'dynamic', labelKey: 'settings.appearance.interactionDynamic' },
  { id: 'soft', labelKey: 'settings.appearance.interactionSoft' },
  { id: 'mist', labelKey: 'settings.appearance.interactionMist' },
]

function selectMode(mode: InteractionKey) {
  setInteractionMode(mode)
}
</script>

<template>
  <GlassCard class="interaction-card" :padding="false">
    <div class="interaction-card__header">
      <i class="mdi mdi-animation interaction-card__icon" aria-hidden="true" />
      <h3 class="interaction-card__title">
        {{ t('settings.appearance.interactions') }}
      </h3>
    </div>

    <p class="interaction-card__hint">
      {{ t('settings.appearance.interactionsHint') }}
    </p>

    <div
      class="interaction-card__options"
      role="group"
      :aria-label="t('settings.appearance.interactions')"
    >
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="interaction-card__chip"
        :class="{ 'interaction-card__chip--active': interactionKey === mode.id }"
        :aria-pressed="interactionKey === mode.id"
        @click="selectMode(mode.id)"
      >
        {{ t(mode.labelKey) }}
      </button>
    </div>
  </GlassCard>
</template>

<style scoped lang="scss">
.interaction-card {
  padding: 20px;
  animation: appearance-float 6s ease-in-out infinite;
      animation-delay: 0.5s;
}

.interaction-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.interaction-card__icon {
  color: var(--ds-color-primary);
  font-size: 22px;
  line-height: 1;
}

.interaction-card__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 20px;
}

.interaction-card__hint {
  margin: 0 0 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 14px;
}

.interaction-card__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.interaction-card__chip {
  padding: 0.25rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-surface-variant);
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 16px;
  opacity: 0.7;
  transition:
    background-color var(--ds-motion-duration, 200ms) ease,
    color var(--ds-motion-duration, 200ms) ease,
    opacity var(--ds-motion-duration, 200ms) ease,
    border-color var(--ds-motion-duration, 200ms) ease,
    transform 150ms ease;

  &:hover {
    opacity: 1;
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid var(--ds-color-primary);
    outline-offset: 2px;
  }

  &--active {
    border-color: color-mix(in srgb, var(--ds-color-primary) 35%, transparent);
    background: color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
    color: var(--ds-color-primary);
    opacity: 1;
  }
}

@keyframes appearance-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
