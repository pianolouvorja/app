<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import LibraryCategoryBlock from '../components/LibraryCategoryBlock.vue'
import DownloadFailureDialog from '../components/DownloadFailureDialog.vue'
import { useLocalLibrary } from '../composables/useLocalLibrary'
import type { LibraryAlbum } from '../types/library'

const { t } = useI18n()
const {
  categories,
  isLoadingList,
  isDownloadingBatch,
  lastErrorKey,
  downloadFailure,
  hasIdleAlbums,
  isDesktop,
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
      class="local-library-view__toolbar"
      elevated
      :padding="false"
    >
      <div class="local-library-view__brand">
        <i
          class="ti ti-books local-library-view__brand-icon"
          aria-hidden="true"
        />
        <h1 class="local-library-view__title">
          {{ t('sync.heading') }}
        </h1>
      </div>

      <div class="local-library-view__toolbar-actions">
        <button
          v-if="isDesktop && categories.length > 0 && !isDownloadingBatch"
          type="button"
          class="local-library-view__batch-btn"
          :disabled="!hasIdleAlbums"
          @click="downloadAll"
        >
          <i
            class="ti ti-cloud-download"
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
            class="ti ti-circles-relation"
            aria-hidden="true"
          />
          {{ t('sync.cancelAll') }}
        </button>
      </div>
    </GlassCard>

    <GlassCard
      class="local-library-view__panel"
      elevated
      :padding="false"
    >
      <div class="local-library-view__body">
        <div
          v-if="lastErrorKey && !downloadFailure"
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
              class="ti ti-x"
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

    <DownloadFailureDialog
      :failure="downloadFailure"
      @close="clearError"
    />
  </section>
</template>

<style scoped lang="scss">
.local-library-view {
  display: flex;
  width: 100%;
  max-width: 80rem;
  height: calc(100vh - var(--app-titlebar-height, 0px) - 5rem - var(--ds-dock-height));
  max-height: calc(100vh - var(--app-titlebar-height, 0px) - 5rem - var(--ds-dock-height));
  flex-direction: column;
  margin: 0 auto;
  padding: 1.5rem var(--ds-spacing-page) 1.5rem;
  overflow: hidden;
}

.local-library-view__toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1.5rem;
  border-radius: 9999px !important;
}

.local-library-view__brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.local-library-view__brand-icon {
  flex-shrink: 0;
  color: var(--ds-color-primary);
  font-size: 1.5rem;
  line-height: 1;
}

.local-library-view__title {
  margin: 0;
  overflow: hidden;
  color: var(--ds-color-on-surface);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.local-library-view__toolbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
}

.local-library-view__batch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 1.25rem;
  border: 0;
  border-radius: 9999px;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary, #003258);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  box-shadow: 0 0 20px color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
  transition:
    filter 200ms ease,
    opacity 200ms ease,
    background-color 200ms ease;

  .ti {
    font-size: 1.25rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    box-shadow: none;
  }

  &--cancel {
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 85%, transparent);
    color: #fff;
    box-shadow: none;
  }
}

.local-library-view__panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 1rem !important;
  background: color-mix(
    in srgb,
    var(--ds-color-surface-elevated, #1e1e1e) 55%,
    transparent
  ) !important;

  &:hover {
    border-color: var(--ds-color-outline-strong, rgb(255 255 255 / 8%));
  }
}

.local-library-view__body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1.5rem 1.5rem 2rem;
  scrollbar-gutter: stable;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 9999px;
    background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  }
}

.local-library-view__error {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
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

  .ti {
    font-size: 1.125rem;
    line-height: 1;
  }
}

.local-library-view__loading,
.local-library-view__empty {
  display: flex;
  justify-content: center;
  padding: 4rem 1rem;
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
