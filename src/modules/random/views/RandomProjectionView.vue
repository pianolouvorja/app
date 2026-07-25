<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { ProjectionBackground } from '@design-system/index'
import { BROWSER_STORAGE_KEYS } from '@shared/constants/storage-keys'

import RandomPreview from '../components/RandomPreview.vue'
import {
  RANDOM_CONFIG_CHANNEL,
  loadRandomDisplayConfig,
  normalizeRandomDisplayConfig,
} from '../services/random-preferences'
import {
  RANDOM_RUNTIME_CHANNEL,
  RANDOM_RUNTIME_STORAGE_KEY,
  normalizeRandomRuntime,
  readRandomRuntimeFromStorage,
} from '../services/random-runtime'
import {
  DEFAULT_RANDOM_DISPLAY_CONFIG,
  DEFAULT_RANDOM_RUNTIME,
  type RandomDisplayConfig,
  type RandomRuntimeState,
} from '../types/random'

const config = ref<RandomDisplayConfig>({ ...DEFAULT_RANDOM_DISPLAY_CONFIG })
const runtime = ref<RandomRuntimeState>({ ...DEFAULT_RANDOM_RUNTIME })

let configChannel: BroadcastChannel | null = null
let runtimeChannel: BroadcastChannel | null = null

function refreshConfig() {
  config.value = loadRandomDisplayConfig()
}

function refreshRuntime() {
  runtime.value = readRandomRuntimeFromStorage()
}

function onStorage(event: StorageEvent) {
  if (event.key === BROWSER_STORAGE_KEYS.userPreferences) {
    refreshConfig()
    return
  }
  if (event.key === RANDOM_RUNTIME_STORAGE_KEY) {
    refreshRuntime()
  }
}

function onConfigMessage(event: MessageEvent<unknown>) {
  config.value = normalizeRandomDisplayConfig(event.data)
}

function onRuntimeMessage(event: MessageEvent<unknown>) {
  runtime.value = normalizeRandomRuntime(event.data)
}

onMounted(() => {
  refreshConfig()
  refreshRuntime()
  window.addEventListener('storage', onStorage)

  try {
    configChannel = new BroadcastChannel(RANDOM_CONFIG_CHANNEL)
    configChannel.addEventListener('message', onConfigMessage)
  } catch {
    configChannel = null
  }

  try {
    runtimeChannel = new BroadcastChannel(RANDOM_RUNTIME_CHANNEL)
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
  <ProjectionBackground class="random-projection">
    <div
      class="random-projection__stage"
      :style="surfaceStyle"
    >
      <RandomPreview
        :config="config"
        :runtime="runtime"
      />
    </div>
  </ProjectionBackground>
</template>

<style scoped lang="scss">
.random-projection {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.random-projection__stage {
  width: 100%;
  height: 100%;
}
</style>
