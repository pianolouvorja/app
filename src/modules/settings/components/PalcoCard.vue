<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { palcoSession } from '../services/palco-session'
import { startPalcoBridge, stopPalcoBridge } from '../services/palco-bridge'

/**
 * Card do Palco (cast para TV): liga/desliga o sender WS (:7081) do desktop.
 * Receiver (webOS/Tizen/AndroidTV) conecta e recebe a projeção com a
 * personalização de palco configurada — paridade com o APK.
 */

const { t } = useI18n()

const isOn = ref(false)
const receivers = ref(0)
const url = ref<string | null>(null)
const busy = ref(false)
const available = palcoSession.isElectron

let connectedHandler: ((info: { count: number }) => void) | null = null
let disconnectedHandler: ((info: { count: number }) => void) | null = null

async function refreshStatus() {
  const st = await palcoSession.status()
  if (st) {
    isOn.value = st.running
    receivers.value = st.clients
    url.value = st.url
  }
}

async function toggle() {
  if (busy.value) return
  busy.value = true
  try {
    if (isOn.value) {
      await palcoSession.turnOff()
      stopPalcoBridge()
    } else {
      const ok = await palcoSession.turnOn()
      if (!ok) return // falhou (porta em uso / sem rede)
      startPalcoBridge()
    }
    await refreshStatus()
  } finally {
    busy.value = false
  }
}

function copyUrl() {
  if (url.value) void navigator.clipboard?.writeText(url.value)
}

onMounted(() => {
  void refreshStatus()
  connectedHandler = (info) => {
    receivers.value = info.count
  }
  disconnectedHandler = (info) => {
    receivers.value = info.count
  }
  palcoSession.onReceiverConnected(connectedHandler)
  palcoSession.onReceiverDisconnected(disconnectedHandler)
})

onUnmounted(() => {
  connectedHandler = null
  disconnectedHandler = null
})
</script>

<template>
  <GlassCard
    class="palco-card"
    :padding="false"
  >
    <div class="palco-card__header">
      <div class="palco-card__heading">
        <div class="palco-card__icon">
          <i
            class="ti ti-device-tv"
            aria-hidden="true"
          />
        </div>
        <div>
          <h3>{{ t('settings.palco.title') }}</h3>
          <p>{{ t('settings.palco.subtitle') }}</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        :aria-checked="isOn"
        class="palco-card__switch"
        :class="{ 'palco-card__switch--on': isOn }"
        :aria-label="t('settings.palco.title')"
        :disabled="busy || !available"
        @click="toggle"
      />
    </div>

    <div
      v-if="isOn"
      class="palco-card__body"
    >
      <p class="palco-card__status">
        <i
          class="ti"
          :class="receivers > 0 ? 'ti-circle-check' : 'ti-hourglass'"
          aria-hidden="true"
        />
        {{
          receivers > 0
            ? t('settings.palco.connected', { count: receivers })
            : t('settings.palco.waiting')
        }}
      </p>

      <button
        type="button"
        class="palco-card__url"
        @click="copyUrl"
      >
        <i
          class="ti ti-link"
          aria-hidden="true"
        />
        {{ url }}
      </button>
      <p class="palco-card__hint">
        {{ t('settings.palco.hint') }}
      </p>
    </div>

    <p
      v-if="!available"
      class="palco-card__unavailable"
    >
      {{ t('settings.palco.desktopOnly') }}
    </p>
  </GlassCard>
</template>

<style scoped lang="scss">
.palco-card {
  overflow: hidden;
}

.palco-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
}

.palco-card__heading {
  display: flex;
  align-items: center;
  gap: 0.85rem;

  h3 {
    margin: 0;
    color: var(--ds-color-on-surface);
    font-size: 1rem;
    font-weight: 700;
  }

  p {
    margin: 0.15rem 0 0;
    color: var(--ds-color-on-surface-variant);
    font-size: 0.78rem;
  }
}

.palco-card__icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-md, 0.75rem 0 0.75rem 0);
  background: color-mix(in srgb, var(--ds-color-primary) 16%, transparent);
  color: var(--ds-color-primary);

  .ti {
    font-size: 1.25rem;
  }
}

.palco-card__switch {
  position: relative;
  width: 3.25rem;
  height: 1.75rem;
  flex-shrink: 0;
  border: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-on-surface) 18%, transparent);
  cursor: pointer;
  transition: background-color 180ms ease;

  &::after {
    position: absolute;
    top: 0.2rem;
    left: 0.2rem;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 9999px;
    background: var(--ds-color-on-surface);
    content: '';
    transition: transform 180ms ease;
  }

  &--on {
    background: var(--ds-color-primary);

    &::after {
      transform: translateX(1.5rem);
      background: #fff;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.palco-card__body {
  padding: 0 1.25rem 1.1rem;
}

.palco-card__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.6rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.82rem;

  .ti {
    font-size: 0.95rem;
  }
}

.palco-card__url {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 16%, transparent);
  border-radius: var(--ds-radius-md, 0.5rem 0 0.5rem 0);
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  color: var(--ds-color-primary);
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  cursor: pointer;
}

.palco-card__hint,
.palco-card__unavailable {
  margin: 0.6rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.72rem;
}
</style>
