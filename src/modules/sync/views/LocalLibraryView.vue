<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import LibraryCategoryBlock from '../components/LibraryCategoryBlock.vue'
import { useLocalLibrary } from '../composables/useLocalLibrary'
import type { LibraryAlbum } from '../types/library'

const { t } = useI18n()
const {
  categories,
  isLoadingList,
  isDownloadingBatch,
  lastErrorKey,
  hasIdleAlbums,
  isDesktop,
  closeLibrary,
  downloadAlbum,
  cancelAlbum,
  downloadAll,
  cancelAll,
  confirmRemoveAlbum,
  clearError,
} = useLocalLibrary()

const albumPendingRemoval = ref<LibraryAlbum | null>(null)

function requestRemove(album: LibraryAlbum) {
  albumPendingRemoval.value = album
}

function dismissRemove() {
  albumPendingRemoval.value = null
}

async function confirmRemove() {
  const album = albumPendingRemoval.value
  if (!album) return
  albumPendingRemoval.value = null
  await confirmRemoveAlbum(album)
}
</script>

<template>
  <section class="local-library-view">
    <GlassCard
      class="local-library-view__card"
      :padding="false"
      elevated
    >
      <header class="local-library-view__header">
        <div class="local-library-view__brand">
          <div
            class="local-library-view__icon-wrap"
            aria-hidden="true"
          >
            <i class="mdi mdi-library" />
          </div>
          <div>
            <h1 class="local-library-view__title">
              {{ t('sync.heading') }}
            </h1>
            <p class="local-library-view__subtitle">
              {{ t('sync.subtitle') }}
            </p>
          </div>
        </div>

        <div class="local-library-view__header-actions">
          <button
            v-if="isDesktop && categories.length > 0 && !isDownloadingBatch"
            type="button"
            class="local-library-view__batch-btn"
            :disabled="!hasIdleAlbums"
            @click="downloadAll"
          >
            <i
              class="mdi mdi-download-multiple"
              aria-hidden="true"
            />
            {{ t('sync.downloadAll') }}
          </button>
          <button
            v-else-if="isDesktop && isDownloadingBatch"
            type="button"
            class="local-library-view__batch-btn local-library-view__batch-btn--cancel"
            @click="cancelAll"
          >
            <i
              class="mdi mdi-close-circle-multiple"
              aria-hidden="true"
            />
            {{ t('sync.cancelAll') }}
          </button>

          <button
            type="button"
            class="local-library-view__close"
            :aria-label="t('sync.close')"
            @click="closeLibrary"
          >
            <i
              class="mdi mdi-close"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      <div class="local-library-view__body">
        <div
          v-if="lastErrorKey"
          class="local-library-view__error"
          role="alert"
        >
          <p>{{ t(lastErrorKey) }}</p>
          <button
            type="button"
            class="local-library-view__error-close"
            :aria-label="t('sync.close')"
            @click="clearError"
          >
            <i
              class="mdi mdi-close"
              aria-hidden="true"
            />
          </button>
        </div>

        <p
          v-if="!isDesktop"
          class="local-library-view__empty"
        >
          {{ t('sync.desktopOnly') }}
        </p>

        <template v-else>
          <div
            v-if="isLoadingList"
            class="local-library-view__loading"
          >
            <div
              class="local-library-view__spinner"
              aria-hidden="true"
            />
          </div>

          <template v-else-if="categories.length > 0">
            <LibraryCategoryBlock
              v-for="category in categories"
              :key="String(category.id)"
              :category="category"
              @download="downloadAlbum"
              @cancel="cancelAlbum"
              @remove="requestRemove"
            />
          </template>

          <p
            v-else
            class="local-library-view__empty"
          >
            {{ t('sync.empty') }}
          </p>
        </template>
      </div>
    </GlassCard>

    <Teleport to="body">
      <div
        v-if="albumPendingRemoval"
        class="library-confirm"
        role="dialog"
        aria-modal="true"
        :aria-label="t('sync.deleteConfirmTitle')"
      >
        <button
          type="button"
          class="library-confirm__backdrop"
          :aria-label="t('sync.deleteConfirmNo')"
          @click="dismissRemove"
        />
        <div class="library-confirm__panel">
          <h2 class="library-confirm__title">
            {{ t('sync.deleteConfirmTitle') }}
          </h2>
          <p class="library-confirm__text">
            {{
              t('sync.deleteConfirmText', {
                name: albumPendingRemoval.name,
              })
            }}
          </p>
          <div class="library-confirm__actions">
            <button
              type="button"
              class="library-confirm__btn"
              @click="dismissRemove"
            >
              {{ t('sync.deleteConfirmNo') }}
            </button>
            <button
              type="button"
              class="library-confirm__btn library-confirm__btn--danger"
              @click="confirmRemove"
            >
              {{ t('sync.deleteConfirmYes') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped lang="scss">
.local-library-view {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 1.5rem var(--ds-spacing-page) 2rem;
}

.local-library-view__card {
  display: flex;
  width: 100%;
  max-width: 64rem;
  max-height: calc(100vh - 5rem - var(--ds-dock-height) - 3rem);
  flex-direction: column;
  overflow: hidden;
}

.local-library-view__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem 2rem 1.5rem;
}

.local-library-view__brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 1.25rem;
}

.local-library-view__icon-wrap {
  display: flex;
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-lg, 0.75rem);
  background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  color: var(--ds-color-primary);

  .mdi {
    font-size: 1.75rem;
    line-height: 1;
  }
}

.local-library-view__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.local-library-view__subtitle {
  margin: 0.15rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}

.local-library-view__header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
}

.local-library-view__batch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.75rem;
  padding: 0 1.5rem;
  border: 0;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  color: var(--ds-color-primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  transition: background-color 200ms ease;

  .mdi {
    font-size: 1.25rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &--cancel {
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 18%, transparent);
    color: var(--ds-color-error, #ffb4ab);
  }
}

.local-library-view__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  transition:
    color 200ms ease,
    background-color 200ms ease;

  .mdi {
    font-size: 1.5rem;
    line-height: 1;
  }

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
    color: var(--ds-color-on-surface);
  }
}

.local-library-view__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 2rem 2rem;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  }
}

.local-library-view__error {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 14%, transparent);
  color: var(--ds-color-error, #ffb4ab);

  p {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
  }
}

.local-library-view__error-close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: inherit;
  cursor: pointer;

  .mdi {
    font-size: 1.125rem;
    line-height: 1;
  }
}

.local-library-view__loading,
.local-library-view__empty {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  text-align: center;
}

.local-library-view__spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid color-mix(in srgb, var(--ds-color-primary) 25%, transparent);
  border-top-color: var(--ds-color-primary);
  border-radius: 9999px;
  animation: library-spin 0.8s linear infinite;
}

@keyframes library-spin {
  to {
    transform: rotate(360deg);
  }
}

.library-confirm {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.library-confirm__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(0 0 0 / 45%);
  cursor: pointer;
}

.library-confirm__panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 26rem;
  padding: 1.5rem;
  border-radius: var(--ds-radius-lg, 0.75rem);
  border: 1px solid var(--ds-color-outline-strong, rgb(255 255 255 / 8%));
  background: var(--ds-color-surface-elevated, #1e1e1e);
  box-shadow: 0 24px 48px rgb(0 0 0 / 40%);
}

.library-confirm__title {
  margin: 0 0 0.75rem;
  color: var(--ds-color-on-surface);
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.library-confirm__text {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}

.library-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.library-confirm__btn {
  height: 2.25rem;
  padding: 0 1rem;
  border: 0;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--ds-color-on-surface) 6%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 200ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  }

  &--danger {
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 18%, transparent);
    color: var(--ds-color-error, #ffb4ab);

    &:hover {
      background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 28%, transparent);
    }
  }
}
</style>
