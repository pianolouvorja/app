<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GradientBackground } from '@design-system/index'
import { useAppBootstrap } from '@modules/starting/composables/useAppBootstrap'
import logoUrl from '@assets/brand/logo-louvor-ja.svg'

const { t } = useI18n()
const {
  isVisible,
  showContent,
  progress,
  isFirstBoot,
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
      >
        <GradientBackground class="starting-overlay__bg">
          <Transition name="starting-fade" appear>
            <main
              v-if="showContent"
              class="starting-overlay__content"
            >
              <div class="starting-overlay__brand">
                <img
                  class="starting-overlay__logo"
                  :src="logoUrl"
                  :alt="t('app.name')"
                  width="80"
                  height="80"
                >
                <h1 class="starting-overlay__title">
                  {{ isFirstBoot ? t('starting.titleFirstBoot') : t('starting.titleWarmBoot') }}
                </h1>
                <p class="starting-overlay__subtitle">
                  {{ t('starting.subtitle') }}
                </p>
              </div>

              <section class="starting-overlay__progress">
                <div class="starting-overlay__labels">
                  <span class="starting-overlay__status">
                    {{ t(statusKey) }}
                  </span>
                  <span class="starting-overlay__percent">
                    {{ hasError ? '!' : `${progress}%` }}
                  </span>
                </div>

                <div
                  v-if="!hasError"
                  class="starting-overlay__track"
                  aria-hidden="true"
                >
                  <div
                    class="starting-overlay__fill"
                    :style="{ width: `${Math.max(progress, 4)}%` }"
                  />
                </div>

                <v-btn
                  v-else
                  color="primary"
                  class="starting-overlay__retry"
                  @click="retryBootstrap"
                >
                  {{ t('starting.retry') }}
                </v-btn>
              </section>
            </main>
          </Transition>
        </GradientBackground>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.starting-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  color: var(--ds-color-on-surface);
}

.starting-overlay__bg {
  height: 100%;
}

.starting-overlay__bg :deep(.ds-gradient-bg__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.starting-overlay__content {
  display: flex;
  width: 100%;
  max-width: 450px;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.starting-overlay__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.starting-overlay__logo {
  width: 80px;
  height: auto;
  margin-bottom: 1.5rem;
  animation: starting-pulse 2s ease-in-out infinite;
}

.starting-overlay__title {
  margin: 0 0 0.5rem;
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 2.25rem;
}

.starting-overlay__subtitle {
  margin: 0;
  max-width: 28rem;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.25rem;
}

.starting-overlay__progress {
  width: 100%;
  margin-top: 2.5rem;
}

.starting-overlay__labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding-inline: 0.25rem;
}

.starting-overlay__status {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.starting-overlay__percent {
  color: #60a5fa;
  font-size: 0.6875rem;
  font-weight: 700;
}

.starting-overlay__track {
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: 9999px;
  background-color: #1e293b;
}

.starting-overlay__fill {
  height: 100%;
  min-width: 4%;
  border-radius: inherit;
  background-color: #2563eb;
  transition: width 0.5s ease-out;
}

.starting-overlay__retry {
  margin-top: 1rem;
}

.starting-fade-enter-active,
.starting-fade-leave-active {
  transition: opacity 0.35s ease;
}

.starting-fade-enter-from,
.starting-fade-leave-to {
  opacity: 0;
}

@keyframes starting-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.08);
    opacity: 0.85;
  }
}
</style>
