<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ExternalPlayerPreference } from '@/shared/types/desktop-bridge'

const { t } = useI18n()

const bridge = window.louvorja
const hasApi = Boolean(bridge?.isElectron && bridge.externalPlayer?.get)

const player = ref<ExternalPlayerPreference>('associated')
const busy = ref(false)

onMounted(async () => {
  if (!hasApi) return
  try {
    player.value = await bridge!.externalPlayer!.get!()
  } catch {
    player.value = 'associated'
  }
})

async function setPlayer(next: ExternalPlayerPreference) {
  if (!hasApi || busy.value) return
  busy.value = true
  const previous = player.value
  player.value = next
  try {
    const ok = await bridge!.externalPlayer!.set!(next)
    if (!ok) player.value = previous
  } catch {
    player.value = previous
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="ext-player-card" data-test="external-player-card">
    <h3>{{ t('settings.externalPlayer.title') }}</h3>
    <p class="hint">{{ t('settings.externalPlayer.description') }}</p>

    <div
      v-if="hasApi"
      class="options"
      role="radiogroup"
      :aria-label="t('settings.externalPlayer.title')"
    >
      <button
        v-for="option in (['associated', 'vlc', 'mpv'] as const)"
        :key="option"
        type="button"
        role="radio"
        :aria-checked="player === option"
        :class="{ selected: player === option }"
        :data-test="`external-player-${option}`"
        :disabled="busy"
        @click="setPlayer(option)"
      >
        {{ t(`settings.externalPlayer.player.${option}`) }}
      </button>
    </div>
    <p v-else class="hint">{{ t('settings.externalPlayer.desktopOnly') }}</p>

    <p class="hint small">{{ t('settings.externalPlayer.hint') }}</p>
  </section>
</template>

<style scoped>
.ext-player-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hint {
  opacity: 0.7;
  font-size: 0.85rem;
}
.hint.small {
  font-size: 0.78rem;
  opacity: 0.55;
}
.options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: filter 0.15s ease;
}
button:hover:not(:disabled) {
  filter: brightness(1.2);
}
button.selected {
  background: var(--ds-color-primary, #04549b);
  border-color: transparent;
  color: #fff;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>
