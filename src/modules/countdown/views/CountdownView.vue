<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { GlassCard } from '@design-system/index'
import MonitorTargetSelect from '@shared/components/MonitorTargetSelect.vue'

import CountdownConfigDialog from '../components/CountdownConfigDialog.vue'
import CountdownDurationInput from '../components/CountdownDurationInput.vue'
import CountdownPreview from '../components/CountdownPreview.vue'
import CountdownProjectFab from '../components/CountdownProjectFab.vue'
import CountdownSavedList from '../components/CountdownSavedList.vue'
import { useCountdownFeature } from '../composables/useCountdown'

const { t } = useI18n()
const router = useRouter()

const {
  config,
  runtime,
  isProjecting,
  configOpen,
  isRunning,
  canStart,
  setTimeFormat,
  setBgColor,
  setTextColor,
  resetDisplayToDefault,
  openConfig,
  closeConfig,
  setDurationMs,
  start,
  pause,
  reset,
  saveMark,
  removeSavedMark,
  clearSavedMarks,
  toggleProjection,
} = useCountdownFeature()

function goBack() {
  void router.push({ name: 'utilities-temporizador' })
}

function onToggleProjection() {
  void toggleProjection()
}
</script>

<template>
  <section class="countdown-view">
    <header class="countdown-view__header">
      <button
        type="button"
        class="countdown-view__back"
        :aria-label="t('countdown.backToUtilities')"
        @click="goBack"
      >
        <i
          class="mdi mdi-arrow-left"
          aria-hidden="true"
        />
      </button>

      <div class="countdown-view__brand">
        <div class="countdown-view__brand-icon">
          <i
            class="mdi mdi-timer-sand"
            aria-hidden="true"
          />
        </div>
        <h1 class="countdown-view__title">
          {{ t('countdown.title') }}
        </h1>
      </div>
    </header>

    <div class="countdown-view__content">
      <div class="countdown-view__stage">
        <GlassCard
          class="countdown-view__widget"
          :padding="false"
        >
          <div class="countdown-view__toolbar">
            <button
              type="button"
              class="countdown-view__tool-btn"
              :aria-label="t('countdown.config')"
              :title="t('countdown.config')"
              @click="openConfig"
            >
              <i
                class="mdi mdi-palette"
                aria-hidden="true"
              />
            </button>
          </div>

          <div class="countdown-view__duration">
            <CountdownDurationInput
              :duration-ms="runtime.durationMs"
              :disabled="isRunning"
              @update:duration-ms="setDurationMs"
            />
          </div>

          <div class="countdown-view__preview">
            <CountdownPreview
              :config="config"
              :runtime="runtime"
              preview
            />
          </div>

          <div class="countdown-view__controls">
            <button
              v-if="!isRunning"
              type="button"
              class="countdown-view__ctrl countdown-view__ctrl--start"
              :disabled="!canStart"
              @click="start"
            >
              <i
                class="mdi mdi-play"
                aria-hidden="true"
              />
              {{ t('countdown.start') }}
            </button>
            <button
              v-else
              type="button"
              class="countdown-view__ctrl countdown-view__ctrl--pause"
              @click="pause"
            >
              <i
                class="mdi mdi-pause"
                aria-hidden="true"
              />
              {{ t('countdown.pause') }}
            </button>

            <button
              type="button"
              class="countdown-view__ctrl countdown-view__ctrl--reset"
              @click="reset"
            >
              <i
                class="mdi mdi-refresh"
                aria-hidden="true"
              />
              {{ t('countdown.reset') }}
            </button>

            <button
              type="button"
              class="countdown-view__ctrl countdown-view__ctrl--save"
              @click="saveMark"
            >
              <i
                class="mdi mdi-content-save"
                aria-hidden="true"
              />
              {{ t('countdown.save') }}
            </button>
          </div>

          <div
            v-if="isProjecting"
            class="countdown-view__projecting"
          >
            <i
              class="mdi mdi-monitor"
              aria-hidden="true"
            />
            {{ t('countdown.projecting') }}
          </div>
        </GlassCard>
      </div>

      <CountdownSavedList
        :items="runtime.savedTimesMs"
        :time-format="config.timeFormat"
        @remove="removeSavedMark"
        @clear="clearSavedMarks"
      />
    </div>

    <CountdownConfigDialog
      :open="configOpen"
      :config="config"
      @close="closeConfig"
      @update:time-format="setTimeFormat"
      @update:bg-color="setBgColor"
      @update:text-color="setTextColor"
      @reset="resetDisplayToDefault"
    />

    <CountdownProjectFab
      :projecting="isProjecting"
      @project="onToggleProjection"
      @clear="onToggleProjection"
    />
    <MonitorTargetSelect
      class="countdown-view__monitor-select"
      dense
      persist
    />
  </section>
</template>

<style scoped lang="scss">
.countdown-view {
  display: flex;
  min-height: calc(100vh - 5rem - var(--ds-dock-height, 5.5rem));
  flex-direction: column;
  padding: var(--ds-spacing-page, 1.5rem);
  padding-bottom: calc(var(--ds-dock-height, 5.5rem) + 5rem);
}

.countdown-view__monitor-select {
  position: fixed;
  right: 6.75rem;
  bottom: calc(var(--ds-dock-height, 5.5rem) + 1.875rem);
  z-index: 36;
}

.countdown-view__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.countdown-view__back {
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

.countdown-view__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.countdown-view__brand-icon {
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

.countdown-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
}

.countdown-view__content {
  display: flex;
  flex: 1;
  align-items: stretch;
  justify-content: center;
  gap: 1.25rem;
  min-height: 0;
}

.countdown-view__stage {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
}

.countdown-view__widget {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 56rem;
  min-height: 22rem;
  max-height: min(100%, 34rem);
  overflow: hidden;
  flex-direction: column;
}

.countdown-view__toolbar {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  display: flex;
  gap: 0.5rem;
}

.countdown-view__tool-btn {
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

.countdown-view__duration {
  flex-shrink: 0;
  padding: 1rem 1.25rem 0;
}

.countdown-view__preview {
  flex: 1;
  min-height: 8rem;
  padding: 0.75rem 1.5rem 0.5rem;
}

.countdown-view__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0.75rem 1.25rem 1.25rem;
}

.countdown-view__ctrl {
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

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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

.countdown-view__projecting {
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
  .countdown-view__content {
    flex-direction: column;
    align-items: center;
  }
}
</style>
