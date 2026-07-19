<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

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

const displayName = computed(() => {
  if (props.album.id === 'hymnal_1996') return t('sync.hymnal.edition1996Name')
  return props.album.name
})

const subtitle = computed(() => {
  if (props.album.status === 'downloading') {
    return t(props.album.progressText || 'sync.progress.downloading')
  }

  if (props.album.songCount != null) {
    const key =
      props.album.id === 'hymnal_1996'
        ? 'sync.hymnal.edition1996Subtitle'
        : 'sync.hymnal.officialSubtitle'
    return t(key, { count: props.album.songCount })
  }

  return props.album.subtitle
})

const coverIcon = computed(() =>
  props.album.id === 'hymnal_1996' ? 'ti-history' : 'ti-book-2',
)

const isDownloaded = computed(() => props.album.status === 'downloaded')
</script>

<template>
  <GlassCard
    class="library-hymnal-card"
    :class="{ 'library-hymnal-card--downloaded': isDownloaded }"
    :padding="false"
  >
    <div
      v-if="isDownloaded"
      class="library-hymnal-card__badge"
    >
      <i
        class="ti ti-check"
        aria-hidden="true"
      />
      <span>{{ t('sync.downloaded') }}</span>
    </div>

    <div
      class="library-hymnal-card__cover"
      :class="{
        'library-hymnal-card__cover--muted': album.status === 'idle' || album.status === 'error',
      }"
    >
      <i
        class="ti library-hymnal-card__fallback-icon"
        :class="coverIcon"
        aria-hidden="true"
      />
    </div>

    <div class="library-hymnal-card__body">
      <h4 class="library-hymnal-card__name">
        {{ displayName }}
      </h4>

      <template v-if="album.status === 'downloading'">
        <div class="library-hymnal-card__progress-meta">
          <span>{{ subtitle }}</span>
          <span>{{ album.progress }}%</span>
        </div>
        <div
          class="library-hymnal-card__track"
          aria-hidden="true"
        >
          <div
            class="library-hymnal-card__fill"
            :style="{ width: `${album.progress}%` }"
          />
        </div>
        <button
          type="button"
          class="library-hymnal-card__cancel"
          @click="emit('cancel')"
        >
          <i
            class="ti ti-x"
            aria-hidden="true"
          />
          {{ t('sync.cancel') }}
        </button>
      </template>

      <template v-else>
        <p
          v-if="subtitle"
          class="library-hymnal-card__subtitle"
        >
          {{ subtitle }}
        </p>

        <button
          v-if="album.status === 'idle'"
          type="button"
          class="library-hymnal-card__action library-hymnal-card__action--download"
          @click="emit('download')"
        >
          <i
            class="ti ti-download"
            aria-hidden="true"
          />
          {{ t('sync.downloadOffline') }}
        </button>

        <button
          v-else-if="album.status === 'downloaded'"
          type="button"
          class="library-hymnal-card__action library-hymnal-card__action--remove"
          @click="emit('remove')"
        >
          <i
            class="ti ti-trash"
            aria-hidden="true"
          />
          {{ t('sync.remove') }}
        </button>

        <button
          v-else-if="album.status === 'error'"
          type="button"
          class="library-hymnal-card__action library-hymnal-card__action--retry"
          @click="emit('download')"
        >
          <i
            class="ti ti-refresh"
            aria-hidden="true"
          />
          {{ t('sync.retry') }}
        </button>
      </template>
    </div>
  </GlassCard>
</template>

<style scoped lang="scss">
.library-hymnal-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  overflow: hidden;
  border-radius: 1rem !important;
  transition:
    background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
    border-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 300ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);
  }
}

.library-hymnal-card__badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 20%, transparent);
  background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 20%, transparent);
  color: var(--ds-color-secondary, #78d6d2);
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  animation: library-badge-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  .ti {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 700;
  }
}

.library-hymnal-card__cover {
  display: flex;
  width: 5rem;
  height: 6rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  background: var(--ds-color-surface-container-high, #2a2a2a);
  box-shadow: 0 12px 24px rgb(0 0 0 / 35%);

  &--muted {
    border-color: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
    background: color-mix(
      in srgb,
      var(--ds-color-surface-container-high, #2a2a2a) 50%,
      transparent
    );
    box-shadow: none;

    .library-hymnal-card__fallback-icon {
      color: var(--ds-color-on-surface-variant);
    }
  }
}

.library-hymnal-card__fallback-icon {
  font-size: 2.75rem;
  color: var(--ds-color-primary);
  line-height: 1;
}

.library-hymnal-card__body {
  min-width: 0;
  flex: 1;
  padding-right: 0.5rem;
}

.library-hymnal-card__name {
  margin: 0 0 0.25rem;
  color: var(--ds-color-on-surface);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.library-hymnal-card__subtitle {
  margin: 0 0 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}

.library-hymnal-card__progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  color: var(--ds-color-primary);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.library-hymnal-card__track {
  height: 5px;
  margin-bottom: 0.85rem;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
}

.library-hymnal-card__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--ds-color-primary);
  transition: width 200ms ease;
}

.library-hymnal-card__action,
.library-hymnal-card__cancel {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 1rem;
  border-radius: var(--ds-radius-md, 0.5rem);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  transition:
    background-color 200ms ease,
    color 200ms ease,
    border-color 200ms ease;

  .ti {
    font-size: 1.125rem;
    line-height: 1;
  }
}

.library-hymnal-card__action--download {
  border: 1px solid color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  color: var(--ds-color-primary);

  &:hover {
    background: color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
  }
}

.library-hymnal-card__action--remove,
.library-hymnal-card__cancel {
  height: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant);

  &:hover {
    color: var(--ds-color-error, #ffb4ab);
  }
}

.library-hymnal-card__action--retry {
  border: 1px solid color-mix(in srgb, var(--ds-color-error, #ffb4ab) 35%, transparent);
  background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 12%, transparent);
  color: var(--ds-color-error, #ffb4ab);
}

@keyframes library-badge-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}
</style>
