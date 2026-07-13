<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { LibraryAlbum } from '../types/library'

const props = defineProps<{
  album: LibraryAlbum
}>()

const emit = defineEmits<{
  download: []
  cancel: []
  remove: []
}>()

const { t } = useI18n()

const progressLabel = computed(() =>
  t(props.album.progressText || 'sync.progress.downloading'),
)

const ariaAction = computed(() => {
  if (props.album.status === 'downloaded') return t('sync.remove')
  if (props.album.status === 'downloading') return t('sync.cancel')
  if (props.album.status === 'error') return t('sync.retry')
  return t('sync.downloadOffline')
})

function onPrimaryAction() {
  if (props.album.status === 'downloaded') {
    emit('remove')
    return
  }
  if (props.album.status === 'downloading') {
    emit('cancel')
    return
  }
  emit('download')
}
</script>

<template>
  <article
    class="library-cover-card"
    :class="{
      'library-cover-card--downloaded': album.status === 'downloaded',
      'library-cover-card--busy': album.status === 'downloading',
    }"
  >
    <div class="library-cover-card__frame">
      <img
        v-if="album.coverUrl"
        :src="album.coverUrl"
        :alt="album.name"
        class="library-cover-card__image"
      >
      <div
        v-else
        class="library-cover-card__fallback"
        aria-hidden="true"
      >
        <i class="mdi mdi-album" />
      </div>

      <div
        v-if="album.status === 'downloaded'"
        class="library-cover-card__check"
        :aria-label="t('sync.downloaded')"
      >
        <i
          class="mdi mdi-check"
          aria-hidden="true"
        />
      </div>

      <div
        v-if="album.status === 'downloading'"
        class="library-cover-card__progress"
      >
        <span class="library-cover-card__progress-value">{{ album.progress }}%</span>
        <span class="library-cover-card__progress-label">{{ progressLabel }}</span>
        <div
          class="library-cover-card__track"
          aria-hidden="true"
        >
          <div
            class="library-cover-card__fill"
            :style="{ width: `${album.progress}%` }"
          />
        </div>
      </div>

      <div class="library-cover-card__overlay">
        <button
          type="button"
          class="library-cover-card__fab"
          :class="{
            'library-cover-card__fab--danger':
              album.status === 'downloaded' || album.status === 'downloading',
            'library-cover-card__fab--retry': album.status === 'error',
          }"
          :aria-label="ariaAction"
          @click="onPrimaryAction"
        >
          <i
            class="mdi"
            :class="{
              'mdi-download': album.status === 'idle',
              'mdi-delete': album.status === 'downloaded',
              'mdi-close': album.status === 'downloading',
              'mdi-refresh': album.status === 'error',
            }"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <h4 class="library-cover-card__name">
      {{ album.name }}
    </h4>
    <p
      v-if="album.subtitle"
      class="library-cover-card__subtitle"
    >
      {{ album.subtitle }}
    </p>
  </article>
</template>

<style scoped lang="scss">
.library-cover-card {
  min-width: 0;
  cursor: default;
}

.library-cover-card__frame {
  position: relative;
  aspect-ratio: 1;
  margin-bottom: 1rem;
  overflow: hidden;
  border-radius: 1rem;
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 70%);
  transition:
    transform 500ms cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 300ms ease;

  .library-cover-card:hover & {
    transform: scale(1.03) translateY(-0.5rem);
  }
}

.library-cover-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-cover-card__fallback {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: var(--ds-color-surface-container-high, #2a2a2a);
  color: var(--ds-color-primary);

  .mdi {
    font-size: 2.5rem;
    line-height: 1;
  }
}

.library-cover-card__check {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  display: flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ds-color-secondary, #78d6d2);
  color: var(--ds-color-on-secondary, #003736);
  box-shadow: 0 8px 16px rgb(0 0 0 / 35%);

  .mdi {
    font-size: 1.25rem;
    line-height: 1;
    font-weight: 700;
  }
}

.library-cover-card__progress {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 1rem;
  background: rgb(0 0 0 / 55%);
  color: #fff;
}

.library-cover-card__progress-value {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.library-cover-card__progress-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  opacity: 0.85;
}

.library-cover-card__track {
  width: 70%;
  height: 4px;
  margin-top: 0.35rem;
  overflow: hidden;
  border-radius: 9999px;
  background: rgb(255 255 255 / 20%);
}

.library-cover-card__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--ds-color-primary);
  transition: width 200ms ease;
}

.library-cover-card__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 40%);
  opacity: 0;
  transition: opacity 200ms ease;

  .library-cover-card:hover & {
    opacity: 1;
  }
}

.library-cover-card__fab {
  display: flex;
  width: 3.5rem;
  height: 3.5rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary, #003258);
  cursor: pointer;
  box-shadow: 0 16px 32px rgb(0 0 0 / 40%);
  transform: scale(0.75);
  transition:
    transform 200ms ease,
    opacity 200ms ease;

  .library-cover-card:hover & {
    transform: scale(1);
  }

  .mdi {
    font-size: 1.75rem;
    line-height: 1;
  }

  &--danger {
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 80%, transparent);
    color: #fff;
  }

  &--retry {
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 85%, transparent);
    color: #fff;
  }
}

.library-cover-card--busy .library-cover-card__overlay {
  z-index: 3;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0.75rem;
  background: transparent;
  opacity: 0;
  pointer-events: none;

  .library-cover-card:hover & {
    opacity: 1;
    pointer-events: auto;
  }
}

.library-cover-card--busy .library-cover-card__fab {
  width: 2.25rem;
  height: 2.25rem;
  transform: scale(1);
  background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 80%, transparent);
  color: #fff;

  .mdi {
    font-size: 1.125rem;
  }
}

.library-cover-card__name {
  margin: 0;
  overflow: hidden;
  color: var(--ds-color-on-surface);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-cover-card__subtitle {
  margin: 0.15rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}
</style>
