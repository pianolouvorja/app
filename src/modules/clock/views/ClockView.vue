<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { GlassCard } from '@design-system/index'
import MonitorTargetSelect from '@shared/components/MonitorTargetSelect.vue'

import ClockConfigDialog from '../components/ClockConfigDialog.vue'
import ClockPreview from '../components/ClockPreview.vue'
import ClockProjectFab from '../components/ClockProjectFab.vue'
import { useClockFeature } from '../composables/useClock'

const { t } = useI18n()
const router = useRouter()

const {
  config,
  isProjecting,
  configOpen,
  setStyle,
  setShowSeconds,
  setFormat24h,
  setBgColor,
  setTextColor,
  resetToDefault,
  openConfig,
  closeConfig,
  toggleProjection,
} = useClockFeature()

function goBack() {
  void router.push({ name: 'utilities-temporizador' })
}

function onToggleProjection() {
  void toggleProjection()
}
</script>

<template>
  <section class="clock-view">
    <header class="clock-view__header">
      <button
        type="button"
        class="clock-view__back"
        :aria-label="t('clock.backToUtilities')"
        @click="goBack"
      >
        <i
          class="ti ti-arrow-left"
          aria-hidden="true"
        />
      </button>

      <div class="clock-view__brand">
        <div class="clock-view__brand-icon">
          <i
            class="ti ti-clock"
            aria-hidden="true"
          />
        </div>
        <h1 class="clock-view__title">
          {{ t('clock.title') }}
        </h1>
      </div>
    </header>

    <div class="clock-view__stage">
      <GlassCard
        class="clock-view__widget"
        :padding="false"
      >
        <div class="clock-view__toolbar">
          <button
            type="button"
            class="clock-view__tool-btn"
            :aria-label="t('clock.config')"
            :title="t('clock.config')"
            @click="openConfig"
          >
            <i
              class="ti ti-palette"
              aria-hidden="true"
            />
          </button>
        </div>

        <div class="clock-view__preview">
          <ClockPreview
            :config="config"
            preview
          />
        </div>

        <div
          v-if="isProjecting"
          class="clock-view__projecting"
        >
          <i
            class="ti ti-device-desktop"
            aria-hidden="true"
          />
          {{ t('clock.projecting') }}
        </div>
      </GlassCard>
    </div>

    <ClockConfigDialog
      :open="configOpen"
      :config="config"
      @close="closeConfig"
      @update:style="setStyle"
      @update:show-seconds="setShowSeconds"
      @update:format24h="setFormat24h"
      @update:bg-color="setBgColor"
      @update:text-color="setTextColor"
      @reset="resetToDefault"
    />

    <ClockProjectFab
      :projecting="isProjecting"
      @project="onToggleProjection"
      @clear="onToggleProjection"
    />
    <MonitorTargetSelect
      class="clock-view__monitor-select"
      dense
      persist
    />
  </section>
</template>

<style scoped lang="scss">
.clock-view {
  display: flex;
  min-height: calc(100vh - 5rem - var(--ds-dock-height, 5.5rem));
  flex-direction: column;
  padding: var(--ds-spacing-page, 1.5rem);
  padding-bottom: calc(var(--ds-dock-height, 5.5rem) + 5rem);
}

.clock-view__monitor-select {
  position: fixed;
  right: 6.75rem;
  bottom: calc(var(--ds-dock-height, 5.5rem) + 1.875rem);
  z-index: 36;
}

.clock-view__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.clock-view__back {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;
  transition: background-color 160ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 14%, transparent);
  }

  .ti {
    font-size: 1.25rem;
  }
}

.clock-view__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.clock-view__brand-icon {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-md, 0.75rem);
  background: color-mix(in srgb, var(--ds-color-primary) 16%, transparent);
  color: var(--ds-color-primary);

  .ti {
    font-size: 1.35rem;
  }
}

.clock-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
}

.clock-view__stage {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.clock-view__widget {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 56rem;
  aspect-ratio: 21 / 9;
  max-height: min(100%, 28rem);
  overflow: hidden;
}

.clock-view__toolbar {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  display: flex;
  gap: 0.5rem;
}

.clock-view__tool-btn {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
  color: var(--ds-color-primary);
  cursor: pointer;
  transition:
    transform 160ms ease,
    background-color 160ms ease,
    color 160ms ease;

  &:hover {
    transform: scale(1.06);
    background: color-mix(in srgb, var(--ds-color-primary) 28%, transparent);
  }

  .ti {
    font-size: 1.1rem;
  }
}

.clock-view__preview {
  width: 100%;
  height: 100%;
  padding: 1.5rem;
}

.clock-view__projecting {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  color: var(--ds-color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  transform: translateX(-50%);

  .ti {
    font-size: 0.95rem;
  }
}
</style>
