<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { GlassCard } from '@design-system/index'
import MonitorTargetSelect from '@shared/components/MonitorTargetSelect.vue'

import TimerConfigDialog from '../components/TimerConfigDialog.vue'
import TimerPreview from '../components/TimerPreview.vue'
import TimerProjectFab from '../components/TimerProjectFab.vue'
import TimerSavedList from '../components/TimerSavedList.vue'
import { useTimerFeature } from '../composables/useTimer'

const { t } = useI18n()
const router = useRouter()

const {
  config,
  runtime,
  isProjecting,
  configOpen,
  isRunning,
  setTimeFormat,
  setBgColor,
  setTextColor,
  resetDisplayToDefault,
  openConfig,
  closeConfig,
  start,
  pause,
  reset,
  saveMark,
  removeSavedMark,
  clearSavedMarks,
  toggleProjection,
} = useTimerFeature()

function goBack() {
  void router.push({ name: 'utilities-temporizador' })
}

function onToggleProjection() {
  void toggleProjection()
}
</script>

<template>
  <section class="timer-view">
    <header class="timer-view__header">
      <button
        type="button"
        class="timer-view__back"
        :aria-label="t('timer.backToUtilities')"
        @click="goBack"
      >
        <i
          class="mdi mdi-arrow-left"
          aria-hidden="true"
        />
      </button>

      <div class="timer-view__brand">
        <div class="timer-view__brand-icon">
          <i
            class="mdi mdi-timer-outline"
            aria-hidden="true"
          />
        </div>
        <h1 class="timer-view__title">
          {{ t('timer.title') }}
        </h1>
      </div>
    </header>

    <div class="timer-view__content">
      <div class="timer-view__stage">
        <GlassCard
          class="timer-view__widget"
          :padding="false"
        >
          <div class="timer-view__toolbar">
            <button
              type="button"
              class="timer-view__tool-btn"
              :aria-label="t('timer.config')"
              :title="t('timer.config')"
              @click="openConfig"
            >
              <i
                class="mdi mdi-palette"
                aria-hidden="true"
              />
            </button>
          </div>

          <div class="timer-view__preview">
            <TimerPreview
              :config="config"
              :runtime="runtime"
              preview
            />
          </div>

          <div class="timer-view__controls">
            <button
              v-if="!isRunning"
              type="button"
              class="timer-view__ctrl timer-view__ctrl--start"
              @click="start"
            >
              <i
                class="mdi mdi-play"
                aria-hidden="true"
              />
              {{ t('timer.start') }}
            </button>
            <button
              v-else
              type="button"
              class="timer-view__ctrl timer-view__ctrl--pause"
              @click="pause"
            >
              <i
                class="mdi mdi-pause"
                aria-hidden="true"
              />
              {{ t('timer.pause') }}
            </button>

            <button
              type="button"
              class="timer-view__ctrl timer-view__ctrl--reset"
              @click="reset"
            >
              <i
                class="mdi mdi-refresh"
                aria-hidden="true"
              />
              {{ t('timer.reset') }}
            </button>

            <button
              type="button"
              class="timer-view__ctrl timer-view__ctrl--save"
              @click="saveMark"
            >
              <i
                class="mdi mdi-content-save"
                aria-hidden="true"
              />
              {{ t('timer.save') }}
            </button>
          </div>

          <div
            v-if="isProjecting"
            class="timer-view__projecting"
          >
            <i
              class="mdi mdi-monitor"
              aria-hidden="true"
            />
            {{ t('timer.projecting') }}
          </div>
        </GlassCard>
      </div>

      <TimerSavedList
        :items="runtime.savedTimesMs"
        :time-format="config.timeFormat"
        @remove="removeSavedMark"
        @clear="clearSavedMarks"
      />
    </div>

    <TimerConfigDialog
      :open="configOpen"
      :config="config"
      @close="closeConfig"
      @update:time-format="setTimeFormat"
      @update:bg-color="setBgColor"
      @update:text-color="setTextColor"
      @reset="resetDisplayToDefault"
    />

    <TimerProjectFab
      :projecting="isProjecting"
      @project="onToggleProjection"
      @clear="onToggleProjection"
    />
    <MonitorTargetSelect
      class="timer-view__monitor-select"
      dense
      persist
    />
  </section>
</template>

<style scoped lang="scss">
.timer-view {
  display: flex;
  min-height: calc(100vh - 5rem - var(--ds-dock-height, 5.5rem));
  flex-direction: column;
  padding: var(--ds-spacing-page, 1.5rem);
  padding-bottom: calc(var(--ds-dock-height, 5.5rem) + 5rem);
}

.timer-view__monitor-select {
  position: fixed;
  right: 6.75rem;
  bottom: calc(var(--ds-dock-height, 5.5rem) + 1.875rem);
  z-index: 36;
}

.timer-view__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.timer-view__back {
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

  .mdi {
    font-size: 1.25rem;
  }
}

.timer-view__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.timer-view__brand-icon {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-md, 0.75rem);
  background: color-mix(in srgb, var(--ds-color-primary) 16%, transparent);
  color: var(--ds-color-primary);

  .mdi {
    font-size: 1.35rem;
  }
}

.timer-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
}

.timer-view__content {
  display: flex;
  flex: 1;
  align-items: stretch;
  justify-content: center;
  gap: 1.25rem;
  min-height: 0;
}

.timer-view__stage {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
}

.timer-view__widget {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 56rem;
  aspect-ratio: 21 / 9;
  max-height: min(100%, 28rem);
  overflow: hidden;
  flex-direction: column;
}

.timer-view__toolbar {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  display: flex;
  gap: 0.5rem;
}

.timer-view__tool-btn {
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
    background-color 160ms ease;

  &:hover {
    transform: scale(1.06);
    background: color-mix(in srgb, var(--ds-color-primary) 28%, transparent);
  }

  .mdi {
    font-size: 1.1rem;
  }
}

.timer-view__preview {
  flex: 1;
  min-height: 0;
  padding: 1.5rem 1.5rem 0.5rem;
}

.timer-view__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0.75rem 1.25rem 1.25rem;
}

.timer-view__ctrl {
  display: inline-flex;
  height: 2.35rem;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.95rem;
  border: 0;
  border-radius: var(--ds-radius-md, 0.5rem);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 700;

  .mdi {
    font-size: 1.05rem;
  }

  &--start {
    background: color-mix(in srgb, #43a047 22%, transparent);
    color: #66bb6a;
  }

  &--pause {
    background: color-mix(in srgb, #fb8c00 22%, transparent);
    color: #ffa726;
  }

  &--reset {
    background: color-mix(in srgb, #e53935 18%, transparent);
    color: #ef5350;
  }

  &--save {
    background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
    color: var(--ds-color-primary);
  }
}

.timer-view__projecting {
  position: absolute;
  bottom: 4.25rem;
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

  .mdi {
    font-size: 0.95rem;
  }
}

@media (max-width: 900px) {
  .timer-view__content {
    flex-direction: column;
    align-items: center;
  }
}
</style>
