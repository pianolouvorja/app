<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PresentationEngine } from '@/shared/types/desktop-bridge'

const { t } = useI18n()

const bridge = window.louvorja
const hasApi = Boolean(bridge?.isElectron && bridge.presentation?.getEngine)

const engine = ref<PresentationEngine>('auto')
const busy = ref(false)

onMounted(async () => {
  if (!hasApi) return
  try {
    engine.value = await bridge!.presentation!.getEngine!()
  } catch {
    engine.value = 'auto'
  }
})

async function setEngine(next: PresentationEngine) {
  if (!hasApi || busy.value) return
  busy.value = true
  const previous = engine.value
  engine.value = next
  try {
    const ok = await bridge!.presentation!.setEngine!(next)
    if (!ok) engine.value = previous
  } catch {
    engine.value = previous
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="ppt-engine-card" data-test="ppt-engine-card">
    <h3>{{ t('settings.presentation.title') }}</h3>
    <p class="hint">{{ t('settings.presentation.description') }}</p>

    <div
      v-if="hasApi"
      class="options"
      role="radiogroup"
      :aria-label="t('settings.presentation.title')"
    >
      <button
        v-for="option in (['auto', 'powerpoint', 'libreoffice'] as const)"
        :key="option"
        type="button"
        role="radio"
        :aria-checked="engine === option"
        :class="{ selected: engine === option }"
        :data-test="`ppt-engine-${option}`"
        :disabled="busy"
        @click="setEngine(option)"
      >
        {{ t(`settings.presentation.engine.${option}`) }}
      </button>
    </div>
    <p v-else class="hint">{{ t('settings.presentation.desktopOnly') }}</p>

    <p class="hint small">{{ t('settings.presentation.hint') }}</p>
  </section>
</template>

<style scoped>
.ppt-engine-card {
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
