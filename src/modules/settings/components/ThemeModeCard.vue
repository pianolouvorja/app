<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useAppearanceSettings } from '../composables/useAppearanceSettings'
import type { ThemeMode } from '../types/settings'

const { t } = useI18n()
const { themeMode, setThemeMode } = useAppearanceSettings()

const modes: Array<{
  id: ThemeMode
  labelKey: string
  icon: string
}> = [
  {
    id: 'light',
    labelKey: 'settings.appearance.lightMode',
    icon: 'mdi-white-balance-sunny',
  },
  {
    id: 'dark',
    labelKey: 'settings.appearance.darkMode',
    icon: 'mdi-weather-night',
  },
]

function selectMode(mode: ThemeMode) {
  setThemeMode(mode)
}
</script>

<template>
  <GlassCard class="theme-mode-card" :padding="false">
    <h3 class="theme-mode-card__title">
      {{ t('settings.appearance.systemTheme') }}
    </h3>

    <div class="theme-mode-card__options" role="group" :aria-label="t('settings.appearance.systemTheme')">
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="theme-mode-card__option"
        :class="{ 'theme-mode-card__option--active': themeMode === mode.id }"
        :aria-pressed="themeMode === mode.id"
        @click="selectMode(mode.id)"
      >
        <span
          v-if="themeMode === mode.id"
          class="theme-mode-card__check"
          aria-hidden="true"
        >
          <i class="mdi mdi-check" />
        </span>
        <i
          class="mdi theme-mode-card__icon"
          :class="mode.icon"
          aria-hidden="true"
        />
        <span class="theme-mode-card__label">
          {{ t(mode.labelKey) }}
        </span>
      </button>
    </div>
  </GlassCard>
</template>

<style scoped lang="scss">
.theme-mode-card {
  padding: 2rem;
}

.theme-mode-card__title {
  margin: 0 0 2rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 20px;
  text-transform: uppercase;
}

.theme-mode-card__options {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
}

.theme-mode-card__option {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: var(--ds-radius-lg);
  border: 1px solid var(--ds-color-outline-strong);
  background: color-mix(in srgb, var(--ds-color-on-surface) 4%, transparent);
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    transform 150ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
    color: var(--ds-color-primary);
  }

  &:active {
    transform: scale(0.98);
  }

  &--active {
    border: 2px solid var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
    color: var(--ds-color-primary);

    .theme-mode-card__label {
      font-weight: 700;
    }
  }
}

.theme-mode-card__check {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-primary);
  color: #003258;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--ds-color-primary) 35%, transparent);

  .mdi {
    font-size: 14px;
    line-height: 1;
  }
}

.theme-mode-card__icon {
  font-size: 22px;
  line-height: 1;
}

.theme-mode-card__label {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 20px;
  text-transform: uppercase;
}
</style>
