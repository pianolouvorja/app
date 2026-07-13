import hymnalCover from '@assets/library/hymnal.jpeg'
import hymnal1996Cover from '@assets/library/hymnal_1996.jpeg'
import { WORKSPACE_RECORD_KEYS } from '@shared/constants/storage-keys'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import {
  readCatalogRecord,
  writeCatalogRecord,
} from '@shared/services/workspace-api'

import type {
  CatalogCategory,
  CatalogHymnalEntry,
  LibraryAlbum,
  LibraryCategory,
} from '../types/library'
import { resolveRemoteFileUrl, toRelativeMediaPath } from './media-paths'

/** Coletâneas excluídas do catálogo (legado). */
const EXCLUDED_ALBUM_IDS = new Set([712, 629])

const CATEGORY_ORDER: Record<string, number> = {
  hymnals: 1,
  Hinários: 1,
  'CDs Oficiais/Ano': 2,
  Infantis: 98,
  Doxologia: 99,
}

async function resolveCoverUrl(urlImage: string | null | undefined): Promise<string | null> {
  if (!urlImage) return null

  const bridge = getDesktopBridge()
  if (bridge) {
    const relativePath = toRelativeMediaPath(urlImage)
    const local = await bridge.media.check('covers', relativePath)
    if (local) return local
  }

  return resolveRemoteFileUrl(urlImage)
}

function createAlbumBase(
  partial: Omit<
    LibraryAlbum,
    | 'progress'
    | 'progressText'
    | 'totalCount'
    | 'downloadedCount'
    | 'cancelRequested'
    | 'songCount'
  > & { songCount?: number | null },
): LibraryAlbum {
  return {
    songCount: null,
    ...partial,
    progress: 0,
    progressText: '',
    totalCount: 0,
    downloadedCount: 0,
    cancelRequested: false,
  }
}

function sortCategories(categories: LibraryCategory[]): LibraryCategory[] {
  return [...categories].sort((a, b) => {
    const orderA = CATEGORY_ORDER[String(a.id)] ?? CATEGORY_ORDER[a.name] ?? 50
    const orderB = CATEGORY_ORDER[String(b.id)] ?? CATEGORY_ORDER[b.name] ?? 50
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

async function buildHymnalCategory(
  downloadedIds: Array<string | number>,
): Promise<LibraryCategory | null> {
  const albums: LibraryAlbum[] = []

  const hymnal = await readCatalogRecord<CatalogHymnalEntry[]>('pt_hymnal')
  if (hymnal && Array.isArray(hymnal) && hymnal.length > 0) {
    albums.push(
      createAlbumBase({
        id: 'hymnal',
        name: 'Hinário Adventista',
        subtitle: '',
        coverUrl: hymnalCover,
        rawCoverUrl: null,
        status: downloadedIds.includes('hymnal') ? 'downloaded' : 'idle',
        isHymnal: true,
        songCount: hymnal.length,
      }),
    )
  }

  const hymnal1996 = await readCatalogRecord<CatalogHymnalEntry[]>('pt_hymnal_1996')
  if (hymnal1996 && Array.isArray(hymnal1996) && hymnal1996.length > 0) {
    albums.push(
      createAlbumBase({
        id: 'hymnal_1996',
        name: 'Hinário Adventista (1996)',
        subtitle: '',
        coverUrl: hymnal1996Cover,
        rawCoverUrl: null,
        status: downloadedIds.includes('hymnal_1996') ? 'downloaded' : 'idle',
        isHymnal: true,
        songCount: hymnal1996.length,
      }),
    )
  }

  if (albums.length === 0) return null

  return {
    id: 'hymnals',
    name: 'Hinários',
    albums,
  }
}

/**
 * Monta a lista de categorias/coletâneas disponíveis para download offline.
 */
export async function loadLibraryCategories(): Promise<LibraryCategory[]> {
  const categories = await readCatalogRecord<CatalogCategory[]>('pt_categories')
  const downloaded =
    (await readCatalogRecord<Array<string | number>>(
      WORKSPACE_RECORD_KEYS.downloadedAlbums,
    )) ?? []

  const result: LibraryCategory[] = []

  const hymnals = await buildHymnalCategory(downloaded)
  if (hymnals) result.push(hymnals)

  if (!categories || !Array.isArray(categories)) {
    return sortCategories(result)
  }

  for (const category of categories) {
    if (!category.albums?.length) continue

    const albums: LibraryAlbum[] = []

    for (const album of category.albums) {
      if (EXCLUDED_ALBUM_IDS.has(album.id_album)) continue

      const coverUrl = await resolveCoverUrl(album.url_image)

      albums.push(
        createAlbumBase({
          id: album.id_album,
          name: album.name,
          subtitle: album.subtitle ?? '',
          coverUrl,
          rawCoverUrl: album.url_image ?? null,
          status: downloaded.includes(album.id_album) ? 'downloaded' : 'idle',
          isHymnal: false,
        }),
      )
    }

    if (albums.length > 0) {
      result.push({
        id: category.id_category,
        name: category.name,
        albums,
      })
    }
  }

  return sortCategories(result)
}

export async function readDownloadedAlbumIds(): Promise<Array<string | number>> {
  return (
    (await readCatalogRecord<Array<string | number>>(
      WORKSPACE_RECORD_KEYS.downloadedAlbums,
    )) ?? []
  )
}

export async function writeDownloadedAlbumIds(
  ids: Array<string | number>,
): Promise<boolean> {
  return writeCatalogRecord(WORKSPACE_RECORD_KEYS.downloadedAlbums, ids)
}
