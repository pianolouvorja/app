<script setup lang="ts">
import { computed } from 'vue'

import type { RandomDisplayConfig, RandomRuntimeState } from '../types/random'

const props = defineProps<{
  config: RandomDisplayConfig
  runtime: RandomRuntimeState
}>()

const surfaceStyle = computed(() => ({
  background: props.config.bgColor,
  color: props.config.textColor,
}))

const textStyle = computed(() => ({
  fontSize: props.runtime.isDrawing
    ? `${props.config.fontSizePc * 0.8}vw`
    : `${props.config.fontSizePc}vw`,
  textTransform: props.config.textTransform,
  textShadow: props.runtime.isDrawing
    ? 'none'
    : `0 10px 40px ${props.config.textColor}60`,
  opacity: props.runtime.currentDisplay ? 1 : 0,
}))
</script>

<template>
  <div
    class="random-preview"
    :style="surfaceStyle"
  >
    <Transition
      name="random-preview-slide"
      mode="out-in"
    >
      <div
        :key="runtime.isDrawing ? 'drawing' : runtime.currentDisplay"
        class="random-preview__text"
        :style="textStyle"
      >
        {{ runtime.currentDisplay }}
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.random-preview {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.random-preview__text {
  width: 100%;
  padding: 0 2.5rem;
  font-weight: 900;
  line-height: 1.1;
  text-align: center;
  word-break: break-word;
  transition: all 300ms ease-out;
}

.random-preview-slide-enter-active,
.random-preview-slide-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.random-preview-slide-enter-from {
  opacity: 0;
  transform: translateY(1rem);
}

.random-preview-slide-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
