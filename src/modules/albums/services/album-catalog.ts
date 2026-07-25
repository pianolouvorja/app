import hymnalCover from '@assets/library/hymnal.jpeg'
import hymnal1996Cover from '@assets/library/hymnal_1996.jpeg'
import { fetchRemoteCatalogJson } from '@shared/services/remote-catalog'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import { readCatalogRecord } from '@shared/services/workspace-api'

import type { AlbumCategory, AlbumCollection } from '../types/albums'

/** Coletâneas excluídas do catálogo (mesmo critério da biblioteca). */
const EXCLUDED_ALBUM_IDS = new Set([712, 629])

type CatalogCategoryAlbum = {
  id_album: number | string
  name?: string
  subtitle?: string
  url_image?: string | null
}

type CatalogCategory = {
  id_category?: number | string
  name?: string
  albums?: CatalogCategoryAlbum[]
}

type CatalogHymnalEntry = {
  id_music?: number | string
}

function toRelativeCoverPath(urlPath: string): string {
  return urlPath.replace(/^\/(musics|images|covers)\//, '')
}

function resolveRemoteCoverUrl(urlPath: string): string {
  const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath
  const base = import.meta.env.VITE_URL_FILES ?? 'https://api.louvorja.com.br/file'
  return `${base}/${cleanPath}`
}

async function readOrFetchCatalog<T>(filename: string): Promise<T | null> {
  const local = await readCatalogRecord<T>(filename)
  if (local != null) return local

  try {
    return await fetchRemoteCatalogJson<T>(filename)
  } catch (error) {
    console.warn(`[albums] falha ao obter catálogo ${filename}`, error)
    return null
  }
}

async function resolveCoverUrl(urlImage: string | null | undefined): Promise<string | null> {
  if (!urlImage) return null

  const bridge = getDesktopBridge()
  if (bridge) {
    const relativePath = toRelativeCoverPath(urlImage)
    const local = await bridge.media.check('covers', relativePath)
    if (local) return local
  }

  return resolveRemoteCoverUrl(urlImage)
}

async function buildHymnalCollections(): Promise<AlbumCollection[]> {
  const collections: AlbumCollection[] = []

  const hymnal = await readOrFetchCatalog<CatalogHymnalEntry[]>('pt_hymnal')
  if (Array.isArray(hymnal) && hymnal.length > 0) {
    collections.push({
      id: 'hymnal',
      kind: 'hymnal',
      name: 'Hinário Adventista',
      subtitle: '',
      coverUrl: hymnalCover,
      trackCount: hymnal.length,
      catalogKey: 'pt_hymnal',
    })
  }

  const hymnal1996 = await readOrFetchCatalog<CatalogHymnalEntry[]>('pt_hymnal_1996')
  if (Array.isArray(hymnal1996) && hymnal1996.length > 0) {
    collections.push({
      id: 'hymnal_1996',
      kind: 'hymnal',
      name: 'Hinário Adventista - Edição 1996',
      subtitle: '',
      coverUrl: hymnal1996Cover,
      trackCount: hymnal1996.length,
      catalogKey: 'pt_hymnal_1996',
    })
  }

  return collections
}

/** Catálogo de hinários e coletâneas para navegação no módulo Álbuns. */
export async function loadAlbumCategories(): Promise<AlbumCategory[]> {
  const result: AlbumCategory[] = []

  const hymnals = await buildHymnalCollections()
  if (hymnals.length > 0) {
    result.push({
      id: 'hymnals',
      name: 'Hinários',
      collections: hymnals,
    })
  }

  const categories = await readOrFetchCatalog<CatalogCategory[]>('pt_categories')
  if (!Array.isArray(categories)) return result

  for (const category of categories) {
    if (!category.albums?.length) continue

    const collections: AlbumCollection[] = []

    for (const album of category.albums) {
      const albumId = Number(album.id_album)
      if (!Number.isFinite(albumId) || EXCLUDED_ALBUM_IDS.has(albumId)) continue

      const name = String(album.name ?? '').trim()
      if (!name) continue

      collections.push({
        id: albumId,
        kind: 'album',
        name,
        subtitle: String(album.subtitle ?? '').trim(),
        coverUrl: await resolveCoverUrl(album.url_image),
        trackCount: null,
        catalogKey: `album_${albumId}`,
      })
    }

    if (collections.length > 0) {
      result.push({
        id: category.id_category ?? category.name ?? collections[0]!.id,
        name: String(category.name ?? '').trim() || 'Coletâneas',
        collections,
      })
    }
  }

  return result
}

export function findCollectionById(
  categories: AlbumCategory[],
  collectionId: string,
): AlbumCollection | null {
  for (const category of categories) {
    for (const collection of category.collections) {
      if (String(collection.id) === collectionId) return collection
    }
  }
  return null
}
