<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useAppBootstrap } from '@modules/starting/composables/useAppBootstrap'
import logoUrl from '@assets/brand/logo-louvor-ja.svg'

const { t } = useI18n()
const {
  isVisible,
  showContent,
  hasError,
  statusKey,
  retryBootstrap,
} = useAppBootstrap()
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
            <p class="starting-overlay__title">
              LouvorJA - PIANO
            </p>

            <div
              v-if="!hasError"
              class="starting-overlay__spinner"
              aria-hidden="true"
            />

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
  gap: 24px;
  text-align: center;
}

.starting-overlay__logo {
  width: 96px;
  height: 96px;
  animation: starting-pulse 1.8s ease-in-out infinite;
}

.starting-overlay__title {
  margin: 0;
  color: #fcce02;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.starting-overlay__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(252, 206, 2, 0.15);
  border-top-color: #fcce02;
  border-radius: 50%;
  animation: starting-spin 0.8s linear infinite;
}

.starting-overlay__retry {
  margin-top: 0.25rem;
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
}
</style>
