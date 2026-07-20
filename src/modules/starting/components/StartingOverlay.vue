<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { GradientBackground } from '@design-system/index'
import { useAppBootstrap } from '@modules/starting/composables/useAppBootstrap'
import logoUrl from '@assets/brand/logo-louvor-ja.svg'
import codenamePianoUrl from '@assets/brand/codenamePIANO.svg'

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
                <img
                  class="starting-overlay__codename"
                  :src="codenamePianoUrl"
                  alt="codename PIANO"
                  width="200"
                  height="30"
                >
              </div>

              <section class="starting-overlay__progress">
                <div
                  v-if="!hasError"
                  class="starting-overlay__indicator"
                >
                  <div
                    class="starting-overlay__gears"
                    aria-hidden="true"
                  >
                    <i class="ti ti-settings starting-overlay__gear starting-overlay__gear--outer" />
                    <i class="ti ti-settings starting-overlay__gear starting-overlay__gear--inner" />
                  </div>

                  <div class="starting-overlay__meter">
                    <span class="starting-overlay__percent">
                      {{ progress }}%
                    </span>
                    <span class="starting-overlay__status">
                      {{ t(statusKey) }}
                    </span>
                  </div>
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

.starting-overlay__codename {
  display: block;
  width: auto;
  height: 1.75rem;
  margin-top: 1.25rem;
  object-fit: contain;
}

.starting-overlay__progress {
  width: 100%;
  margin-top: 3.5rem;
}

.starting-overlay__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.starting-overlay__gears {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
}

.starting-overlay__gear {
  line-height: 1;
}

.starting-overlay__gear--outer {
  font-size: 3.75rem;
  color: var(--ds-color-primary-soft, var(--ds-color-primary));
  animation: starting-spin 3s linear infinite;
}

.starting-overlay__gear--inner {
  position: absolute;
  font-size: 1.875rem;
  color: var(--ds-color-primary);
  animation: starting-spin-reverse 2s linear infinite;
}

.starting-overlay__meter {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.starting-overlay__percent {
  color: var(--ds-color-primary-soft, var(--ds-color-primary));
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-shadow: 0 0 10px color-mix(in srgb, var(--ds-color-primary) 50%, transparent);
  animation: starting-pulse 2s ease-in-out infinite;
}

.starting-overlay__status {
  margin-top: 0.5rem;
  color: #94a3b8;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.starting-overlay__retry {
  margin-top: 0.5rem;
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

@keyframes starting-spin-reverse {
  to {
    transform: rotate(-360deg);
  }
}

@keyframes starting-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.72;
  }
}

@media (prefers-reduced-motion: reduce) {
  .starting-overlay__gear--outer,
  .starting-overlay__gear--inner,
  .starting-overlay__percent {
    animation: none;
  }
}
</style>
