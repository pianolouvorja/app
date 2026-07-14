<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import UtilitiesHubCard from '../components/UtilitiesHubCard.vue'
import type { UtilityHubItem } from '../types/clock'

const { t } = useI18n()
const router = useRouter()

const items: UtilityHubItem[] = [
  {
    key: 'clock',
    titleKey: 'utilities.clock',
    descriptionKey: 'utilities.clockDescription',
    icon: 'mdi-clock-outline',
    to: '/utilities/clock',
    available: true,
  },
  {
    key: 'timer',
    titleKey: 'utilities.timer',
    descriptionKey: 'utilities.timerDescription',
    icon: 'mdi-timer-outline',
    to: '/utilities/timer',
    available: true,
  },
  {
    key: 'countdown',
    titleKey: 'utilities.countdown',
    descriptionKey: 'utilities.countdownDescription',
    icon: 'mdi-timer-sand',
    to: '/utilities/countdown',
    available: true,
  },
]

function goBack() {
  void router.push({ name: 'utilities' })
}
</script>

<template>
  <section class="temporizador-view">
    <header class="temporizador-view__header">
      <button
        type="button"
        class="temporizador-view__back"
        :aria-label="t('utilities.backToUtilities')"
        @click="goBack"
      >
        <i
          class="mdi mdi-arrow-left"
          aria-hidden="true"
        />
      </button>

      <div class="temporizador-view__heading">
        <h1 class="temporizador-view__title">
          {{ t('utilities.temporizador') }}
        </h1>
        <p class="temporizador-view__subtitle">
          {{ t('utilities.temporizadorSubtitle') }}
        </p>
      </div>
    </header>

    <div class="temporizador-view__grid">
      <UtilitiesHubCard
        v-for="item in items"
        :key="item.key"
        :title-key="item.titleKey"
        :description-key="item.descriptionKey"
        :icon="item.icon"
        :to="item.to"
        :available="item.available"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.temporizador-view {
  display: flex;
  min-height: calc(100vh - 5rem - var(--ds-dock-height, 5.5rem));
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: var(--ds-spacing-page, 1.5rem);
  padding-bottom: calc(var(--ds-dock-height, 5.5rem) + 2rem);
}

.temporizador-view__header {
  display: grid;
  width: 100%;
  max-width: 48rem;
  grid-template-columns: 2.5rem 1fr 2.5rem;
  align-items: start;
  gap: 0.75rem;
}

.temporizador-view__back {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--ds-radius-md, 0.75rem);
  background: transparent;
  color: var(--ds-color-on-surface);
  cursor: pointer;
  font-size: 1.35rem;
  transition: background-color 180ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--ds-color-primary);
    outline-offset: 2px;
  }
}

.temporizador-view__heading {
  text-align: center;
}

.temporizador-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}

.temporizador-view__subtitle {
  margin: 0.5rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.875rem;
  line-height: 1.4;
}

.temporizador-view__grid {
  display: grid;
  width: 100%;
  max-width: 48rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  justify-items: center;
  gap: 1rem;
}
</style>
