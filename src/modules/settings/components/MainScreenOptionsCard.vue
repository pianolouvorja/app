<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useProjectionSettings } from '../composables/useProjectionSettings'
import SettingsToggle from './SettingsToggle.vue'

const { t } = useI18n()
const {
  settings,
  setOpenFullscreenOnPrimary,
  setDisablePrimaryWhenExtended,
  setAutoMinimizePlayer,
} = useProjectionSettings()

const toggles = [
  {
    key: 'openFullscreenOnPrimary' as const,
    labelKey: 'settings.projection.mainScreen.openFullscreen',
    set: setOpenFullscreenOnPrimary,
  },
  {
    key: 'disablePrimaryWhenExtended' as const,
    labelKey: 'settings.projection.mainScreen.disablePrimaryWhenExtended',
    set: setDisablePrimaryWhenExtended,
  },
  {
    key: 'autoMinimizePlayer' as const,
    labelKey: 'settings.projection.mainScreen.autoMinimizePlayer',
    set: setAutoMinimizePlayer,
  },
]
</script>

<template>
  <GlassCard class="main-screen">
    <div class="main-screen__header">
      <i class="ti ti-device-desktop main-screen__icon" aria-hidden="true" />
      <h3 class="main-screen__title">
        {{ t('settings.projection.mainScreen.title') }}
      </h3>
    </div>

    <ul class="main-screen__list">
      <li
        v-for="item in toggles"
        :key="item.key"
        class="main-screen__row"
      >
        <button
          type="button"
          class="main-screen__label-btn"
          @click="item.set(!settings[item.key])"
        >
          {{ t(item.labelKey) }}
        </button>
        <SettingsToggle
          :model-value="settings[item.key]"
          :label="t(item.labelKey)"
          @update:model-value="item.set($event)"
        />
      </li>
    </ul>
  </GlassCard>
</template>

<style scoped lang="scss">
.main-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem;
}

.main-screen__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.main-screen__icon {
  color: var(--ds-color-primary);
  font-size: 24px;
  line-height: 1;
}

.main-screen__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.main-screen__list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.main-screen__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.main-screen__label-btn {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  font: inherit;
  font-size: 16px;
  line-height: 24px;
  text-align: left;
  cursor: pointer;
  transition: color 150ms ease;

  &:hover {
    color: var(--ds-color-on-surface);
  }
}
</style>
