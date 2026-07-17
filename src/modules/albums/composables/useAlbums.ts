import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import type { MediaPlaybackMode } from '@modules/media/types/media'

import { useAlbumsStore } from '../stores/useAlbumsStore'

export function useAlbums() {
  const store = useAlbumsStore()
  const router = useRouter()
  const {
    categories,
    activeCollection,
    tracks,
    searchQuery,
    hubSearchQuery,
    isLoadingCatalog,
    isLoadingTracks,
    isLoadingMusicIndex,
    lastErrorKey,
    lastActionMessageKey,
    lyricOpen,
    lyricDoc,
    isLoadingLyric,
    filteredTracks,
    hubSearchResults,
    isHubSearching,
  } = storeToRefs(store)

  onMounted(() => {
    void store.hydrateCatalog()
  })

  async function openPlayerWindow(ok: boolean) {
    if (!ok) return false
    await router.push({ name: 'media' })
    return true
  }

  async function playSung(musicId: number) {
    return openPlayerWindow(await store.playTrack(musicId, 'audio'))
  }

  async function playInstrumental(musicId: number) {
    return openPlayerWindow(await store.playTrack(musicId, 'instrumental'))
  }

  async function playSlides(musicId: number) {
    return openPlayerWindow(
      await store.playTrack(musicId, 'no_audio', { project: true }),
    )
  }

  async function playMode(musicId: number, mode: MediaPlaybackMode) {
    return openPlayerWindow(
      await store.playTrack(musicId, mode, {
        project: mode === 'no_audio',
      }),
    )
  }

  return {
    categories,
    activeCollection,
    tracks,
    searchQuery,
    hubSearchQuery,
    isLoadingCatalog,
    isLoadingTracks,
    isLoadingMusicIndex,
    lastErrorKey,
    lastActionMessageKey,
    lyricOpen,
    lyricDoc,
    isLoadingLyric,
    filteredTracks,
    hubSearchResults,
    isHubSearching,
    hydrateCatalog: store.hydrateCatalog,
    hydrateMusicIndex: store.hydrateMusicIndex,
    openCollection: store.openCollection,
    clearCollection: store.clearCollection,
    clearError: store.clearError,
    clearActionMessage: store.clearActionMessage,
    playSung,
    playInstrumental,
    playSlides,
    playMode,
    openLyric: store.openLyric,
    closeLyric: store.closeLyric,
  }
}
