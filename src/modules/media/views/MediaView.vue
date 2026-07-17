<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import MediaCloseDialog from '../components/MediaCloseDialog.vue'
import MediaPlayerPill from '../components/MediaPlayerPill.vue'
import MediaSlideStage from '../components/MediaSlideStage.vue'
import { useMediaPlayer } from '../composables/useMediaPlayer'
import { stripHtmlBreaks } from '../services/media-slides'
import type { MediaPlaybackMode } from '../types/media'

const { t } = useI18n()
const router = useRouter()
const stageRoot = ref<HTMLElement | null>(null)

const {
  session,
  hasSession,
  lastErrorKey,
  isPlaying,
  hasAudio,
  hasInstrumental,
  playbackMode,
  isProjecting,
  showPlaylist,
  closeConfirmOpen,
  slideIndex,
  slideCount,
  currentSlide,
  resolvedSlideImageUrl,
  currentTimeLabel,
  durationLabel,
  progressRatio,
  slideProgressRatio,
  volume,
  maximize,
  minimize,
  togglePlay,
  previousSlide,
  nextSlide,
  goToSlide,
  seekRatio,
  setVolume,
  switchMode,
  toggleProjection,
  togglePlaylist,
  setPlaylistOpen,
  requestClose,
  cancelClose,
  close,
  clearError,
  syncProjectionFlag,
} = useMediaPlayer()

const stageLyric = computed(() => currentSlide.value?.lyric ?? '')
const stageTitle = computed(() => session.value?.title ?? '')
const stageImage = computed(
  () => resolvedSlideImageUrl.value ?? currentSlide.value?.imageUrl ?? null,
)
const isCover = computed(() => Boolean(currentSlide.value?.isCover))

const playlist = computed(() =>
  (session.value?.slides ?? []).map((slide, index) => ({
    index,
    label: slide.isCover
      ? slide.lyric || t('media.coverSlide')
      : stripHtmlBreaks(slide.lyric).replace(/\s+/g, ' ').slice(0, 90) ||
        t('media.slideOf', { current: index + 1, total: slideCount.value }),
    isCover: slide.isCover,
  })),
)

onMounted(() => {
  document.documentElement.classList.add('media-player-open')
  maximize()
  setPlaylistOpen(true)
  syncProjectionFlag()
})

onUnmounted(() => {
  document.documentElement.classList.remove('media-player-open')
})

/** Volta para a rota de origem (Liturgia, Álbuns, etc.), sem forçar Álbuns. */
function leaveMediaRoute() {
  if (window.history.length > 1) {
    void router.back()
    return
  }
  void router.replace({ name: 'albums' })
}

watch(hasSession, (active) => {
  if (!active) {
    leaveMediaRoute()
  }
})

async function onMinimize() {
  minimize()
  leaveMediaRoute()
}

function onConfirmClose() {
  close()
}

async function onMode(mode: MediaPlaybackMode) {
  await switchMode(mode)
}

async function onToggleFullscreen() {
  const el = stageRoot.value
  if (!el) return
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }
  await el.requestFullscreen()
}
</script>

<template>
  <section
    ref="stageRoot"
    class="media-window"
  >
    <header class="media-window__toolbar">
      <button
        type="button"
        class="media-window__tool-btn"
        :aria-label="t('media.minimize')"
        :title="t('media.minimize')"
        @click="onMinimize"
      >
        <i
          class="mdi mdi-minus"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        class="media-window__tool-btn"
        :aria-label="t('media.close')"
        :title="t('media.close')"
        @click="requestClose"
      >
        <i
          class="mdi mdi-close"
          aria-hidden="true"
        />
      </button>
    </header>

    <div
      v-if="lastErrorKey"
      class="media-window__alert"
      role="alert"
    >
      <p>{{ t(lastErrorKey) }}</p>
      <button
        type="button"
        @click="clearError"
      >
        {{ t('media.dismiss') }}
      </button>
    </div>

    <div
      v-else-if="!hasSession"
      class="media-window__empty"
    >
      {{ t('media.empty') }}
    </div>

    <div
      v-else
      class="media-window__body"
      :class="{ 'media-window__body--playlist': showPlaylist }"
    >
      <div class="media-window__stage">
        <MediaSlideStage
          :lyric="stageLyric"
          :title="stageTitle"
          :image-url="stageImage"
          :is-cover="isCover"
        />
      </div>

      <aside
        v-if="showPlaylist"
        class="media-window__playlist"
      >
        <h2 class="media-window__playlist-title">
          {{ t('media.playlist') }}
        </h2>
        <ul class="media-window__playlist-list">
          <li
            v-for="item in playlist"
            :key="item.index"
          >
            <button
              type="button"
              class="media-window__playlist-item"
              :class="{
                'media-window__playlist-item--active': item.index === slideIndex,
              }"
              :style="
                item.index === slideIndex
                  ? { '--slide-progress': slideProgressRatio }
                  : undefined
              "
              @click="goToSlide(item.index)"
            >
              <span class="media-window__playlist-index">{{ item.index + 1 }}</span>
              <span class="media-window__playlist-label">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <div class="media-window__pill-wrap">
        <MediaPlayerPill
          :title="session?.title || t('media.title')"
          :subtitle="session?.subtitle || ''"
          :is-playing="isPlaying"
          :has-audio="hasAudio"
          :has-instrumental="hasInstrumental"
          :mode="playbackMode"
          :current-time-label="currentTimeLabel"
          :duration-label="durationLabel"
          :progress-ratio="progressRatio"
          :volume="volume"
          :projecting="isProjecting"
          :playlist-open="showPlaylist"
          @toggle-play="togglePlay"
          @previous-slide="previousSlide"
          @next-slide="nextSlide"
          @seek-ratio="seekRatio"
          @update:volume="setVolume"
          @update:mode="onMode"
          @toggle-projection="toggleProjection"
          @toggle-playlist="togglePlaylist"
          @toggle-fullscreen="onToggleFullscreen"
        />
      </div>
    </div>

    <MediaCloseDialog
      :open="closeConfirmOpen"
      @cancel="cancelClose"
      @confirm="onConfirmClose"
    />
  </section>
</template>

<style scoped lang="scss">
.media-window {
  position: relative;
  box-sizing: border-box;
  height: calc(100vh - 5rem - var(--ds-dock-height) - 1.75rem);
  max-height: calc(100vh - 5rem - var(--ds-dock-height) - 1.75rem);
  margin: 0.75rem var(--ds-spacing-page, 2rem) 1rem;
  border-radius: var(--ds-radius-lg, 1rem);
  overflow: hidden;
  background: #000;
  border: 1px solid rgb(255 255 255 / 0.08);
}

:global(html.media-player-open),
:global(html.media-player-open body) {
  overflow: hidden;
}

.media-window__toolbar {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 30;
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgb(30 30 30 / 0.75);
  border: 1px solid rgb(255 255 255 / 0.12);
}

.media-window__tool-btn {
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgb(255 255 255 / 0.12);
  }
}

.media-window__body {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
}

.media-window__body--playlist {
  grid-template-columns: minmax(0, 1fr) 18rem;
}

.media-window__stage {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.media-window__playlist {
  min-height: 0;
  overflow: auto;
  background: rgb(12 12 12 / 0.92);
  border-left: 1px solid rgb(255 255 255 / 0.08);
  padding: 1rem 0.75rem;
}

.media-window__playlist-title {
  margin: 0 0 0.75rem;
  padding: 0 0.4rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
}

.media-window__playlist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.media-window__playlist-item {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border: none;
  border-radius: 0.65rem;
  padding: 0.55rem 0.5rem;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: inherit;
    background: color-mix(
      in srgb,
      var(--ds-color-primary, #2196f3) 34%,
      transparent
    );
    transform: scaleX(var(--slide-progress, 0));
    transform-origin: left center;
    transition: transform 180ms linear;
    pointer-events: none;
  }

  &:hover {
    background: rgb(255 255 255 / 0.06);
  }

  &--active {
    background: rgb(255 255 255 / 0.055);
  }
}

.media-window__playlist-index {
  flex-shrink: 0;
  width: 1.5rem;
  font-size: 0.75rem;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
}

.media-window__playlist-label {
  font-size: 0.82rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.media-window__pill-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 1.75rem;
  z-index: 25;
  display: flex;
  justify-content: center;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.media-window__empty,
.media-window__alert {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgb(255 255 255 / 0.7);
  padding: 1.5rem;
}

.media-window__alert button {
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

@media (max-width: 900px) {
  .media-window__body--playlist {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) 12rem;
  }

  .media-window__playlist {
    border-left: none;
    border-top: 1px solid rgb(255 255 255 / 0.08);
  }
}
</style>
