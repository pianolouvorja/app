<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppBootstrap } from '@modules/starting/composables/useAppBootstrap'
import logoUrl from '@assets/brand/logo-louvor-ja.svg'

const { t } = useI18n()
const {
  isVisible,
  showContent,
  hasError,
  statusKey,
  isFirstBoot,
  progress,
  retryBootstrap,
} = useAppBootstrap()

const headline = computed(() =>
  isFirstBoot.value
    ? t('starting.titleFirstBoot')
    : t('starting.titleWarmBoot'),
)

const showProgress = computed(
  () => !hasError.value && isFirstBoot.value && progress.value > 0,
)
</script>

<template>
  <Teleport to="body">
    <Transition name="starting-fade">
      <div
        v-if="isVisible"
        class="starting-overlay"
        role="status"
        aria-live="polite"
        :aria-busy="!hasError"
        :aria-label="t(statusKey)"
      >
        <Transition name="starting-fade" appear>
          <main
            v-if="showContent"
            class="starting-overlay__content"
          >
            <img
              class="starting-overlay__logo"
              :src="logoUrl"
              alt=""
              width="96"
              height="96"
            >
            <p class="starting-overlay__brand">
              LouvorJA - PIANO
            </p>
            <p class="starting-overlay__title">
              {{ headline }}
            </p>
            <p class="starting-overlay__subtitle">
              {{ t('starting.subtitle') }}
            </p>

            <template v-if="!hasError">
              <div
                class="starting-overlay__spinner"
                aria-hidden="true"
              />
              <p
                class="starting-overlay__status"
                data-test="starting-status"
              >
                {{ t(statusKey) }}
              </p>
              <div
                v-if="showProgress"
                class="starting-overlay__progress"
                role="progressbar"
                :aria-valuenow="Math.round(progress)"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="starting-overlay__progress-fill"
                  :style="{ width: `${Math.min(100, progress)}%` }"
                />
              </div>
            </template>

            <button
              v-else
              type="button"
              class="starting-overlay__retry"
              @click="retryBootstrap"
            >
              {{ t('starting.retry') }}
            </button>
          </main>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.starting-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #12121c;
  color: #f2f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.starting-overlay__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 22rem;
  padding: 0 1.5rem;
  text-align: center;
}

.starting-overlay__logo {
  width: 96px;
  height: 96px;
  margin-bottom: 8px;
  animation: starting-pulse 1.8s ease-in-out infinite;
}

.starting-overlay__brand {
  margin: 0;
  color: #fcce02;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.starting-overlay__title {
  margin: 0;
  color: #f2f2f5;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.35;
}

.starting-overlay__subtitle {
  margin: 0 0 4px;
  color: rgba(242, 242, 245, 0.72);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.45;
}

.starting-overlay__spinner {
  width: 28px;
  height: 28px;
  margin-top: 8px;
  border: 3px solid rgba(252, 206, 2, 0.15);
  border-top-color: #fcce02;
  border-radius: 50%;
  animation: starting-spin 0.8s linear infinite;
}

.starting-overlay__status {
  margin: 0;
  min-height: 1.25rem;
  color: rgba(252, 206, 2, 0.92);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
}

.starting-overlay__progress {
  width: min(16rem, 70vw);
  height: 4px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(252, 206, 2, 0.12);
}

.starting-overlay__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #fcce02;
  transition: width 200ms ease;
}

.starting-overlay__retry {
  margin-top: 0.5rem;
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
  cursor: pointer;
}

.starting-fade-enter-active,
.starting-fade-leave-active {
  transition: opacity 0.35s ease;
}

.starting-fade-leave-active {
  pointer-events: none;
}

.starting-fade-enter-from,
.starting-fade-leave-to {
  opacity: 0;
}

@keyframes starting-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes starting-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.85;
    transform: scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .starting-overlay__logo,
  .starting-overlay__spinner {
    animation: none;
  }

  .starting-overlay__progress-fill {
    transition: none;
  }
}
</style>
