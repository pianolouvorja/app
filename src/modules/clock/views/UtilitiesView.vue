<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import UtilitiesHubCard from '../components/UtilitiesHubCard.vue'
import type { UtilityHubItem } from '../types/clock'

const { t } = useI18n()

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
    key: 'draw',
    titleKey: 'utilities.draw',
    descriptionKey: 'utilities.drawDescription',
    icon: 'mdi-draw',
    to: null,
    available: false,
  },
  {
    key: 'timer',
    titleKey: 'utilities.timer',
    descriptionKey: 'utilities.timerDescription',
    icon: 'mdi-timer-outline',
    to: null,
    available: false,
  },
]
</script>

<template>
  <section class="utilities-view">
    <header class="utilities-view__header">
      <h1 class="utilities-view__title">
        {{ t('utilities.title') }}
      </h1>
      <p class="utilities-view__subtitle">
        {{ t('utilities.subtitle') }}
      </p>
    </header>

    <div class="utilities-view__grid">
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
.utilities-view {
  display: flex;
  min-height: calc(100vh - 5rem - var(--ds-dock-height, 5.5rem));
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: var(--ds-spacing-page, 1.5rem);
  padding-bottom: calc(var(--ds-dock-height, 5.5rem) + 2rem);
}

.utilities-view__header {
  text-align: center;
}

.utilities-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}

.utilities-view__subtitle {
  margin: 0.5rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.875rem;
  line-height: 1.4;
}

.utilities-view__grid {
  display: grid;
  width: 100%;
  max-width: 48rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  justify-items: center;
  gap: 1rem;
}
</style>
