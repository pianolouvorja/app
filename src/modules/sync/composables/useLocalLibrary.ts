import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

import { isDesktopApp } from '@shared/services/desktop-bridge'

import { useLocalLibraryStore } from '../stores/useLocalLibraryStore'
import type { LibraryAlbum } from '../types/library'

/** Orquestra a Biblioteca Local (listagem, download e exclusão). */
export function useLocalLibrary() {
  const store = useLocalLibraryStore()
  const {
    categories,
    isLoadingList,
    isDownloadingBatch,
    lastErrorKey,
    hasIdleAlbums,
    isAnyDownloading,
  } = storeToRefs(store)

  onMounted(() => {
    if (isDesktopApp()) {
      void store.refreshCollections()
    }
  })

  function downloadAlbum(album: LibraryAlbum) {
    void store.downloadAlbum(album.id)
  }

  function cancelAlbum(album: LibraryAlbum) {
    store.cancelAlbum(album.id)
  }

  function downloadAll() {
    void store.downloadAllIdleAlbums()
  }

  function cancelAll() {
    store.cancelAllDownloads()
  }

  async function confirmRemoveAlbum(album: LibraryAlbum): Promise<void> {
    await store.removeAlbum(album.id)
  }

  return {
    categories,
    isLoadingList,
    isDownloadingBatch,
    lastErrorKey,
    hasIdleAlbums,
    isAnyDownloading,
    isDesktop: isDesktopApp(),
    downloadAlbum,
    cancelAlbum,
    downloadAll,
    cancelAll,
    confirmRemoveAlbum,
    clearError: store.clearError,
    refreshCollections: store.refreshCollections,
  }
}
