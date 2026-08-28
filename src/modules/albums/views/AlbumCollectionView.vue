<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { MediaCollectionList } from '@design-system/index'

import AlbumLyricDialog from '../components/AlbumLyricDialog.vue'
import AlbumTrackRow from '../components/AlbumTrackRow.vue'
import { useAlbums } from '../composables/useAlbums'
import {
  addPlaylistItem,
  createPlaylist,
  listPlaylists,
  type PlaylistItem,
} from '../services/playlist-storage'
import type { AlbumTrack } from '../types/albums'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const {
  activeCollection,
  filteredTracks,
  searchQuery,
  isLoadingTracks,
  lastErrorKey,
  lastActionMessageKey,
  lyricOpen,
  lyricDoc,
  isLoadingLyric,
  openCollection,
  clearError,
  clearActionMessage,
  playSung,
  playInstrumental,
  playSlides,
  playAllInActiveCollection,
  openLyric,
  closeLyric,
} = useAlbums()

const busyMusicId = ref<number | null>(null)
const playlistItem = ref<PlaylistItem | null>(null)
const playlistName = ref('')
const playlists = ref(listPlaylists())

const collectionId = computed(() => String(route.params.collectionId ?? ''))

const title = computed(
  () => activeCollection.value?.name || t('albums.collectionFallback'),
)

async function load() {
  clearError()
  await openCollection(collectionId.value)
}

onMounted(() => {
  void load()
})

watch(collectionId, () => {
  void load()
})

function goBack() {
  void router.push({ name: 'albums' })
}

function openPlaylistPicker(track: AlbumTrack) {
  playlistItem.value = {
    musicId: track.musicId,
    albumId: Number(activeCollection.value?.id) || null,
    title: track.name,
  }
}

function addToPlaylist(id: string) {
  if (!playlistItem.value) return
  addPlaylistItem(id, playlistItem.value)
  playlists.value = listPlaylists()
  playlistItem.value = null
}

function createPlaylistForTrack() {
  const name = playlistName.value.trim()
  if (!playlistItem.value || !name) return
  const playlist = createPlaylist(name)
  addPlaylistItem(playlist.id, playlistItem.value)
  playlists.value = listPlaylists()
  playlistName.value = ''
  playlistItem.value = null
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
  <section class="album-collection-view">
    <header class="album-collection-view__header">
      <div class="album-collection-view__brand">
        <button
          type="button"
          class="album-collection-view__back"
          :aria-label="t('albums.back')"
          :title="t('albums.back')"
          @click="goBack"
        >
          <i
            class="ti ti-arrow-left"
            aria-hidden="true"
          />
        </button>

        <div class="album-collection-view__icon">
          <i
            class="ti"
            :class="
              activeCollection?.kind === 'hymnal'
                ? 'ti-book'
                : 'ti-disc'
            "
            aria-hidden="true"
          />
        </div>

        <h1 class="album-collection-view__title">
          {{ title }}
        </h1>
      </div>

      <button
        v-if="activeCollection?.kind !== 'hymnal' && filteredTracks.length > 0"
        type="button"
        class="album-collection-view__play-all"
        :aria-label="t('albums.playAll')"
        :title="t('albums.playAll')"
        @click="playAllInActiveCollection()"
      >
        <i class="ti ti-player-play" aria-hidden="true" />
        {{ t('albums.playAll') }}
      </button>
    </header>

    <div
      v-if="lastActionMessageKey && !lastActionMessageKey.startsWith('media.messages.')"
      class="album-collection-view__alert"
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
      v-if="lastErrorKey"
      class="album-collection-view__alert"
      role="alert"
    >
      <p>{{ t(lastErrorKey) }}</p>
      <button
        type="button"
        @click="load"
      >
        {{ t('albums.retry') }}
      </button>
    </div>

    <MediaCollectionList
      v-model="searchQuery"
      :search-placeholder="t('albums.searchPlaceholder')"
      :search-aria-label="t('albums.searchPlaceholder')"
      :clear-aria-label="t('albums.clearSearch')"
      :number-label="t('albums.columns.number')"
      :title-label="t('albums.columns.title')"
      :duration-label="t('albums.columns.duration')"
      :actions-label="t('albums.columns.actions')"
      :loading="isLoadingTracks"
      :loading-label="t('albums.loading')"
      :empty="!isLoadingTracks && filteredTracks.length === 0"
      :empty-label="
        searchQuery.trim()
          ? t('albums.messages.searchEmpty')
          : t('albums.messages.tracksEmpty')
      "
    >
      <AlbumTrackRow
        v-for="track in filteredTracks"
        :key="track.musicId"
        :track="track"
        :collection-name="title"
        :artwork-url="activeCollection?.coverUrl"
        :busy="busyMusicId === track.musicId"
        @sung="runAction(track.musicId, () => playSung(track.musicId))"
        @instrumental="
          runAction(track.musicId, () => playInstrumental(track.musicId))
        "
        @slides="runAction(track.musicId, () => playSlides(track.musicId))"
        @lyric="runAction(track.musicId, () => openLyric(track.musicId))"
        @playlist="openPlaylistPicker(track)"
      />
    </MediaCollectionList>

    <Teleport to="body">
      <div v-if="playlistItem" class="playlist-picker" role="dialog" aria-modal="true" aria-label="Adicionar à playlist">
        <div class="playlist-picker__panel">
          <h2>Adicionar “{{ playlistItem.title }}”</h2>
          <button v-for="playlist in playlists" :key="playlist.id" type="button" @click="addToPlaylist(playlist.id)">
            {{ playlist.name }}
          </button>
          <form class="playlist-picker__create" @submit.prevent="createPlaylistForTrack">
            <input v-model="playlistName" required placeholder="Nova playlist" aria-label="Nome da nova playlist">
            <button type="submit">Criar e adicionar</button>
          </form>
          <button type="button" @click="playlistItem = null">Cancelar</button>
        </div>
      </div>
    </Teleport>

    <AlbumLyricDialog
      :open="lyricOpen"
      :loading="isLoadingLyric"
      :document="lyricDoc"
      @close="closeLyric"
    />
  </section>
</template>

<style scoped lang="scss">
.album-collection-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  height: calc(100vh - var(--app-titlebar-height, 0px) - var(--ds-header-height, 5rem) - var(--ds-dock-height));
  max-height: calc(100vh - var(--app-titlebar-height, 0px) - var(--ds-header-height, 5rem) - var(--ds-dock-height));
  padding: 0.75rem var(--ds-spacing-page, 2rem) 1rem;
  overflow: hidden;
}

.album-collection-view__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
}

.album-collection-view__play-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  border: 0;
  border-radius: 0.7rem;
  padding: 0.6rem 0.85rem;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.album-collection-view__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.album-collection-view__back {
  width: 2.4rem;
  height: 2.4rem;
  border: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-color-surface-card) 80%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  }
}

.album-collection-view__icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem 0 0.75rem 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary);
  flex-shrink: 0;

  .ti {
    font-size: 1.35rem;
  }
}

.album-collection-view__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-collection-view__alert {
  border-radius: var(--ds-radius-lg, 1rem 0 1rem 0);
  background: color-mix(in srgb, var(--ds-color-surface-card) 72%, transparent);
  border: 1px solid var(--ds-color-outline-strong);
  padding: 1.25rem 1.4rem;
  color: var(--ds-color-on-surface-variant);
}

.album-collection-view__alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;

  button {
    border: 1px solid var(--ds-color-outline-strong);
    border-radius: 999px;
    padding: 0.35rem 0.85rem;
    background: transparent;
    color: var(--ds-color-on-surface);
    cursor: pointer;
  }
}

.playlist-picker {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 55%);
}

.playlist-picker__panel {
  display: grid;
  gap: 0.75rem;
  width: min(28rem, 100%);
  padding: 1.25rem;
  border-radius: var(--ds-radius-lg, 1rem 0 1rem 0);
  background: var(--ds-color-surface-card);
}

.playlist-picker__panel h2 { margin: 0; }
.playlist-picker button, .playlist-picker input { padding: 0.65rem 0.8rem; border-radius: 0.5rem; font: inherit; }
.playlist-picker__create { display: grid; gap: 0.5rem; }

@media (max-width: 1280px) {
  .album-collection-view {
    gap: 0.75rem;
    padding: 0.5rem 1rem 0.65rem;
  }

  .album-collection-view__header {
    gap: 0.75rem;
  }

  .album-collection-view__icon {
    width: 2.25rem;
    height: 2.25rem;

    .ti {
      font-size: 1.15rem;
    }
  }

  .album-collection-view__title {
    font-size: 1.15rem;
  }
}
</style>
