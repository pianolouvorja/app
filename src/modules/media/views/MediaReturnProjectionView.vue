<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  MEDIA_RUNTIME_CHANNEL,
  MEDIA_RUNTIME_STORAGE_KEY,
  normalizeMediaRuntime,
  readMediaRuntimeFromStorage,
} from '../services/media-runtime'
import { stripHtmlBreaks } from '../services/media-slides'
import { readEffectiveStageSettings, subscribeStageSettings } from '../../settings/services/stage-settings-runtime'
import type { StageSettings } from '../../settings/types/stage-settings'
import { resolveBackgroundImage } from '../../settings/types/stage-settings'
import type { MediaProjectionRuntime } from '../types/media'
import { DEFAULT_MEDIA_PROJECTION } from '../types/media'

const { t } = useI18n()
const runtime = ref<MediaProjectionRuntime>({ ...DEFAULT_MEDIA_PROJECTION })

const stage = ref<StageSettings>(readEffectiveStageSettings('hymns'))
let unsubStage: (() => void) | null = null

let channel: BroadcastChannel | null = null

const lyric = computed(() => stripHtmlBreaks(runtime.value.lyric))
const nextLyric = computed(() => stripHtmlBreaks(runtime.value.nextLyric))
const showTitle = computed(
  () => runtime.value.isCover || (!lyric.value && Boolean(runtime.value.title)),
)
const showNext = computed(
  () => Boolean(nextLyric.value) || runtime.value.nextIsCover,
)
const nextLabel = computed(() => {
  if (runtime.value.nextIsCover && !nextLyric.value) return runtime.value.title
  return nextLyric.value
})

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

  unsubStage = subscribeStageSettings(() => {
    stage.value = readEffectiveStageSettings('hymns')
  })

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
  unsubStage?.()
  channel?.close()
  channel = null
})

const stageStyle = computed(() => ({
  backgroundColor: stage.value.backgroundColor,
}))

const bgImage = computed(
  () => resolveBackgroundImage(stage.value.backgroundImage) ?? runtime.value.imageUrl,
)

const barColor = computed(() => stage.value.footerRefColor || '#FCCE02')
</script>

<template>
  <div
    class="media-return"
    :style="stageStyle"
  >
    <div
      v-if="bgImage"
      class="media-return__bg"
      :style="{ backgroundImage: `url(${bgImage})` }"
      aria-hidden="true"
    />

    <div
      v-if="runtime.active"
      class="media-return__body"
    >
      <div class="media-return__current">
        <p
          v-if="showTitle"
          class="media-return__title"
          :class="{ 'media-return__title--cover': runtime.isCover }"
        >
          {{ runtime.title }}
        </p>
        <p
          v-if="lyric && !runtime.isCover"
          class="media-return__lyric"
        >
          {{ lyric }}
        </p>
      </div>

      <div
        class="media-return__bar"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="Math.round(runtime.slideProgressRatio * 100)"
      >
        <div
          class="media-return__bar-fill"
          :style="{
            backgroundColor: barColor,
            transform: `scaleX(${runtime.slideProgressRatio})`,
          }"
        />
      </div>

      <div
        v-if="showNext"
        class="media-return__next"
      >
        <span class="media-return__next-label">{{ t('media.returnNext') }}</span>
        <p
          class="media-return__next-lyric"
          :class="{ 'media-return__next-lyric--cover': runtime.nextIsCover }"
        >
          {{ nextLabel }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.media-return {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  color: #fff;
  container-type: size;
}

.media-return__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.72;
}

.media-return__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 4vw 4vw 3vw;
}

.media-return__current {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  text-align: center;
}

.media-return__title,
.media-return__lyric {
  margin: 0;
  max-width: 90vw;
  padding: 2vmin 3.5vmin;
  border: clamp(2px, 0.2vmin, 4px) solid rgb(255 255 255 / 0.85);
  border-radius: clamp(14px, 2.4vmin, 32px) 0
    clamp(14px, 2.4vmin, 32px) 0;
  background: rgb(24 24 24 / 0.55);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #fff;
  font-size: clamp(1.5rem, 6.4vmin, 6.5rem);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.03em;
  text-align: center;
  text-transform: uppercase;
  white-space: pre-line;
}

.media-return__title--cover {
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

.media-return__bar {
  flex-shrink: 0;
  width: 100%;
  height: clamp(8px, 1.2vmin, 14px);
  margin: 2.4vmin 0 1.8vmin;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
}

.media-return__bar-fill {
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transition: transform 80ms linear;
}

.media-return__next {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  min-height: 0;
  max-height: 28vh;
}

.media-return__next-label {
  color: #f6c32a;
  font-size: clamp(0.7rem, 1.8vmin, 1.1rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.media-return__next-lyric {
  margin: 0;
  max-width: 86vw;
  color: rgb(255 255 255 / 0.82);
  font-size: clamp(1rem, 3.4vmin, 2.8rem);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.02em;
  text-align: center;
  text-transform: uppercase;
  white-space: pre-line;
}

.media-return__next-lyric--cover {
  color: #f6c32a;
  font-weight: 800;
}
</style>
