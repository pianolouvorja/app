<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  DEFAULT_LITURGY_WEB_RUNTIME,
  LITURGY_WEB_RUNTIME_CHANNEL,
  LITURGY_WEB_RUNTIME_STORAGE_KEY,
  normalizeLiturgyWebRuntime,
  readLiturgyWebRuntimeFromStorage,
  type LiturgyWebProjectionRuntime,
} from '../services/liturgy-web-runtime'

const runtime = ref<LiturgyWebProjectionRuntime>({
  ...DEFAULT_LITURGY_WEB_RUNTIME,
})
let runtimeChannel: BroadcastChannel | null = null

const showFrame = computed(
  () => runtime.value.active && Boolean(runtime.value.url),
)

const frameSrc = computed(() => {
  if (!showFrame.value) return ''
  const url = runtime.value.url
  if (runtime.value.kind !== 'youtube') return url

  // Garante controles + som no embed (mesmo se o runtime antigo veio sem params)
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('autoplay', '1')
    parsed.searchParams.set('controls', '1')
    parsed.searchParams.set('rel', '0')
    parsed.searchParams.set('fs', '1')
    parsed.searchParams.set('playsinline', '1')
    parsed.searchParams.set('modestbranding', '1')
    parsed.searchParams.delete('mute')
    parsed.searchParams.delete('controls')
    parsed.searchParams.set('controls', '1')
    return parsed.toString()
  } catch {
    return url
  }
})

function ensureReferrerMeta() {
  const existing = document.querySelector('meta[name="referrer"]')
  if (existing) {
    existing.setAttribute('content', 'strict-origin-when-cross-origin')
    return
  }
  const meta = document.createElement('meta')
  meta.name = 'referrer'
  meta.content = 'strict-origin-when-cross-origin'
  document.head.appendChild(meta)
}

function refreshRuntime() {
  runtime.value = readLiturgyWebRuntimeFromStorage()
}

function onStorage(event: StorageEvent) {
  if (event.key === LITURGY_WEB_RUNTIME_STORAGE_KEY) {
    refreshRuntime()
  }
}

function onRuntimeMessage(event: MessageEvent<unknown>) {
  runtime.value = normalizeLiturgyWebRuntime(event.data)
}

onMounted(() => {
  ensureReferrerMeta()
  refreshRuntime()
  window.addEventListener('storage', onStorage)

  try {
    runtimeChannel = new BroadcastChannel(LITURGY_WEB_RUNTIME_CHANNEL)
    runtimeChannel.addEventListener('message', onRuntimeMessage)
  } catch {
    runtimeChannel = null
  }
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  runtimeChannel?.removeEventListener('message', onRuntimeMessage)
  runtimeChannel?.close()
  runtimeChannel = null
})
</script>

<template>
  <div class="liturgy-web-projection">
    <iframe
      v-if="showFrame"
      :key="frameSrc"
      class="liturgy-web-projection__frame"
      :src="frameSrc"
      :title="runtime.title || 'Projeção'"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      loading="eager"
    />
    <div
      v-else
      class="liturgy-web-projection__empty"
    />
  </div>
</template>

<style scoped lang="scss">
.liturgy-web-projection {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.liturgy-web-projection__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #000;
}

.liturgy-web-projection__empty {
  width: 100%;
  height: 100%;
  background: #000;
}
</style>
