<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useAppearanceSettings } from '../composables/useAppearanceSettings'

const { t } = useI18n()
const { isDark, themeMode, setThemeMode } = useAppearanceSettings()

const sliderValue = ref(themeMode.value === 'dark' ? 100 : 0)

watch(themeMode, (mode) => {
  const inLightHalf = sliderValue.value < 50
  if ((mode === 'light' && inLightHalf) || (mode === 'dark' && !inLightHalf)) {
    return
  }
  sliderValue.value = mode === 'dark' ? 100 : 0
})

const sliderStyle = computed(() => ({
  '--slider-fill': `${sliderValue.value}%`,
}))

const sphereRotation = computed(() => `${sliderValue.value * 3.6}deg`)

function applyFromSlider(value: number) {
  sliderValue.value = value
  const next = value >= 50 ? 'dark' : 'light'
  if (themeMode.value !== next) {
    setThemeMode(next)
  }
}

function onThemeInput(event: Event) {
  const input = event.target as HTMLInputElement
  applyFromSlider(Number(input.value))
}

function onThemeCommit() {
  sliderValue.value = themeMode.value === 'dark' ? 100 : 0
}

function preferLight() {
  applyFromSlider(0)
}

function preferDark() {
  applyFromSlider(100)
}
</script>

<template>
  <div class="theme-orbital">
    <div class="theme-orbital__stage" aria-hidden="true">
      <div
        class="theme-orbital__glow"
        :class="{ 'theme-orbital__glow--light': !isDark }"
      />
      <div class="theme-orbital__ring theme-orbital__ring--outer" />
      <div class="theme-orbital__ring theme-orbital__ring--inner" />
      <div
        class="theme-orbital__sphere"
        :style="{ transform: `rotate(${sphereRotation})` }"
      >
        <i
          class="ti theme-orbital__glyph"
          :class="
            isDark
              ? 'ti-moon theme-orbital__glyph--moon'
              : 'ti-sun theme-orbital__glyph--sun'
          "
        />
        <div class="theme-orbital__sheen" />
      </div>
    </div>

    <GlassCard class="theme-orbital__control" :padding="false">
      <div class="theme-orbital__slider-row">
        <button
          type="button"
          class="theme-orbital__mode-btn"
          :class="{ 'theme-orbital__mode-btn--active': !isDark }"
          :aria-label="t('settings.appearance.lightMode')"
          @click="preferLight"
        >
          <i class="ti ti-sun" aria-hidden="true" />
        </button>

        <label class="theme-orbital__slider-wrap">
          <span class="sr-only">{{ t('settings.appearance.systemTheme') }}</span>
          <input
            class="theme-orbital__range"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="sliderValue"
            :style="sliderStyle"
            :aria-valuetext="
              isDark
                ? t('settings.appearance.darkMode')
                : t('settings.appearance.lightMode')
            "
            @input="onThemeInput"
            @change="onThemeCommit"
          />
        </label>

        <button
          type="button"
          class="theme-orbital__mode-btn"
          :class="{ 'theme-orbital__mode-btn--active': isDark }"
          :aria-label="t('settings.appearance.darkMode')"
          @click="preferDark"
        >
          <i class="ti ti-moon" aria-hidden="true" />
        </button>
      </div>
    </GlassCard>
  </div>
</template>

<style scoped lang="scss">
.theme-orbital {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  width: 100%;
}

.theme-orbital__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16rem;
  height: 16rem;

  @media (min-width: 768px) {
    width: 20rem;
    height: 20rem;
  }
}

.theme-orbital__glow {
  position: absolute;
  inset: 0;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-primary);
  opacity: 0.4;
  filter: blur(60px);
  transition:
    background-color var(--ds-motion-duration, 700ms) ease,
    opacity var(--ds-motion-duration, 700ms) ease;

  &--light {
    background: #ffdb58;
    opacity: 0.45;
  }
}

.theme-orbital__ring {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  border-radius: var(--ds-radius-full);
  pointer-events: none;

  &--inner {
    inset: -1.25rem;
    animation: orbital-spin 20s linear infinite;
  }

  &--outer {
    inset: -2.5rem;
    opacity: 0.5;
    animation: orbital-spin 30s linear infinite reverse;
  }
}

.theme-orbital__sphere {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12rem;
  height: 12rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #ffffff 10%, transparent);
  border-radius: var(--ds-radius-full);
  background: color-mix(in srgb, var(--ds-color-surface-elevated) 80%, transparent);
  box-shadow:
    0 0 40px -10px color-mix(in srgb, var(--ds-color-primary) 40%, transparent),
    0 25px 50px -12px rgb(0 0 0 / 0.45);
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (min-width: 768px) {
    width: 14rem;
    height: 14rem;
  }
}

.theme-orbital__glyph {
  position: relative;
  z-index: 1;
  font-size: 4.5rem;
  line-height: 1;
  transition:
    color var(--ds-motion-duration, 700ms) ease,
    transform var(--ds-motion-duration, 700ms) ease;

  @media (min-width: 768px) {
    font-size: 5.5rem;
  }

  &--sun {
    color: #facc15;
  }

  &--moon {
    color: #c7d2fe;
  }
}

.theme-orbital__sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top right,
    color-mix(in srgb, #ffffff 5%, transparent),
    color-mix(in srgb, #ffffff 20%, transparent)
  );
  pointer-events: none;
}

.theme-orbital__control {
  width: 100%;
  max-width: 20rem;
  padding: 1rem 1.5rem;
  border-radius: var(--ds-radius-full);
}

.theme-orbital__slider-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-orbital__mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: var(--ds-radius-full);
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  transition: color var(--ds-motion-duration, 200ms) ease;

  .ti {
    font-size: 22px;
    line-height: 1;
  }

  &--active,
  &:hover {
    color: var(--ds-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--ds-color-primary);
    outline-offset: 2px;
  }
}

.theme-orbital__slider-wrap {
  flex: 1;
  min-width: 0;
}

.theme-orbital__range {
  display: block;
  width: 100%;
  height: 24px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--ds-color-primary);
    outline-offset: 4px;
    border-radius: var(--ds-radius-sm);
  }

  &::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(
      to right,
      var(--ds-color-primary) 0%,
      var(--ds-color-primary) var(--slider-fill, 100%),
      color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent)
        var(--slider-fill, 100%),
      color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent) 100%
    );
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -9px;
    border-radius: var(--ds-radius-full);
    background: var(--ds-color-primary-soft);
    box-shadow: 0 0 12px
      color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
  }

  &::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  }

  &::-moz-range-progress {
    height: 4px;
    border-radius: 2px;
    background: var(--ds-color-primary);
  }

  &::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: var(--ds-radius-full);
    background: var(--ds-color-primary-soft);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes orbital-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
