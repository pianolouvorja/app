<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useAppearanceSettings } from '../composables/useAppearanceSettings'

const { t } = useI18n()
const { isDark, setThemeMode } = useAppearanceSettings()

function preferLight() {
  setThemeMode('light')
}

function preferDark() {
  setThemeMode('dark')
}

function toggleTheme() {
  setThemeMode(isDark.value ? 'light' : 'dark')
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
        :class="{ 'theme-orbital__sphere--dark': isDark }"
      >
        <i
          class="ti ti-sun theme-orbital__glyph theme-orbital__glyph--sun"
          :class="{ 'theme-orbital__glyph--hidden': isDark }"
          aria-hidden="true"
        />
        <i
          class="ti ti-moon theme-orbital__glyph theme-orbital__glyph--moon"
          :class="{ 'theme-orbital__glyph--hidden': !isDark }"
          aria-hidden="true"
        />
        <div class="theme-orbital__sheen" />
      </div>
    </div>

    <div class="theme-orbital__control-wrap">
      <GlassCard class="theme-orbital__control" :padding="false">
        <div class="theme-orbital__toggle-row">
          <button
            type="button"
            class="theme-orbital__mode-btn"
            :class="{ 'theme-orbital__mode-btn--active': !isDark }"
            :aria-label="t('settings.appearance.lightMode')"
            @click="preferLight"
          >
            <i class="ti ti-sun" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="theme-orbital__switch"
            role="switch"
            :aria-checked="isDark"
            :aria-label="t('settings.appearance.changeTheme')"
            @click="toggleTheme"
          >
            <span
              class="theme-orbital__switch-track"
              :class="{ 'theme-orbital__switch-track--on': isDark }"
              aria-hidden="true"
            >
              <span class="theme-orbital__switch-thumb">
                <i
                  v-if="!isDark"
                  class="ti ti-sun theme-orbital__switch-thumb-icon"
                />
              </span>
            </span>
          </button>

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

      <p class="theme-orbital__label">
        {{ t('settings.appearance.changeTheme') }}
      </p>
    </div>
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

  &--dark {
    transform: rotate(12deg);
  }

  @media (min-width: 768px) {
    width: 14rem;
    height: 14rem;
  }
}

.theme-orbital__glyph {
  position: absolute;
  z-index: 1;
  font-size: 4.5rem;
  line-height: 1;
  transition:
    color var(--ds-motion-duration, 700ms) ease,
    opacity var(--ds-motion-duration, 700ms) ease,
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

  &--hidden {
    opacity: 0;
    transform: scale(0.5) rotate(45deg);
    pointer-events: none;
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

.theme-orbital__control-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 20rem;
}

.theme-orbital__control {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border-radius: var(--ds-radius-full);
}

.theme-orbital__toggle-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
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
  opacity: 0.6;
  cursor: pointer;
  transition:
    color var(--ds-motion-duration, 200ms) ease,
    opacity var(--ds-motion-duration, 200ms) ease;

  .ti {
    font-size: 22px;
    line-height: 1;
  }

  &--active,
  &:hover {
    color: var(--ds-color-primary);
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--ds-color-primary);
    outline-offset: 2px;
  }
}

.theme-orbital__switch {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.theme-orbital__switch-track {
  position: relative;
  width: 3.5rem;
  height: 2rem;
  overflow: hidden;
  border-radius: var(--ds-radius-full);
  background: var(--ds-color-surface-variant, #353534);
  transition: background-color 200ms ease;

  &--on {
    background: var(--ds-color-primary);
  }
}

.theme-orbital__switch-thumb {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--ds-radius-full);
  background: #fff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
  transition: transform 300ms ease;

  .theme-orbital__switch-track--on & {
    transform: translateX(1.5rem);
  }
}

.theme-orbital__switch-thumb-icon {
  font-size: 14px;
  line-height: 1;
  color: var(--ds-color-primary);
}

.theme-orbital__switch:focus-visible .theme-orbital__switch-track {
  outline: 2px solid var(--ds-color-primary);
  outline-offset: 3px;
}

.theme-orbital__label {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  line-height: 14px;
  text-transform: uppercase;
  opacity: 0.6;
}

@keyframes orbital-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1280px) {
  .theme-orbital {
    gap: 1.5rem;
  }

  .theme-orbital__stage {
    width: 14rem;
    height: 14rem;
  }

  .theme-orbital__sphere {
    width: 10.5rem;
    height: 10.5rem;
  }

  .theme-orbital__glyph {
    font-size: 4rem;
  }

  .theme-orbital__control {
    padding: 0.75rem 1.25rem;
  }

  .theme-orbital__toggle-row {
    gap: 1.25rem;
  }
}
</style>
