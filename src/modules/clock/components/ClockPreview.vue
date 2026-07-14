<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

import type { ClockConfig } from '../types/clock'
import { useClockDisplay } from '../composables/useClock'

const props = withDefaults(
  defineProps<{
    config: ClockConfig
    preview?: boolean
  }>(),
  {
    preview: false,
  },
)

const containerRef = useTemplateRef<HTMLElement>('container')
const sizeWidth = ref(0)
const sizeHeight = ref(0)

const {
  config,
  hourAngle,
  minuteAngle,
  secondAngle,
  formattedTime,
  formattedSeconds,
  ampm,
} = useClockDisplay(() => props.config)

const digitalFontSize = computed(() => {
  const v = Math.min(sizeWidth.value, sizeHeight.value)
  const ratio = config.value.showSeconds ? 0.35 : 0.4
  return Math.max(v * ratio, 20)
})

const analogSize = computed(() => {
  const v = Math.min(sizeWidth.value, sizeHeight.value)
  return Math.max(v * 0.8, 100)
})

const surfaceStyle = computed(() => ({
  background: props.preview ? 'transparent' : config.value.bgColor,
  color: props.preview ? 'var(--ds-color-on-surface)' : config.value.textColor,
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
    class="clock-preview"
    :style="surfaceStyle"
  >
    <div
      v-if="config.style === 'digital'"
      class="clock-preview__digital"
      :style="{
        fontSize: `${digitalFontSize}px`,
        textShadow: preview ? 'none' : `0 4px 30px ${config.textColor}40`,
      }"
    >
      <span>{{ formattedTime }}</span>
      <span
        v-if="config.showSeconds"
        class="clock-preview__seconds"
        :style="{
          fontSize: `${digitalFontSize * 0.5}px`,
          marginBottom: `${digitalFontSize * 0.15}px`,
        }"
      >
        {{ formattedSeconds }}
      </span>
      <span
        v-if="!config.format24h"
        class="clock-preview__ampm"
        :style="{
          fontSize: `${digitalFontSize * 0.3}px`,
          marginBottom: `${digitalFontSize * 0.2}px`,
        }"
      >
        {{ ampm }}
      </span>
    </div>

    <div
      v-else
      class="clock-preview__analog"
      :style="{
        width: `${analogSize}px`,
        height: `${analogSize}px`,
        border: `min(8px, ${analogSize * 0.02}px) solid ${preview ? 'var(--ds-color-on-surface)' : config.textColor}`,
        boxShadow: preview
          ? 'none'
          : `inset 0 0 40px ${config.bgColor}40, 0 10px 40px ${config.textColor}20`,
      }"
    >
      <div
        class="clock-preview__center"
        :style="{
          width: `${analogSize * 0.06}px`,
          height: `${analogSize * 0.06}px`,
          background: preview ? 'var(--ds-color-on-surface)' : config.textColor,
        }"
      />

      <div
        class="clock-preview__hand clock-preview__hand--hour"
        :style="{
          width: `${analogSize * 0.025}px`,
          height: `${analogSize * 0.3}px`,
          background: preview ? 'var(--ds-color-on-surface)' : config.textColor,
          left: `calc(50% - ${analogSize * 0.0125}px)`,
          transform: `rotate(${hourAngle}deg)`,
        }"
      />

      <div
        class="clock-preview__hand clock-preview__hand--minute"
        :style="{
          width: `${analogSize * 0.015}px`,
          height: `${analogSize * 0.4}px`,
          background: preview ? 'var(--ds-color-on-surface)' : config.textColor,
          left: `calc(50% - ${analogSize * 0.0075}px)`,
          transform: `rotate(${minuteAngle}deg)`,
        }"
      />

      <div
        v-if="config.showSeconds"
        class="clock-preview__hand clock-preview__hand--second"
        :style="{
          width: `${analogSize * 0.005}px`,
          height: `${analogSize * 0.45}px`,
          left: `calc(50% - ${analogSize * 0.0025}px)`,
          transform: `rotate(${secondAngle}deg)`,
        }"
      >
        <div class="clock-preview__second-tail" />
      </div>

      <div
        v-for="i in 12"
        :key="i"
        class="clock-preview__marker-rail"
        :style="{ transform: `rotate(${i * 30}deg)` }"
      >
        <div
          class="clock-preview__marker"
          :style="{
            width: `${i % 3 === 0 ? analogSize * 0.02 : analogSize * 0.01}px`,
            height: `${i % 3 === 0 ? analogSize * 0.06 : analogSize * 0.03}px`,
            marginTop: `${analogSize * 0.02}px`,
            background: preview ? 'var(--ds-color-on-surface)' : config.textColor,
            opacity: i % 3 === 0 ? 1 : 0.5,
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.clock-preview {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.clock-preview__digital {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 900;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.clock-preview__seconds {
  align-self: flex-end;
  margin-left: 0.5rem;
  opacity: 0.7;
}

.clock-preview__ampm {
  align-self: flex-end;
  margin-left: 1rem;
  font-weight: 700;
  opacity: 0.5;
}

.clock-preview__analog {
  position: relative;
  border-radius: 9999px;
}

.clock-preview__center {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 10;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
}

.clock-preview__hand {
  position: absolute;
  bottom: 50%;
  z-index: 7;
  border-radius: 4px;
  transform-origin: bottom center;
  transition: transform 0.05s cubic-bezier(0.4, 2.08, 0.55, 0.44);

  &--minute {
    z-index: 8;
    opacity: 0.8;
  }

  &--second {
    z-index: 9;
    background: #ff3b30;
    transition: none;
  }
}

.clock-preview__second-tail {
  position: absolute;
  top: 100%;
  width: 100%;
  height: 20%;
  background: #ff3b30;
}

.clock-preview__marker-rail {
  position: absolute;
  inset: 0;
}

.clock-preview__marker {
  margin-right: auto;
  margin-left: auto;
  border-radius: 2px;
}
</style>
