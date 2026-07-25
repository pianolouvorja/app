<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { ProjectionBackground } from '@design-system/index'
import { BROWSER_STORAGE_KEYS } from '@shared/constants/storage-keys'

import CountdownPreview from '../components/CountdownPreview.vue'
import {
  COUNTDOWN_CONFIG_CHANNEL,
  loadCountdownDisplayConfig,
  normalizeCountdownDisplayConfig,
} from '../services/countdown-preferences'
import {
  COUNTDOWN_RUNTIME_CHANNEL,
  COUNTDOWN_RUNTIME_STORAGE_KEY,
  normalizeCountdownRuntime,
  readCountdownRuntimeFromStorage,
} from '../services/countdown-runtime'
import type {
  CountdownDisplayConfig,
  CountdownRuntimeState,
} from '../types/countdown'
import {
  DEFAULT_COUNTDOWN_DISPLAY_CONFIG,
  DEFAULT_COUNTDOWN_DURATION_MS,
  DEFAULT_COUNTDOWN_RUNTIME,
} from '../types/countdown'

const config = ref<CountdownDisplayConfig>({ ...DEFAULT_COUNTDOWN_DISPLAY_CONFIG })
const runtime = ref<CountdownRuntimeState>({
  ...DEFAULT_COUNTDOWN_RUNTIME,
  savedTimesMs: [],
  durationMs: DEFAULT_COUNTDOWN_DURATION_MS,
})

let configChannel: BroadcastChannel | null = null
let runtimeChannel: BroadcastChannel | null = null

function refreshConfig() {
  config.value = loadCountdownDisplayConfig()
}

function refreshRuntime() {
  runtime.value = readCountdownRuntimeFromStorage()
}

function onStorage(event: StorageEvent) {
  if (event.key === BROWSER_STORAGE_KEYS.userPreferences) {
    refreshConfig()
    return
  }
  if (event.key === COUNTDOWN_RUNTIME_STORAGE_KEY) {
    refreshRuntime()
  }
}

function onConfigMessage(event: MessageEvent<unknown>) {
  config.value = normalizeCountdownDisplayConfig(event.data)
}

function onRuntimeMessage(event: MessageEvent<unknown>) {
  runtime.value = normalizeCountdownRuntime(event.data)
}

onMounted(() => {
  refreshConfig()
  refreshRuntime()
  window.addEventListener('storage', onStorage)

  try {
    configChannel = new BroadcastChannel(COUNTDOWN_CONFIG_CHANNEL)
    configChannel.addEventListener('message', onConfigMessage)
  } catch {
    configChannel = null
  }

  try {
    runtimeChannel = new BroadcastChannel(COUNTDOWN_RUNTIME_CHANNEL)
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
  <ProjectionBackground class="countdown-projection">
    <div
      class="countdown-projection__stage"
      :style="surfaceStyle"
    >
      <CountdownPreview
        :config="config"
        :runtime="runtime"
      />
    </div>
  </ProjectionBackground>
</template>

<style scoped lang="scss">
.countdown-projection {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.countdown-projection__stage {
  width: 100%;
  height: 100%;
}
</style>
