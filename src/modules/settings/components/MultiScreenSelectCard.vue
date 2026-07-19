<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useProjectionSettings } from '../composables/useProjectionSettings'

const { t } = useI18n()
const {
  extendedMonitorOptions,
  hasExtendedDisplays,
  toggleExtendedMonitor,
} = useProjectionSettings()
</script>

<template>
  <GlassCard class="multi-screen">
    <div class="multi-screen__header">
      <i class="ti ti-presentation multi-screen__icon" aria-hidden="true" />
      <h3 class="multi-screen__title">
        {{ t('settings.projection.slides.title') }}
      </h3>
    </div>

    <div class="multi-screen__section-label">
      <i class="ti ti-devices" aria-hidden="true" />
      <span>{{ t('settings.projection.slides.multiScreens') }}</span>
    </div>

    <p class="multi-screen__caption">
      {{ t('settings.projection.slides.projectOn') }}
    </p>

    <div
      v-if="hasExtendedDisplays"
      class="multi-screen__grid"
      role="group"
      :aria-label="t('settings.projection.slides.multiScreens')"
    >
      <button
        v-for="monitor in extendedMonitorOptions"
        :key="monitor.id"
        type="button"
        class="multi-screen__option"
        :class="{ 'multi-screen__option--active': monitor.isSelected }"
        :aria-pressed="monitor.isSelected"
        @click="toggleExtendedMonitor(monitor.id)"
      >
        <i
          class="ti multi-screen__option-icon"
          :class="monitor.isSelected ? 'ti-screen-share' : 'ti-device-desktop-off'"
          aria-hidden="true"
        />
        <span class="multi-screen__option-label">{{ monitor.label }}</span>
        <span class="multi-screen__option-meta">
          {{ t('settings.projection.monitors.extended') }}
        </span>
      </button>
    </div>

    <p
      v-else
      class="multi-screen__empty"
      role="status"
    >
      {{ t('settings.projection.slides.noExtended') }}
    </p>
  </GlassCard>
</template>

<style scoped lang="scss">
.multi-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem;
}

.multi-screen__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.multi-screen__icon {
  color: var(--ds-color-secondary, #78d6d2);
  font-size: 24px;
  line-height: 1;
}

.multi-screen__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.multi-screen__section-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 16px;

  .ti {
    font-size: 18px;
    line-height: 1;
  }
}

.multi-screen__caption {
  margin: 0 0 1.5rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
  opacity: 0.7;
}

.multi-screen__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.multi-screen__option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 1rem;
  border: 2px solid transparent;
  border-radius: var(--ds-radius-lg);
  background: color-mix(in srgb, var(--ds-color-on-surface) 3%, transparent);
  box-shadow: inset 0 0 0 1px var(--ds-color-outline);
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    transform 150ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  }

  &:active {
    transform: scale(0.98);
  }

  &--active {
    border-color: var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
    box-shadow: none;
    color: var(--ds-color-primary);
  }
}

.multi-screen__option-icon {
  font-size: 32px;
  line-height: 1;
}

.multi-screen__option-label {
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}

.multi-screen__option-meta {
  font-size: 10px;
  opacity: 0.8;
}

.multi-screen__empty {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-color-primary) 10%, transparent);
  color: var(--ds-color-on-surface-variant);
  font-size: 13px;
  line-height: 1.4;
}
</style>
