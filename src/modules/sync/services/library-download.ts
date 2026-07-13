import { getDesktopBridge } from '@shared/services/desktop-bridge'
import { readCatalogRecord } from '@shared/services/workspace-api'

import type {
  CatalogAlbumRecord,
  CatalogHymnalEntry,
  CatalogMusicRecord,
  DownloadFailureReason,
  LibraryAlbum,
  MediaDownloadItem,
} from '../types/library'
import {
  readDownloadedAlbumIds,
  writeDownloadedAlbumIds,
} from './library-catalog'
import { toRelativeMediaPath } from './media-paths'

const DOWNLOAD_BATCH_SIZE = 5
const MAX_CONSECUTIVE_ERRORS = 5

function collectLyricImageUrls(music: CatalogMusicRecord): string[] {
  if (!music.lyric) return []

  const entries = Array.isArray(music.lyric)
    ? music.lyric
    : Object.values(music.lyric)

  return entries
    .map((entry) => entry.url_image)
    .filter((url): url is string => Boolean(url))
}

type CollectResult = {
  items: MediaDownloadItem[]
  /** false quando o registro da coletânea/hinário não existe */
  found: boolean
}

async function collectMediaForAlbum(
  album: LibraryAlbum,
  onSongFetched?: (fetched: number, total: number) => void,
): Promise<CollectResult> {
  const musicFiles = new Set<string>()
  const slideFiles = new Set<string>()

  let songRefs: Array<{ id_music: number | string }> = []

  if (album.isHymnal) {
    const hymnalData = await readCatalogRecord<CatalogHymnalEntry[]>(`pt_${album.id}`)
    if (!hymnalData || !Array.isArray(hymnalData)) {
      return { items: [], found: false }
    }
    songRefs = hymnalData
  } else {
    const albumData = await readCatalogRecord<CatalogAlbumRecord>(`album_${album.id}`)
    if (!albumData?.musics || !Array.isArray(albumData.musics)) {
      return { items: [], found: false }
    }
    songRefs = albumData.musics
  }

  const total = songRefs.length
  let fetched = 0

  for (const song of songRefs) {
    fetched += 1
    onSongFetched?.(fetched, total)

    const musicData = await readCatalogRecord<CatalogMusicRecord>(`music_${song.id_music}`)
    if (!musicData) continue

    if (musicData.url_music) musicFiles.add(musicData.url_music)
    if (musicData.url_instrumental_music) {
      musicFiles.add(musicData.url_instrumental_music)
    }
    if (musicData.url_image) slideFiles.add(musicData.url_image)
    collectLyricImageUrls(musicData).forEach((url) => slideFiles.add(url))
  }

  const items: MediaDownloadItem[] = [
    ...[...musicFiles].map((url) => ({ url, type: 'music' as const })),
    ...[...slideFiles].map((url) => ({ url, type: 'slides' as const })),
  ]

  if (album.rawCoverUrl) {
    items.push({ url: album.rawCoverUrl, type: 'covers' })
  }

  return { items, found: true }
}

export type DownloadProgressHooks = {
  onPrepareProgress: (percent: number) => void
  onDownloadProgress: (downloaded: number, total: number, percent: number) => void
  shouldAbort: () => boolean
}

export type DownloadAlbumResult = {
  status: 'downloaded' | 'idle' | 'error'
  failureReason: DownloadFailureReason
  totalErrors: number
}

export async function markAlbumAsDownloaded(
  albumId: LibraryAlbum['id'],
): Promise<void> {
  const manifest = await readDownloadedAlbumIds()
  if (!manifest.includes(albumId)) {
    manifest.push(albumId)
    await writeDownloadedAlbumIds(manifest)
  }
}

export async function unmarkAlbumAsDownloaded(
  albumId: LibraryAlbum['id'],
): Promise<void> {
  const manifest = await readDownloadedAlbumIds()
  await writeDownloadedAlbumIds(manifest.filter((id) => id !== albumId))
}

/**
 * Baixa mídias de uma coletânea (áudios, slides e capa).
 * Progresso: 0–10% preparação do catálogo; 10–100% download.
 */
export async function downloadAlbumMedia(
  album: LibraryAlbum,
  hooks: DownloadProgressHooks,
): Promise<DownloadAlbumResult> {
  const bridge = getDesktopBridge()
  if (!bridge) {
    return { status: 'error', failureReason: 'unknown', totalErrors: 0 }
  }

  hooks.onPrepareProgress(0)

  const { items: allMediaFiles, found } = await collectMediaForAlbum(
    album,
    (fetched, total) => {
      hooks.onPrepareProgress(Math.floor((fetched / total) * 10))
    },
  )

  if (!found) {
    return { status: 'idle', failureReason: null, totalErrors: 0 }
  }

  if (hooks.shouldAbort()) {
    return { status: 'idle', failureReason: 'cancelled', totalErrors: 0 }
  }

  if (allMediaFiles.length === 0) {
    await markAlbumAsDownloaded(album.id)
    return { status: 'downloaded', failureReason: null, totalErrors: 0 }
  }

  let downloaded = 0
  let consecutiveErrors = 0
  let totalErrors = 0

  hooks.onDownloadProgress(0, allMediaFiles.length, 10)

  for (let index = 0; index < allMediaFiles.length; index += DOWNLOAD_BATCH_SIZE) {
    if (hooks.shouldAbort() || !navigator.onLine) {
      if (!navigator.onLine) totalErrors += 1
      break
    }
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) break

    const batch = allMediaFiles.slice(index, index + DOWNLOAD_BATCH_SIZE)

    await Promise.all(
      batch.map(async (media) => {
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) return

        const relativePath = toRelativeMediaPath(media.url)
        const exists = await bridge.media.check(media.type, relativePath)

        if (!exists) {
          const success = await bridge.media.download(
            media.url,
            media.type,
            relativePath,
          )
          if (!success) {
            consecutiveErrors += 1
            totalErrors += 1
            console.warn(
              `[sync] falha ao baixar: ${relativePath} (${consecutiveErrors} consecutivas)`,
            )
            return
          }
          consecutiveErrors = 0
        }

        downloaded += 1
        const percent = 10 + Math.floor((downloaded / allMediaFiles.length) * 90)
        hooks.onDownloadProgress(downloaded, allMediaFiles.length, percent)
      }),
    )
  }

  const abortedByErrors = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS

  if (abortedByErrors || !navigator.onLine) {
    return {
      status: 'error',
      failureReason: !navigator.onLine ? 'offline' : 'server',
      totalErrors,
    }
  }

  if (hooks.shouldAbort()) {
    return { status: 'idle', failureReason: 'cancelled', totalErrors }
  }

  if (totalErrors > 0) {
    console.warn(`[sync] coletânea baixada com ${totalErrors} arquivo(s) faltando`)
  }

  await markAlbumAsDownloaded(album.id)
  return { status: 'downloaded', failureReason: null, totalErrors }
}

/** Remove arquivos de áudio e slides da coletânea (capas permanecem). */
export async function deleteAlbumMedia(album: LibraryAlbum): Promise<void> {
  const bridge = getDesktopBridge()
  if (!bridge) return

  await unmarkAlbumAsDownloaded(album.id)

  try {
    const { items } = await collectMediaForAlbum(album)
    const musicPaths = new Set(
      items.filter((item) => item.type === 'music').map((item) => item.url),
    )
    const slidePaths = new Set(
      items.filter((item) => item.type === 'slides').map((item) => item.url),
    )

    for (const urlPath of musicPaths) {
      await bridge.media.delete('music', toRelativeMediaPath(urlPath))
    }
    for (const urlPath of slidePaths) {
      await bridge.media.delete('slides', toRelativeMediaPath(urlPath))
    }
  } catch (error) {
    console.error('[sync] erro ao apagar arquivos da coletânea', error)
  }
}
