<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, ref } from 'vue'

import type { TimerDisplayConfig, TimerRuntimeState } from '../types/timer'
import { useTimerDisplay } from '../composables/useTimer'

const props = withDefaults(
  defineProps<{
    config: TimerDisplayConfig
    runtime: TimerRuntimeState
    preview?: boolean
  }>(),
  {
    preview: false,
  },
)

const containerRef = useTemplateRef<HTMLElement>('container')
const sizeWidth = ref(0)
const sizeHeight = ref(0)

const { formattedTime } = useTimerDisplay(
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
  color: props.preview ? 'var(--ds-color-on-surface)' : props.config.textColor,
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
    class="timer-preview"
    :style="surfaceStyle"
  >
    <div
      class="timer-preview__digital"
      :style="{
        fontSize: `${digitalFontSize}px`,
        textShadow: preview ? 'none' : `0 4px 30px ${config.textColor}40`,
      }"
    >
      {{ formattedTime }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.timer-preview {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.timer-preview__digital {
  width: 100%;
  font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: center;
  line-height: 1;
}
</style>
