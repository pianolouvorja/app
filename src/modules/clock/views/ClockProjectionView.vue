<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { ProjectionBackground } from '@design-system/index'
import { BROWSER_STORAGE_KEYS } from '@shared/constants/storage-keys'

import ClockPreview from '../components/ClockPreview.vue'
import {
  CLOCK_CONFIG_CHANNEL,
  loadClockConfig,
  normalizeClockConfig,
} from '../services/clock-preferences'
import type { ClockConfig } from '../types/clock'
import { DEFAULT_CLOCK_CONFIG } from '../types/clock'

const config = ref<ClockConfig>({ ...DEFAULT_CLOCK_CONFIG })
let channel: BroadcastChannel | null = null

function refreshConfig() {
  config.value = loadClockConfig()
}

function onStorage(event: StorageEvent) {
  if (event.key && event.key !== BROWSER_STORAGE_KEYS.userPreferences) return
  refreshConfig()
}

function onChannelMessage(event: MessageEvent<unknown>) {
  config.value = normalizeClockConfig(event.data)
}

onMounted(() => {
  refreshConfig()
  window.addEventListener('storage', onStorage)

  try {
    channel = new BroadcastChannel(CLOCK_CONFIG_CHANNEL)
    channel.addEventListener('message', onChannelMessage)
  } catch {
    channel = null
  }
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  channel?.removeEventListener('message', onChannelMessage)
  channel?.close()
  channel = null
})

const surfaceStyle = computed(() => ({
  background: config.value.bgColor,
}))
</script>

<template>
  <ProjectionBackground class="clock-projection">
    <div
      class="clock-projection__stage"
      :style="surfaceStyle"
    >
      <ClockPreview :config="config" />
    </div>
  </ProjectionBackground>
</template>

<style scoped lang="scss">
.clock-projection {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.clock-projection__stage {
  width: 100%;
  height: 100%;
}
</style>
