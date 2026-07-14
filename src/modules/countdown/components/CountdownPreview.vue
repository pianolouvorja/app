<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CountdownDisplayConfig, CountdownRuntimeState } from '../types/countdown'
import { useCountdownDisplay } from '../composables/useCountdown'

const props = withDefaults(
  defineProps<{
    config: CountdownDisplayConfig
    runtime: CountdownRuntimeState
    preview?: boolean
  }>(),
  {
    preview: false,
  },
)

const { t } = useI18n()
const containerRef = useTemplateRef<HTMLElement>('container')
const sizeWidth = ref(0)
const sizeHeight = ref(0)

const { formattedTime, isUrgent, isFinished } = useCountdownDisplay(
  () => props.config,
  () => props.runtime,
)

const digitalFontSize = computed(() => {
  const v = Math.min(sizeWidth.value, sizeHeight.value)
  const hasMs = props.config.timeFormat.includes('ms')
  const ratio = hasMs ? 0.28 : 0.36
  return Math.max(v * ratio, 20)
})

const surfaceStyle = computed(() => ({
  background: props.preview ? 'transparent' : props.config.bgColor,
  color: props.preview
    ? isFinished.value
      ? 'var(--ds-color-error, #ffb4ab)'
      : isUrgent.value
        ? '#ffa726'
        : 'var(--ds-color-on-surface)'
    : isFinished.value
      ? '#ff6b6b'
      : isUrgent.value
        ? '#ffa726'
        : props.config.textColor,
}))

function measure() {
  const el = containerRef.value
  if (!el) return
  sizeWidth.value = el.offsetWidth
  sizeHeight.value = el.offsetHeight

  if (sizeWidth.value <= 0 || sizeHeight.value <= 0) {
    window.setTimeout(measure, 100)
  }
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})

onUnmounted(() => {
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <div
    ref="container"
    class="countdown-preview"
    :class="{
      'countdown-preview--urgent': isUrgent,
      'countdown-preview--finished': isFinished,
    }"
    :style="surfaceStyle"
  >
    <div
      class="countdown-preview__digital"
      :style="{
        fontSize: `${digitalFontSize}px`,
        textShadow: preview ? 'none' : '0 4px 30px rgba(0, 0, 0, 0.35)',
      }"
    >
      {{ formattedTime }}
    </div>
    <div
      v-if="isFinished"
      class="countdown-preview__finished"
    >
      {{ t('countdown.finished') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.countdown-preview {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  gap: 0.5rem;
}

.countdown-preview__digital {
  width: 100%;
  font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: center;
  line-height: 1;
}

.countdown-preview__finished {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
}

.countdown-preview--urgent .countdown-preview__digital {
  animation: countdown-pulse 1s ease-in-out infinite;
}

@keyframes countdown-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.72;
  }
}
</style>
