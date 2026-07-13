import { WORKSPACE_RECORD_KEYS } from '@shared/constants/storage-keys'
import { getDesktopBridge, isDesktopApp } from '@shared/services/desktop-bridge'
import {
  readCatalogRecord,
  resolveMediaUrl,
  writeCatalogRecord,
} from '@shared/services/workspace-api'

type CategoryAlbum = {
  url_image?: string | null
}

type CategoryRow = {
  albums?: CategoryAlbum[]
}

let isRunning = false

/**
 * Após o boot, baixa capas ausentes em background (comportamento do legado).
 */
export async function startCoverBackgroundSync(): Promise<void> {
  if (!isDesktopApp() || isRunning) return

  const bridge = getDesktopBridge()
  if (!bridge) return

  try {
    isRunning = true

    const alreadySynced = await readCatalogRecord<{ complete?: boolean }>(
      WORKSPACE_RECORD_KEYS.coversSynced,
    )
    if (alreadySynced?.complete) return

    const categories = await readCatalogRecord<CategoryRow[]>('pt_categories')
    if (!categories || !Array.isArray(categories)) return

    const allImages = new Set<string>()
    for (const category of categories) {
      category.albums?.forEach((album) => {
        if (album.url_image) allImages.add(album.url_image)
      })
    }

    const missing: string[] = []
    for (const urlImage of allImages) {
      const relativePath = urlImage.replace(/^\/(musics|images|covers)\//, '')
      const exists = await bridge.media.check('covers', relativePath)
      if (!exists) missing.push(urlImage)
    }

    if (missing.length === 0) {
      await writeCatalogRecord(WORKSPACE_RECORD_KEYS.coversSynced, { complete: true })
      return
    }

    const batchSize = 5
    for (let index = 0; index < missing.length; index += batchSize) {
      if (!navigator.onLine) break

      const batch = missing.slice(index, index + batchSize)
      await Promise.all(
        batch.map(async (urlImage) => {
          const filename = urlImage.split('/').pop()
          if (!filename) return
          const fullUrl = resolveMediaUrl(urlImage)
          await bridge.media.download(fullUrl, 'covers', filename)
        }),
      )

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    await writeCatalogRecord(WORKSPACE_RECORD_KEYS.coversSynced, { complete: true })
  } catch (error) {
    console.warn('[starting] sync de capas interrompida', error)
  } finally {
    isRunning = false
  }
}
