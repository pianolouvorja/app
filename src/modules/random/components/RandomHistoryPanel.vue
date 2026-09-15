<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { RandomAudioSource } from '../types/random'

const props = defineProps<{
  items: readonly string[]
  totalCount: number
  audioSource: RandomAudioSource
  customAudioFiles: readonly string[]
  customAudioFile: string | null
  audioVolume: number
  audioMuted: boolean
  audioPlaying: boolean
}>()

const emit = defineEmits<{
  undo: [index: number]
  clear: []
  'use-default-audio': []
  'use-custom-audio': [fileName: string]
  'choose-audio': []
  'remove-custom-audio': [fileName: string]
  'toggle-audio': []
  'toggle-mute': []
  'update:audio-volume': [volume: number]
}>()

const { t } = useI18n()

const volumePercent = computed(() => Math.round(props.audioVolume * 100))

function onVolumeInput(event: Event) {
  const target = event.target as HTMLInputElement
  const next = Number(target.value)
  if (!Number.isFinite(next)) return
  emit('update:audio-volume', Math.min(1, Math.max(0, next / 100)))
}
</script>

<template>
  <aside class="random-history">
    <header class="random-history__head">
      <h2 class="random-history__title">
        {{ t('random.drawn') }}
      </h2>
      <span class="random-history__badge">
        {{ totalCount }}
      </span>
    </header>

    <div class="random-history__list-wrap">
      <div
        v-if="items.length === 0"
        class="random-history__empty"
      >
        <i
          class="ti ti-history"
          aria-hidden="true"
        />
        <p>{{ t('random.emptyHistory') }}</p>
      </div>
      <ul
        v-else
        class="random-history__list"
      >
        <li
          v-for="(name, index) in items"
          :key="`${name}-${index}`"
          class="random-history__item"
        >
          <span class="random-history__rank">
            {{ totalCount - index }}
          </span>
          <span class="random-history__name">{{ name }}</span>
          <button
            type="button"
            class="random-history__undo"
            :aria-label="t('random.undoDrawn')"
            @click="emit('undo', totalCount - 1 - index)"
          >
            <i
              class="ti ti-arrow-back-up"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </div>

    <button
      type="button"
      class="random-history__clear"
      @click="emit('clear')"
    >
      {{ t('random.clearHistory') }}
    </button>

    <div
      class="random-history__audio"
      role="group"
      :aria-label="t('random.audioSection')"
    >
      <button
        type="button"
        class="random-history__audio-btn"
        :class="{ 'random-history__audio-btn--active': audioSource === 'default' }"
        @click="emit('use-default-audio')"
      >
        <i
          class="ti ti-music"
          aria-hidden="true"
        />
        <span>{{ t('random.defaultSystemAudio') }}</span>
      </button>

      <div
        v-for="fileName in customAudioFiles"
        :key="fileName"
        class="random-history__audio-row"
      >
        <button
          type="button"
          class="random-history__audio-btn"
          :class="{
            'random-history__audio-btn--active':
              audioSource === 'custom' && customAudioFile === fileName,
          }"
          :title="fileName"
          @click="emit('use-custom-audio', fileName)"
        >
          <i
            class="ti ti-file-music"
            aria-hidden="true"
          />
          <span>{{ fileName }}</span>
        </button>
        <button
          type="button"
          class="random-history__audio-delete"
          :aria-label="t('random.deleteAudio')"
          :title="t('random.deleteAudio')"
          @click.stop="emit('remove-custom-audio', fileName)"
        >
          <i
            class="ti ti-trash"
            aria-hidden="true"
          />
        </button>
      </div>

      <button
        type="button"
        class="random-history__audio-btn"
        @click="emit('choose-audio')"
      >
        <i
          class="ti ti-folder-music"
          aria-hidden="true"
        />
        <span>{{ t('random.chooseAudio') }}</span>
      </button>

      <div class="random-history__player">
        <button
          type="button"
          class="random-history__player-btn"
          :class="{ 'random-history__player-btn--active': audioPlaying }"
          :aria-label="audioPlaying ? t('random.pauseAudio') : t('random.playAudio')"
          :aria-pressed="audioPlaying"
          @click="emit('toggle-audio')"
        >
          <i
            class="ti"
            :class="audioPlaying ? 'ti-player-pause' : 'ti-player-play'"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="random-history__player-btn"
          :class="{ 'random-history__player-btn--muted': audioMuted }"
          :aria-label="audioMuted ? t('random.unmuteAudio') : t('random.muteAudio')"
          :aria-pressed="audioMuted"
          @click="emit('toggle-mute')"
        >
          <i
            class="ti"
            :class="audioMuted || audioVolume === 0 ? 'ti-volume-off' : 'ti-volume'"
            aria-hidden="true"
          />
        </button>
        <label class="random-history__volume">
          <span class="sr-only">{{ t('random.audioVolume') }}</span>
          <input
            type="range"
            class="random-history__volume-slider"
            min="0"
            max="100"
            step="1"
            :value="volumePercent"
            :aria-valuetext="`${volumePercent}%`"
            @input="onVolumeInput"
          >
        </label>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.random-history {
  display: flex;
  width: 18rem;
  max-width: 100%;
  max-height: none;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  border-radius: 1.5rem 0 1.5rem 0;
  background: color-mix(in srgb, var(--ds-color-surface-elevated) 72%, transparent);
  backdrop-filter: blur(16px);
  box-sizing: border-box;
}

.random-history__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.random-history__title {
  margin: 0;
  color: var(--ds-color-secondary, #78d6d2);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.random-history__badge {
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 20%, transparent);
  color: var(--ds-color-secondary, #78d6d2);
  font-size: 0.6875rem;
  font-weight: 600;
}

.random-history__list-wrap {
  flex: 0 1 auto;
  min-height: 0;
  max-height: 15.5rem;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);
}

.random-history__list {
  height: 100%;
  max-height: 15.5rem;
  margin: 0;
  padding: 0.25rem 0.2rem;
  overflow-y: auto;
  list-style: none;
}

.random-history__item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  padding: 0.28rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 20%, transparent);
  border-radius: 0.4rem 0 0.4rem 0;
  background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 10%, transparent);
}

.random-history__rank {
  display: inline-flex;
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ds-color-secondary, #78d6d2);
  color: var(--ds-color-on-secondary, #003736);
  font-size: 0.5625rem;
  font-weight: 700;
}

.random-history__name {
  flex: 1;
  min-width: 0;
  color: var(--ds-color-secondary, #78d6d2);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.random-history__undo {
  display: inline-flex;
  border: 0;
  background: transparent;
  color: var(--ds-color-error, #ffb4ab);
  cursor: pointer;
  opacity: 0.55;

  .random-history__item:hover & {
    opacity: 1;
  }

  .ti {
    font-size: 0.85rem;
  }
}

.random-history__empty {
  display: flex;
  height: 100%;
  min-height: 6rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  opacity: 0.4;
  color: var(--ds-color-on-surface-variant);
  text-align: center;

  .ti {
    font-size: 1.5rem;
  }

  p {
    margin: 0;
    font-size: 0.75rem;
  }
}

.random-history__clear {
  margin-top: 0.65rem;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: color 160ms ease;

  &:hover {
    color: var(--ds-color-error, #ffb4ab);
  }
}

.random-history__audio {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
}

.random-history__audio-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  border-radius: 0.5rem 0 0.5rem 0;
  background: color-mix(in srgb, var(--ds-color-on-surface) 4%, transparent);
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: left;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;

  .ti {
    flex-shrink: 0;
    font-size: 1rem;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: var(--ds-color-on-surface);
    border-color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 35%, transparent);
  }

  &--active {
    border-color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 45%, transparent);
    background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 14%, transparent);
    color: var(--ds-color-secondary, #78d6d2);
  }
}


.random-history__audio-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.random-history__audio-row .random-history__audio-btn {
  flex: 1;
  min-width: 0;
}

.random-history__audio-delete {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--ds-color-error, #ffb4ab) 28%, transparent);
  border-radius: 0.45rem 0 0.45rem 0;
  background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 10%, transparent);
  color: var(--ds-color-error, #ffb4ab);
  cursor: pointer;
  opacity: 0.75;
  transition:
    opacity 160ms ease,
    background 160ms ease;

  .ti {
    font-size: 0.95rem;
  }

  &:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 18%, transparent);
  }
}

.random-history__player {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
}

.random-history__player-btn {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  border-radius: 0.45rem 0 0.45rem 0;
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    opacity 160ms ease;

  .ti {
    font-size: 1rem;
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 40%, transparent);
    color: var(--ds-color-secondary, #78d6d2);
  }

  &:disabled {
    cursor: default;
    opacity: 0.35;
  }

  &--active {
    border-color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 50%, transparent);
    background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 18%, transparent);
    color: var(--ds-color-secondary, #78d6d2);
  }

  &--muted {
    color: var(--ds-color-error, #ffb4ab);
  }
}

.random-history__volume {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.random-history__volume-slider {
  width: 100%;
  height: 0.35rem;
  appearance: none;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-on-surface) 16%, transparent);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 50%;
    background: var(--ds-color-secondary, #78d6d2);
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 0.85rem;
    height: 0.85rem;
    border: 0;
    border-radius: 50%;
    background: var(--ds-color-secondary, #78d6d2);
    cursor: pointer;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1100px) {
  .random-history {
    width: 100%;
    max-height: none;
  }
}
</style>
