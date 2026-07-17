<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useMediaPlayer } from '../composables/useMediaPlayer'
import MediaProjectFab from './MediaProjectFab.vue'
import MediaStatusPreview from './MediaStatusPreview.vue'

const { t } = useI18n()
const router = useRouter()

const {
  hasSession,
  minimized,
  isProjecting,
  isPlaying,
  previewSnippet,
  previewReference,
  toggleProjection,
  clearProjection,
  togglePlay,
  maximize,
} = useMediaPlayer()

const visible = computed(() => hasSession.value && minimized.value)

async function onProject() {
  await toggleProjection()
}

function onClear() {
  clearProjection()
}

async function onExpand() {
  maximize()
  await router.push({ name: 'media' })
}

async function onToggleAudio() {
  await togglePlay()
}
</script>

<template>
  <div
    v-if="visible"
    class="media-chrome"
  >
    <MediaStatusPreview
      :snippet="previewSnippet"
      :reference="previewReference"
    />

    <div class="media-chrome__actions">
      <button
        type="button"
        class="media-chrome__icon-btn"
        :aria-label="isPlaying ? t('media.pause') : t('media.play')"
        :title="isPlaying ? t('media.pause') : t('media.play')"
        @click="onToggleAudio"
      >
        <i
          class="mdi"
          :class="isPlaying ? 'mdi-pause' : 'mdi-play'"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="media-chrome__icon-btn"
        :aria-label="t('media.maximize')"
        :title="t('media.maximize')"
        @click="onExpand"
      >
        <i
          class="mdi mdi-arrow-expand"
          aria-hidden="true"
        />
      </button>

      <MediaProjectFab
        :projecting="isProjecting"
        @project="onProject"
        @clear="onClear"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.media-chrome {
  position: fixed;
  right: 2rem;
  bottom: calc(var(--ds-dock-height, 5.5rem) + 1.25rem);
  z-index: 36;
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  pointer-events: none;
}

.media-chrome__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  pointer-events: auto;
}

.media-chrome__icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid color-mix(in srgb, #fff 18%, transparent);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--ds-color-surface-card) 88%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;
  transition: transform 160ms ease, background-color 160ms ease;

  .mdi {
    font-size: 1.25rem;
    line-height: 1;
  }

  &:hover {
    transform: scale(1.06);
    background: color-mix(in srgb, var(--ds-color-primary) 28%, transparent);
  }
}
</style>
