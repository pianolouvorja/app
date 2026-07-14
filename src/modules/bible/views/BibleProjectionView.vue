<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { ProjectionBackground } from '@design-system/index'

import {
  BIBLE_RUNTIME_CHANNEL,
  BIBLE_RUNTIME_STORAGE_KEY,
  DEFAULT_BIBLE_RUNTIME,
  normalizeBibleRuntime,
  readBibleRuntimeFromStorage,
  type BibleProjectionRuntime,
} from '../services/bible-runtime'

const runtime = ref<BibleProjectionRuntime>({ ...DEFAULT_BIBLE_RUNTIME })
let runtimeChannel: BroadcastChannel | null = null

function refreshRuntime() {
  runtime.value = readBibleRuntimeFromStorage()
}

function onStorage(event: StorageEvent) {
  if (event.key === BIBLE_RUNTIME_STORAGE_KEY) {
    refreshRuntime()
  }
}

function onRuntimeMessage(event: MessageEvent<unknown>) {
  runtime.value = normalizeBibleRuntime(event.data)
}

onMounted(() => {
  refreshRuntime()
  window.addEventListener('storage', onStorage)

  try {
    runtimeChannel = new BroadcastChannel(BIBLE_RUNTIME_CHANNEL)
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

const showContent = computed(
  () => runtime.value.active && Boolean(runtime.value.text || runtime.value.reference),
)

const contentKey = computed(
  () => `${runtime.value.text}|${runtime.value.reference}`,
)
</script>

<template>
  <ProjectionBackground class="bible-projection">
    <div class="bible-projection__stage">
      <Transition
        name="bible-fade"
        mode="out-in"
      >
        <div
          v-if="showContent"
          :key="contentKey"
          class="bible-projection__content"
        >
          <p
            v-if="runtime.text"
            class="bible-projection__text"
          >
            {{ runtime.text }}
          </p>
          <p
            v-if="runtime.reference"
            class="bible-projection__reference"
          >
            {{ runtime.reference }}
          </p>
        </div>
        <div
          v-else
          key="empty"
          class="bible-projection__empty"
        />
      </Transition>
    </div>
  </ProjectionBackground>
</template>

<style scoped lang="scss">
.bible-projection {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.bible-projection__stage {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: clamp(1.5rem, 6vmin, 4rem);
}

.bible-projection__content {
  display: flex;
  flex-direction: column;
  gap: 0.6em;
  width: 100%;
  max-width: 56rem;
}

.bible-projection__text {
  margin: 0;
  color: #fff;
  font-size: clamp(1.75rem, 5.2vmin, 3.75rem);
  font-weight: 500;
  line-height: 1.45;
  text-align: center;
  text-shadow: 0 1px 4px rgb(0 0 0 / 0.7);
  white-space: pre-wrap;
}

.bible-projection__reference {
  margin: 0;
  color: #fb8c00;
  font-size: clamp(1rem, 2.8vmin, 1.85rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: right;
  text-transform: uppercase;
}

.bible-projection__empty {
  width: 100%;
  height: 100%;
}

.bible-fade-enter-active,
.bible-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.bible-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.bible-fade-leave-to {
  opacity: 0;
}
</style>
