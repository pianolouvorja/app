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

const subtitle = computed(() => {
  if (props.album.status === 'downloading') {
    return t(props.album.progressText || 'sync.progress.downloading')
  }

  if (props.album.isHymnal && props.album.songCount != null) {
    const key =
      props.album.id === 'hymnal_1996'
        ? 'sync.hymnal.edition1996Subtitle'
        : 'sync.hymnal.officialSubtitle'
    return t(key, { count: props.album.songCount })
  }

  return props.album.subtitle
})

const coverIcon = computed(() => {
  if (props.album.id === 'hymnal_1996') return 'mdi-history'
  if (props.album.isHymnal) return 'mdi-book-open-page-variant'
  return 'mdi-album'
})
</script>

<template>
  <div class="library-album-row">
    <div class="library-album-row__main">
      <div class="library-album-row__cover">
        <img
          v-if="album.coverUrl"
          :src="album.coverUrl"
          :alt="album.name"
          class="library-album-row__image"
        >
        <i
          v-else
          class="mdi library-album-row__fallback-icon"
          :class="coverIcon"
          aria-hidden="true"
        />
      </div>

      <div class="library-album-row__text">
        <h4 class="library-album-row__name">
          {{ album.name }}
        </h4>

        <template v-if="album.status === 'downloading'">
          <div class="library-album-row__progress-meta">
            <span>{{ subtitle }}</span>
            <span>{{ album.progress }}%</span>
          </div>
          <div
            class="library-album-row__track"
            aria-hidden="true"
          >
            <div
              class="library-album-row__fill"
              :style="{ width: `${album.progress}%` }"
            />
          </div>
        </template>

        <p
          v-else-if="subtitle"
          class="library-album-row__subtitle"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>

    <div class="library-album-row__actions">
      <button
        v-if="album.status === 'idle'"
        type="button"
        class="library-album-row__btn library-album-row__btn--download"
        @click="emit('download')"
      >
        <i
          class="mdi mdi-download"
          aria-hidden="true"
        />
        {{ t('sync.download') }}
      </button>

      <button
        v-else-if="album.status === 'downloading'"
        type="button"
        class="library-album-row__icon-btn library-album-row__icon-btn--danger"
        :aria-label="t('sync.cancel')"
        @click="emit('cancel')"
      >
        <i
          class="mdi mdi-close"
          aria-hidden="true"
        />
      </button>

      <template v-else-if="album.status === 'downloaded'">
        <span class="library-album-row__badge">
          <i
            class="mdi mdi-check"
            aria-hidden="true"
          />
          {{ t('sync.downloaded') }}
        </span>
        <button
          type="button"
          class="library-album-row__icon-btn"
          :aria-label="t('sync.deleteAlbum')"
          @click="emit('remove')"
        >
          <i
            class="mdi mdi-delete"
            aria-hidden="true"
          />
        </button>
      </template>

      <button
        v-else-if="album.status === 'error'"
        type="button"
        class="library-album-row__btn library-album-row__btn--retry"
        @click="emit('download')"
      >
        <i
          class="mdi mdi-refresh"
          aria-hidden="true"
        />
        {{ t('sync.retry') }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.library-album-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  transition: background-color 200ms ease;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 3%, transparent);
  }
}

.library-album-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 1.25rem;
}

.library-album-row__cover {
  display: flex;
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--ds-radius-md, 0.5rem);
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  background: var(--ds-color-surface-container-high, #2a2a2a);
}

.library-album-row__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-album-row__fallback-icon {
  font-size: 1.5rem;
  color: var(--ds-color-primary);
  line-height: 1;
}

.library-album-row__text {
  min-width: 0;
  flex: 1;
}

.library-album-row__name {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.library-album-row__subtitle {
  margin: 0.15rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}

.library-album-row__progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
  color: var(--ds-color-primary);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.library-album-row__track {
  margin-top: 0.35rem;
  height: 5px;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
}

.library-album-row__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--ds-color-primary);
  transition: width 200ms ease;
}

.library-album-row__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
}

.library-album-row__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 1.25rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
  border-radius: var(--ds-radius-md, 0.5rem);
  background: transparent;
  color: var(--ds-color-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  transition:
    background-color 200ms ease,
    color 200ms ease,
    border-color 200ms ease;

  .mdi {
    font-size: 1.125rem;
    line-height: 1;
  }

  &--download:hover {
    background: var(--ds-color-primary-container, #2196f3);
    border-color: transparent;
    color: #fff;
  }

  &--retry {
    border-color: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 35%, transparent);
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 12%, transparent);
    color: var(--ds-color-error, #ffb4ab);
  }
}

.library-album-row__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  transition:
    color 200ms ease,
    background-color 200ms ease;

  .mdi {
    font-size: 1.25rem;
    line-height: 1;
  }

  &:hover {
    color: var(--ds-color-error, #ffb4ab);
    background: color-mix(in srgb, var(--ds-color-on-surface) 6%, transparent);
  }

  &--danger {
    color: var(--ds-color-error, #ffb4ab);
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 12%, transparent);
  }
}

.library-album-row__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 12%, transparent);
  color: var(--ds-color-secondary, #78d6d2);
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;

  .mdi {
    font-size: 14px;
    line-height: 1;
  }
}
</style>
