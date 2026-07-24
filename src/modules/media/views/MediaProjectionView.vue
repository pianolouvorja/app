<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  MEDIA_RUNTIME_CHANNEL,
  MEDIA_RUNTIME_STORAGE_KEY,
  normalizeMediaRuntime,
  readMediaRuntimeFromStorage,
} from '../services/media-runtime'
import { stripHtmlBreaks } from '../services/media-slides'
import type { MediaProjectionRuntime } from '../types/media'
import { DEFAULT_MEDIA_PROJECTION } from '../types/media'

const runtime = ref<MediaProjectionRuntime>({ ...DEFAULT_MEDIA_PROJECTION })

let channel: BroadcastChannel | null = null

const lyric = computed(() => stripHtmlBreaks(runtime.value.lyric))
const showTitle = computed(
  () => runtime.value.isCover || (!lyric.value && Boolean(runtime.value.title)),
)

function applyRuntime(raw: unknown) {
  runtime.value = normalizeMediaRuntime(raw)
}

function onStorage(event: StorageEvent) {
  if (event.key !== MEDIA_RUNTIME_STORAGE_KEY || !event.newValue) return
  try {
    applyRuntime(JSON.parse(event.newValue) as unknown)
  } catch {
    // ignore
  }
}

onMounted(() => {
  applyRuntime(readMediaRuntimeFromStorage())

  try {
    channel = new BroadcastChannel(MEDIA_RUNTIME_CHANNEL)
    channel.onmessage = (event) => {
      applyRuntime(event.data)
    }
  } catch {
    // BroadcastChannel indisponível
  }

  window.addEventListener('storage', onStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  channel?.close()
  channel = null
})
</script>

<template>
  <div class="media-projection">
    <div
      v-if="runtime.imageUrl"
      class="media-projection__bg"
      :style="{ backgroundImage: `url(${runtime.imageUrl})` }"
      aria-hidden="true"
    />

    <div
      v-if="runtime.active"
      class="media-projection__content"
    >
      <p
        v-if="showTitle"
        class="media-projection__title"
        :class="{ 'media-projection__title--cover': runtime.isCover }"
      >
        {{ runtime.title }}
      </p>
      <p
        v-if="lyric && !runtime.isCover"
        class="media-projection__lyric"
      >
        {{ lyric }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.media-projection {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  color: #fff;
}

.media-projection__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.media-projection__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 4vw;
  text-align: center;
}

.media-projection__title,
.media-projection__lyric {
  margin: 0;
  max-width: 86vw;
  padding: 2.5vmin 4vmin;
  border: clamp(2px, 0.2vmin, 4px) solid rgb(255 255 255 / 0.85);
  border-radius: clamp(14px, 2.4vmin, 32px) 0
    clamp(14px, 2.4vmin, 32px) 0;
  background: rgb(24 24 24 / 0.55);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #fff;
  font-size: clamp(1.75rem, 7.5vmin, 8rem);
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.03em;
  text-align: center;
  text-transform: uppercase;
  white-space: pre-line;
}

.media-projection__title--cover {
  border: none;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  color: #f6c32a;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.01em;
  text-shadow: 0 10px 30px rgb(0 0 0 / 0.9), 0 2px 6px rgb(0 0 0 / 0.7);
}
</style>
