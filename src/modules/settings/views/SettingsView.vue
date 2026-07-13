<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { usePageTransition } from '@design-system/composables'

import SettingsTabs from '../components/SettingsTabs.vue'
import { SETTINGS_SECTIONS } from '../constants/sections'
import type { SettingsSectionId } from '../types/settings'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { transitionName } = usePageTransition()

const activeSection = computed<SettingsSectionId>(() => {
  const match = SETTINGS_SECTIONS.find((section) => section.routeName === route.name)
  return match?.id ?? 'appearance'
})

const isAppearance = computed(() => activeSection.value === 'appearance')

const sectionTitleKey = computed(
  () => `settings.sectionTitle.${activeSection.value}`,
)

function goBack() {
  void router.push({ name: 'home' })
}
</script>

<template>
  <section
    class="settings-view"
    :class="{ 'settings-view--appearance': isAppearance }"
  >
    <SettingsTabs class="settings-view__tabs" />

    <div v-if="!isAppearance" class="settings-view__header">
      <button
        type="button"
        class="settings-view__back"
        :aria-label="t('nav.home')"
        @click="goBack"
      >
        <i class="mdi mdi-arrow-left" aria-hidden="true" />
      </button>
      <h1 class="settings-view__title">
        {{ t(sectionTitleKey) }}
      </h1>
    </div>

    <div class="settings-view__content">
      <RouterView v-slot="{ Component, route: sectionRoute }">
        <Transition :name="transitionName" mode="out-in">
          <component
            :is="Component"
            :key="String(sectionRoute.name ?? sectionRoute.path)"
          />
        </Transition>
      </RouterView>
    </div>
  </section>
</template>

<style scoped lang="scss">
.settings-view {
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 1.5rem var(--ds-spacing-page) 2rem;

  &--appearance {
    max-width: 90rem;
  }
}

.settings-view__tabs {
  margin-bottom: 2rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--ds-color-outline);
}

.settings-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.settings-view__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: var(--ds-radius-full);
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  color: var(--ds-color-primary);
  cursor: pointer;
  transition:
    background-color 200ms ease,
    transform 150ms ease;

  .mdi {
    font-size: 22px;
    line-height: 1;
  }

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  }

  &:active {
    transform: scale(0.96);
  }
}

.settings-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 32px;
}

.settings-view__content {
  min-height: 12rem;
}
</style>
