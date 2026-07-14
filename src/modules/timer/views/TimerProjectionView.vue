<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { ProjectionBackground } from '@design-system/index'
import { BROWSER_STORAGE_KEYS } from '@shared/constants/storage-keys'

import TimerPreview from '../components/TimerPreview.vue'
import {
  TIMER_CONFIG_CHANNEL,
  loadTimerDisplayConfig,
  normalizeTimerDisplayConfig,
} from '../services/timer-preferences'
import {
  TIMER_RUNTIME_CHANNEL,
  TIMER_RUNTIME_STORAGE_KEY,
  normalizeTimerRuntime,
  readTimerRuntimeFromStorage,
} from '../services/timer-runtime'
import type { TimerDisplayConfig, TimerRuntimeState } from '../types/timer'
import {
  DEFAULT_TIMER_DISPLAY_CONFIG,
  DEFAULT_TIMER_RUNTIME,
} from '../types/timer'

const config = ref<TimerDisplayConfig>({ ...DEFAULT_TIMER_DISPLAY_CONFIG })
const runtime = ref<TimerRuntimeState>({
  ...DEFAULT_TIMER_RUNTIME,
  savedTimesMs: [],
})

let configChannel: BroadcastChannel | null = null
let runtimeChannel: BroadcastChannel | null = null

function refreshConfig() {
  config.value = loadTimerDisplayConfig()
}

function refreshRuntime() {
  runtime.value = readTimerRuntimeFromStorage()
}

function onStorage(event: StorageEvent) {
  if (event.key === BROWSER_STORAGE_KEYS.userPreferences) {
    refreshConfig()
    return
  }
  if (event.key === TIMER_RUNTIME_STORAGE_KEY) {
    refreshRuntime()
  }
}

function onConfigMessage(event: MessageEvent<unknown>) {
  config.value = normalizeTimerDisplayConfig(event.data)
}

function onRuntimeMessage(event: MessageEvent<unknown>) {
  runtime.value = normalizeTimerRuntime(event.data)
}

onMounted(() => {
  refreshConfig()
  refreshRuntime()
  window.addEventListener('storage', onStorage)

  try {
    configChannel = new BroadcastChannel(TIMER_CONFIG_CHANNEL)
    configChannel.addEventListener('message', onConfigMessage)
  } catch {
    configChannel = null
  }

  try {
    runtimeChannel = new BroadcastChannel(TIMER_RUNTIME_CHANNEL)
    runtimeChannel.addEventListener('message', onRuntimeMessage)
  } catch {
    runtimeChannel = null
  }
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  configChannel?.removeEventListener('message', onConfigMessage)
  configChannel?.close()
  configChannel = null
  runtimeChannel?.removeEventListener('message', onRuntimeMessage)
  runtimeChannel?.close()
  runtimeChannel = null
})

const surfaceStyle = computed(() => ({
  background: config.value.bgColor,
}))
</script>

<template>
  <ProjectionBackground class="timer-projection">
    <div
      class="timer-projection__stage"
      :style="surfaceStyle"
    >
      <TimerPreview
        :config="config"
        :runtime="runtime"
      />
    </div>
  </ProjectionBackground>
</template>

<style scoped lang="scss">
.timer-projection {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.timer-projection__stage {
  width: 100%;
  height: 100%;
}
</style>
