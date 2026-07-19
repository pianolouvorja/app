<script setup lang="ts">
import MonitorTargetSelect from '@shared/components/MonitorTargetSelect.vue'
import MusicTrackActions from '@shared/components/MusicTrackActions.vue'
import type { AlbumTrack } from '../types/albums'

defineProps<{
  track: AlbumTrack
  collectionName?: string
  artworkUrl?: string | null
  busy?: boolean
}>()

const emit = defineEmits<{
  play: []
  sung: []
  instrumental: []
  slides: []
  lyric: []
}>()
</script>

<template>
  <div
    class="album-track-row"
    role="button"
    tabindex="0"
    @click="emit('play')"
    @keydown.enter.prevent="emit('play')"
    @keydown.space.prevent="emit('play')"
  >
    <span class="album-track-row__leading">
      <span class="album-track-row__number">
        {{ track.track ?? '—' }}
      </span>
      <i
        class="ti ti-player-play album-track-row__play"
        aria-hidden="true"
      />
    </span>

    <span class="album-track-row__info">
      <span
        class="album-track-row__artwork"
        aria-hidden="true"
      >
        <img
          v-if="artworkUrl"
          :src="artworkUrl"
          alt=""
        >
        <i
          v-else
          class="ti ti-music"
        />
      </span>
      <span class="album-track-row__text">
        <span class="album-track-row__title">
          {{ track.name }}
        </span>
        <span
          v-if="collectionName"
          class="album-track-row__collection"
        >
          {{ collectionName }}
        </span>
      </span>
    </span>

    <span class="album-track-row__duration">
      {{ track.durationLabel }}
    </span>

    <div
      class="album-track-row__actions"
      @click.stop
    >
      <MonitorTargetSelect
        dense
        persist
        :disabled="busy"
      />
      <MusicTrackActions
        :has-instrumental="track.hasInstrumental"
        :busy="busy"
        variant="contained"
        @sung="emit('sung')"
        @instrumental="emit('instrumental')"
        @slides="emit('slides')"
        @lyric="emit('lyric')"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.album-track-row {
  width: 100%;
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr) 7rem auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 5rem;
  margin-bottom: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-lg, 16px);
  background: color-mix(
    in srgb,
    var(--ds-color-surface-elevated) var(--ds-glass-fill, 72%),
    transparent
  );
  color: var(--ds-color-on-surface);
  text-align: left;
  cursor: pointer;
  backdrop-filter: blur(var(--ds-blur-active, 16px)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--ds-blur-active, 16px)) saturate(140%);
  transition:
    background-color var(--ds-motion-duration, 280ms) ease,
    border-color var(--ds-motion-duration, 280ms) ease,
    transform 160ms ease;

  &:hover {
    border-color: color-mix(
      in srgb,
      var(--ds-color-on-surface) 15%,
      transparent
    );
    background: color-mix(
      in srgb,
      var(--ds-color-surface-container-high) 82%,
      transparent
    );
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.album-track-row__leading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-track-row__number {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ds-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
}

.album-track-row__play {
  display: none;
  color: var(--ds-color-primary);
  font-size: 1.5rem;
}

.album-track-row:hover .album-track-row__number,
.album-track-row:focus-within .album-track-row__number {
  display: none;
}

.album-track-row:hover .album-track-row__play,
.album-track-row:focus-within .album-track-row__play {
  display: inline-block;
}

.album-track-row__info {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.album-track-row__artwork {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-sm, 8px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-color-surface-container);
  color: var(--ds-color-secondary);
  overflow: hidden;

  .ti {
    font-size: 1.35rem;
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
}

.album-track-row__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.album-track-row__title {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-track-row__collection {
  color: var(--ds-color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-track-row__duration {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ds-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.album-track-row__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-self: end;
  opacity: 1;
}

@media (max-width: 800px) {
  .album-track-row {
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    grid-template-areas:
      'num title duration'
      'actions actions actions';
  }

  .album-track-row__leading {
    grid-area: num;
  }

  .album-track-row__info {
    grid-area: title;
  }

  .album-track-row__duration {
    grid-area: duration;
  }

  .album-track-row__actions {
    grid-area: actions;
    justify-self: start;
  }
}
</style>
