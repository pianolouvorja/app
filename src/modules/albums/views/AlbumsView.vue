<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { GlassCard } from '@design-system/index'
import type { LibraryAlbum } from '@modules/sync/types/library'

import AlbumCollectionCard from '../components/AlbumCollectionCard.vue'
import AlbumHymnalCard from '../components/AlbumHymnalCard.vue'
import AlbumLyricDialog from '../components/AlbumLyricDialog.vue'
import AlbumSearchHitRow from '../components/AlbumSearchHitRow.vue'
import DownloadFailureDialog from '@modules/sync/components/DownloadFailureDialog.vue'
import { useAlbums } from '../composables/useAlbums'
import type { AlbumCategory, AlbumCollection } from '../types/albums'

const { t } = useI18n()
const router = useRouter()

const {
  categories,
  hubSearchQuery,
  hubSearchResults,
  isHubSearching,
  isLoadingCatalog,
  isLoadingMusicIndex,
  lastErrorKey,
  lastActionMessageKey,
  lyricOpen,
  lyricDoc,
  isLoadingLyric,
  isDesktop,
  isDownloadingBatch,
  hasIdleAlbums,
  downloadErrorKey,
  downloadFailure,
  findLibraryAlbum,
  clearError,
  clearActionMessage,
  clearDownloadError,
  hydrateCatalog,
  downloadCollection,
  cancelCollection,
  downloadAll,
  cancelAll,
  removeCollection,
  playSung,
  playInstrumental,
  playSlides,
  openLyric,
  closeLyric,
} = useAlbums()

const busyMusicId = ref<number | null>(null)
const albumPendingRemoval = ref<LibraryAlbum | null>(null)

const showDownloadControls = computed(() => isDesktop)

function isHymnalsCategory(category: AlbumCategory) {
  return String(category.id) === 'hymnals'
}

function categoryTitle(category: AlbumCategory) {
  if (isHymnalsCategory(category)) return t('sync.categories.hymnals')
  if (
    category.name === 'CDs Oficiais/Ano' ||
    /cds?\s*oficiais/i.test(category.name)
  ) {
    return t('sync.categories.youthAlbums')
  }
  return category.name
}

function categorySubtitle(category: AlbumCategory) {
  if (isHymnalsCategory(category)) return t('sync.categories.hymnalsSubtitle')
  if (
    category.name === 'CDs Oficiais/Ano' ||
    /cds?\s*oficiais/i.test(category.name)
  ) {
    return t('sync.categories.albumsSubtitle')
  }
  return t('sync.categories.defaultSubtitle')
}

function openCollection(collectionId: string | number) {
  void router.push({
    name: 'albums-collection',
    params: { collectionId: String(collectionId) },
  })
}

function retry() {
  clearError()
  void hydrateCatalog()
}

function clearHubSearch() {
  hubSearchQuery.value = ''
}

function requestRemove(collection: AlbumCollection) {
  const album = findLibraryAlbum(collection.id)
  if (!album) return
  albumPendingRemoval.value = album
}

function dismissRemove() {
  albumPendingRemoval.value = null
}

async function confirmRemove() {
  const album = albumPendingRemoval.value
  if (!album) return
  albumPendingRemoval.value = null
  await removeCollection(album.id)
}

async function runAction(
  musicId: number,
  action: () => Promise<boolean | void>,
) {
  busyMusicId.value = musicId
  try {
    await action()
  } finally {
    busyMusicId.value = null
  }
}
</script>

<template>
  <section class="albums-view">
    <header class="albums-view__header">
      <div class="albums-view__brand">
        <div class="albums-view__icon">
          <i
            class="ti ti-music"
            aria-hidden="true"
          />
        </div>
        <div class="albums-view__headings">
          <h1 class="albums-view__title">
            {{ t('albums.title') }}
          </h1>
          <p class="albums-view__subtitle">
            {{ t('albums.subtitle') }}
          </p>
        </div>
      </div>

      <div class="albums-view__header-actions">
        <button
          v-if="showDownloadControls && categories.length > 0 && !isDownloadingBatch"
          type="button"
          class="albums-view__batch-btn"
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
          v-else-if="showDownloadControls && isDownloadingBatch"
          type="button"
          class="albums-view__batch-btn albums-view__batch-btn--cancel"
          @click="cancelAll"
        >
          <i
            class="ti ti-circles-relation"
            aria-hidden="true"
          />
          {{ t('sync.cancelAll') }}
        </button>

        <label class="albums-view__search">
          <i
            class="ti ti-search"
            aria-hidden="true"
          />
          <input
            v-model="hubSearchQuery"
            type="search"
            :placeholder="t('albums.hubSearchPlaceholder')"
            :aria-label="t('albums.hubSearchPlaceholder')"
          >
          <button
            v-if="isHubSearching"
            type="button"
            class="albums-view__search-clear"
            :aria-label="t('albums.clearSearch')"
            :title="t('albums.clearSearch')"
            @click="clearHubSearch"
          >
            <i
              class="ti ti-x"
              aria-hidden="true"
            />
          </button>
        </label>
      </div>
    </header>

    <div
      v-if="downloadErrorKey && !downloadFailure"
      class="albums-view__alert"
      role="alert"
    >
      <p>{{ t(downloadErrorKey) }}</p>
      <button
        type="button"
        @click="clearDownloadError"
      >
        {{ t('albums.dismiss') }}
      </button>
    </div>

    <div
      v-if="lastActionMessageKey && !lastActionMessageKey.startsWith('media.messages.')"
      class="albums-view__alert"
      role="status"
    >
      <p>{{ t(lastActionMessageKey) }}</p>
      <button
        type="button"
        @click="clearActionMessage"
      >
        {{ t('albums.dismiss') }}
      </button>
    </div>

    <div
      v-if="lastErrorKey && !isHubSearching"
      class="albums-view__alert"
      role="alert"
    >
      <p>{{ t(lastErrorKey) }}</p>
      <button
        type="button"
        @click="retry"
      >
        {{ t('albums.retry') }}
      </button>
    </div>

    <template v-else-if="isHubSearching">
      <GlassCard
        class="albums-view__results-card"
        :padding="false"
        elevated
      >
        <div class="albums-view__results-head">
          <h2 class="albums-view__results-title">
            {{ t('albums.searchResultsTitle') }}
          </h2>
        </div>

        <div
          v-if="isLoadingMusicIndex"
          class="albums-view__state albums-view__state--inset"
        >
          {{ t('albums.loading') }}
        </div>

        <div
          v-else-if="hubSearchResults.length === 0"
          class="albums-view__state albums-view__state--inset"
        >
          {{ t('albums.messages.searchEmpty') }}
        </div>

        <div
          v-else
          class="albums-view__results-list"
        >
          <AlbumSearchHitRow
            v-for="hit in hubSearchResults"
            :key="hit.musicId"
            :hit="hit"
            :busy="busyMusicId === hit.musicId"
            @sung="runAction(hit.musicId, () => playSung(hit.musicId))"
            @instrumental="
              runAction(hit.musicId, () => playInstrumental(hit.musicId))
            "
            @slides="runAction(hit.musicId, () => playSlides(hit.musicId))"
            @lyric="runAction(hit.musicId, () => openLyric(hit.musicId))"
          />
        </div>
      </GlassCard>
    </template>

    <div
      v-else-if="isLoadingCatalog"
      class="albums-view__state"
    >
      {{ t('albums.loading') }}
    </div>

    <div
      v-else-if="categories.length === 0"
      class="albums-view__state"
    >
      {{ t('albums.messages.catalogEmpty') }}
    </div>

    <div
      v-else
      class="albums-view__body"
    >
      <section
        v-for="category in categories"
        :key="String(category.id)"
        class="albums-view__category"
        :class="{
          'albums-view__category--hymnals': isHymnalsCategory(category),
        }"
      >
        <header class="albums-view__category-header">
          <h2 class="albums-view__category-title">
            {{ categoryTitle(category) }}
          </h2>
          <p class="albums-view__category-subtitle">
            {{ categorySubtitle(category) }}
          </p>
        </header>

        <div
          v-if="isHymnalsCategory(category)"
          class="albums-view__hymnal-grid"
        >
          <AlbumHymnalCard
            v-for="collection in category.collections"
            :key="String(collection.id)"
            :collection="collection"
            :library-album="findLibraryAlbum(collection.id)"
            :show-download-controls="showDownloadControls"
            @open="openCollection(collection.id)"
            @download="downloadCollection(collection.id)"
            @cancel="cancelCollection(collection.id)"
            @remove="requestRemove(collection)"
          />
        </div>

        <GlassCard
          v-else
          class="albums-view__grid-wrap"
          :padding="false"
          elevated
        >
          <div class="albums-view__grid">
            <AlbumCollectionCard
              v-for="collection in category.collections"
              :key="String(collection.id)"
              :collection="collection"
              :library-album="findLibraryAlbum(collection.id)"
              :show-download-controls="showDownloadControls"
              @open="openCollection(collection.id)"
              @download="downloadCollection(collection.id)"
              @cancel="cancelCollection(collection.id)"
              @remove="requestRemove(collection)"
            />
          </div>
        </GlassCard>
      </section>
    </div>

    <AlbumLyricDialog
      :open="lyricOpen"
      :loading="isLoadingLyric"
      :document="lyricDoc"
      @close="closeLyric"
    />

    <DownloadFailureDialog
      :failure="downloadFailure"
      @close="clearDownloadError"
    />

    <Teleport to="body">
      <div
        v-if="albumPendingRemoval"
        class="albums-confirm"
        role="dialog"
        aria-modal="true"
        :aria-label="t('sync.deleteConfirmTitle')"
      >
        <button
          type="button"
          class="albums-confirm__backdrop"
          :aria-label="t('sync.deleteConfirmNo')"
          @click="dismissRemove"
        />
        <div class="albums-confirm__panel">
          <h2 class="albums-confirm__title">
            {{ t('sync.deleteConfirmTitle') }}
          </h2>
          <p class="albums-confirm__text">
            {{
              t('sync.deleteConfirmText', {
                name: albumPendingRemoval.name,
              })
            }}
          </p>
          <div class="albums-confirm__actions">
            <button
              type="button"
              class="albums-confirm__btn"
              @click="dismissRemove"
            >
              {{ t('sync.deleteConfirmNo') }}
            </button>
            <button
              type="button"
              class="albums-confirm__btn albums-confirm__btn--danger"
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
.albums-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-sizing: border-box;
  height: calc(100vh - var(--app-titlebar-height, 0px) - 5rem - var(--ds-dock-height));
  max-height: calc(100vh - var(--app-titlebar-height, 0px) - 5rem - var(--ds-dock-height));
  padding: 0.75rem var(--ds-spacing-page, 2rem) 1rem;
  overflow: hidden;
}

.albums-view__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.albums-view__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.albums-view__icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary);
  flex-shrink: 0;

  .ti {
    font-size: 1.4rem;
  }
}

.albums-view__headings {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.15rem;
}

.albums-view__title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.15;
}

.albums-view__subtitle {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ds-color-primary);
}

.albums-view__header-actions {
  display: flex;
  flex-shrink: 1;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  max-width: 100%;
}

.albums-view__search {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: 14rem;
  max-width: 100%;
  min-width: 0;
  flex-shrink: 1;
  box-sizing: border-box;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-color-surface-card) 82%, transparent);
  border: 1px solid var(--ds-color-outline-strong);
  color: var(--ds-color-on-surface-variant);

  .ti-search {
    flex-shrink: 0;
    color: var(--ds-color-primary);
    font-size: 1.15rem;
  }

  input {
    flex: 1;
    min-width: 0;
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--ds-color-on-surface);
    font-size: 0.9rem;
  }
}

.albums-view__search-clear {
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-primary) 14%, transparent);
  }
}

.albums-view__batch-btn {
  display: inline-flex;
  flex-shrink: 0;
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

.albums-view__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-right: 0.25rem;
}

.albums-view__category-header {
  margin-bottom: 1rem;
}

.albums-view__category-title {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ds-color-on-surface);
}

.albums-view__category-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ds-color-on-surface-variant);
  opacity: 0.85;
}

.albums-view__hymnal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.albums-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.albums-view__results-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.albums-view__results-head {
  flex-shrink: 0;
  padding: 0.9rem 1rem 0.55rem;
  border-bottom: 1px solid var(--ds-color-outline);
}

.albums-view__results-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ds-color-on-surface);
}

.albums-view__results-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.albums-view__state,
.albums-view__alert {
  flex: 1;
  min-height: 0;
  border-radius: var(--ds-radius-lg, 1rem);
  background: color-mix(in srgb, var(--ds-color-surface-card) 72%, transparent);
  border: 1px solid var(--ds-color-outline-strong);
  padding: 1.5rem;
  color: var(--ds-color-on-surface-variant);
}

.albums-view__state--inset {
  flex: 1;
  border: none;
  border-radius: 0;
  background: transparent;
}

.albums-view__alert {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  button {
    border: 1px solid var(--ds-color-outline-strong);
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    background: transparent;
    color: var(--ds-color-on-surface);
    cursor: pointer;
  }
}

.albums-confirm {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.albums-confirm__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(0 0 0 / 45%);
  cursor: pointer;
}

.albums-confirm__panel {
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

.albums-confirm__title {
  margin: 0 0 0.75rem;
  color: var(--ds-color-on-surface);
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.albums-confirm__text {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}

.albums-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.albums-confirm__btn {
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
