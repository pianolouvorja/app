import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { LibraryAlbum, LibraryCategory } from '../types/library'
import { loadLibraryCategories } from '../services/library-catalog'
import {
  deleteAlbumMedia,
  downloadAlbumMedia,
} from '../services/library-download'

function findAlbum(
  categories: LibraryCategory[],
  albumId: LibraryAlbum['id'],
): LibraryAlbum | null {
  for (const category of categories) {
    const album = category.albums.find((item) => item.id === albumId)
    if (album) return album
  }
  return null
}

export const useLocalLibraryStore = defineStore('localLibrary', () => {
  const categories = ref<LibraryCategory[]>([])
  const isLoadingList = ref(false)
  const isDownloadingBatch = ref(false)
  const cancelBatchRequested = ref(false)
  const lastErrorKey = ref<string | null>(null)

  const hasIdleAlbums = computed(() =>
    categories.value.some((category) =>
      category.albums.some((album) => album.status === 'idle'),
    ),
  )

  const isAnyDownloading = computed(() =>
    categories.value.some((category) =>
      category.albums.some((album) => album.status === 'downloading'),
    ),
  )

  function clearError() {
    lastErrorKey.value = null
  }

  function setError(key: string) {
    lastErrorKey.value = key
  }

  async function refreshCollections() {
    isLoadingList.value = true
    clearError()
    try {
      categories.value = await loadLibraryCategories()
    } catch (error) {
      console.error('[sync] falha ao carregar coletâneas', error)
      setError('sync.errors.loadFailed')
      categories.value = []
    } finally {
      isLoadingList.value = false
    }
  }

  async function downloadAlbum(albumId: LibraryAlbum['id']) {
    const album = findAlbum(categories.value, albumId)
    if (!album || album.status === 'downloading') return null
    if (cancelBatchRequested.value && isDownloadingBatch.value) return null

    clearError()
    album.status = 'downloading'
    album.progress = 0
    album.totalCount = 0
    album.downloadedCount = 0
    album.cancelRequested = false
    album.progressText = 'sync.progress.preparing'

    try {
      const result = await downloadAlbumMedia(album, {
        onPrepareProgress: (percent) => {
          album.progress = percent
          album.progressText = 'sync.progress.preparing'
        },
        onDownloadProgress: (downloaded, total, percent) => {
          album.downloadedCount = downloaded
          album.totalCount = total
          album.progress = percent
          album.progressText = 'sync.progress.downloading'
        },
        shouldAbort: () =>
          album.cancelRequested || (isDownloadingBatch.value && cancelBatchRequested.value),
      })

      if (result.status === 'downloaded') {
        album.status = 'downloaded'
        album.progress = 100
        album.progressText = ''
        return result.status
      }

      if (result.status === 'idle') {
        album.status = 'idle'
        album.progress = 0
        album.progressText =
          result.failureReason === 'cancelled' ? 'sync.progress.cancelled' : ''
        return result.status
      }

      album.status = 'error'
      album.progressText =
        result.failureReason === 'offline'
          ? 'sync.progress.offline'
          : 'sync.progress.serverError'

      if (!isDownloadingBatch.value) {
        setError(
          result.failureReason === 'offline'
            ? 'sync.errors.downloadOffline'
            : 'sync.errors.downloadServer',
        )
      }

      return result.status
    } catch (error) {
      console.error('[sync] erro ao baixar coletânea', error)
      album.status = 'error'
      album.progressText = 'sync.progress.error'
      if (!isDownloadingBatch.value) {
        setError('sync.errors.downloadUnknown')
      }
      return 'error' as const
    }
  }

  async function downloadAllIdleAlbums() {
    if (!hasIdleAlbums.value || isDownloadingBatch.value) return

    isDownloadingBatch.value = true
    cancelBatchRequested.value = false
    clearError()

    outer: for (const category of categories.value) {
      for (const album of category.albums) {
        if (cancelBatchRequested.value) break outer
        if (album.status !== 'idle') continue

        const status = await downloadAlbum(album.id)

        if (status === 'error' && !navigator.onLine) {
          cancelBatchRequested.value = true
          setError('sync.errors.batchOffline')
          break outer
        }
      }
    }

    isDownloadingBatch.value = false
    cancelBatchRequested.value = false
  }

  function cancelAlbum(albumId: LibraryAlbum['id']) {
    const album = findAlbum(categories.value, albumId)
    if (album) album.cancelRequested = true
  }

  function cancelAllDownloads() {
    cancelBatchRequested.value = true
    for (const category of categories.value) {
      for (const album of category.albums) {
        if (album.status === 'downloading') {
          album.cancelRequested = true
        }
      }
    }
  }

  async function removeAlbum(albumId: LibraryAlbum['id']) {
    const album = findAlbum(categories.value, albumId)
    if (!album || album.status !== 'downloaded') return

    await deleteAlbumMedia(album)
    album.status = 'idle'
    album.progress = 0
    album.downloadedCount = 0
    album.progressText = ''
  }

  return {
    categories,
    isLoadingList,
    isDownloadingBatch,
    lastErrorKey,
    hasIdleAlbums,
    isAnyDownloading,
    clearError,
    refreshCollections,
    downloadAlbum,
    downloadAllIdleAlbums,
    cancelAlbum,
    cancelAllDownloads,
    removeAlbum,
  }
})
