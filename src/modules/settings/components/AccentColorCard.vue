<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'
import type { AccentKey } from '@design-system/themes'

import { useAppearanceSettings } from '../composables/useAppearanceSettings'

const { t } = useI18n()
const { accents, accentKey, setAccentColor } = useAppearanceSettings()

const accentEntries = Object.entries(accents) as Array<
  [AccentKey, (typeof accents)[AccentKey]]
>

function selectAccent(key: AccentKey) {
  setAccentColor(key)
}
</script>

<template>
  <GlassCard class="accent-color" :padding="false">
    <div class="accent-color__header">
      <i class="ti ti-palette accent-color__icon" aria-hidden="true" />
      <h3 class="accent-color__title">
        {{ t('settings.appearance.accentColor') }}
      </h3>
    </div>

    <div
      class="accent-color__swatches"
      role="radiogroup"
      :aria-label="t('settings.appearance.accentColor')"
    >
      <button
        v-for="[key, accent] in accentEntries"
        :key="key"
        type="button"
        class="accent-color__swatch"
        :class="{ 'accent-color__swatch--active': accentKey === key }"
        :style="{ '--swatch': accent.soft }"
        role="radio"
        :aria-checked="accentKey === key"
        :aria-label="accent.label"
        @click="selectAccent(key)"
      />
    </div>
  </GlassCard>
</template>

<style scoped lang="scss">
.accent-color {
  padding: 20px;
  animation: appearance-float 6s ease-in-out infinite;
  animation-delay: 0.8s;
}

.accent-color__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.accent-color__icon {
  color: var(--ds-color-primary);
  font-size: 22px;
  line-height: 1;
}

.accent-color__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 20px;
}

.accent-color__swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.65rem 0.55rem;
  justify-items: center;
}

.accent-color__swatch {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 2px solid transparent;
  border-radius: var(--ds-radius-full);
  background: var(--swatch);
  cursor: pointer;
  transition:
    transform var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease),
    box-shadow var(--ds-motion-duration, 200ms) ease,
    border-color var(--ds-motion-duration, 200ms) ease;

  &:hover {
    transform: scale(1.1);
  }

  &:focus-visible {
    outline: 2px solid var(--ds-color-primary);
    outline-offset: 3px;
  }

  &--active {
    border-color: #ffffff;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--swatch) 40%, transparent);
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
