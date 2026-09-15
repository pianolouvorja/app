import { WORKSPACE_RECORD_KEYS } from '@shared/constants/storage-keys'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import { fetchRemoteCatalogJson } from '@shared/services/remote-catalog'
import {
  clearWorkspace,
  readCatalogRecord,
  writeCatalogRecord,
} from '@shared/services/workspace-api'
import { getCurrentApiPrefix } from '@modules/sync/services/library-catalog'

export type BootstrapCompleteFlag = {
  complete: boolean
}

export function mapBootstrapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'starting.status.errorOffline'
  }
  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return 'starting.status.errorRateLimit'
  }
  if (message.includes('Bridge Electron') || message.includes('indisponível')) {
    return 'starting.status.bridgeMissing'
  }
  if (
    message.includes('baixar banco') ||
    message.includes('Falha ao baixar') ||
    message.includes('api-fallback') ||
    message.includes('api-exhausted')
  ) {
    return 'starting.status.errorDownload'
  }
  if (
    message.includes('extrair') ||
    message.includes('extração') ||
    message.includes('Arquivo não encontrado')
  ) {
    return 'starting.status.errorExtract'
  }
  if (message.includes('Servidor retornou erro')) {
    return 'starting.status.errorServer'
  }

  return 'starting.status.error'
}

export async function isBootstrapComplete(): Promise<boolean> {
  const flag = await readCatalogRecord<BootstrapCompleteFlag>(
    WORKSPACE_RECORD_KEYS.bootstrapComplete,
  )
  return Boolean(flag?.complete)
}

export async function markBootstrapComplete(): Promise<void> {
  await writeCatalogRecord(WORKSPACE_RECORD_KEYS.bootstrapComplete, { complete: true })
}

export async function prepareFreshInstall(): Promise<void> {
  // Preserva Media (capas/músicas) se já existir de outra instalação no mesmo path.
  await clearWorkspace({ preserveMedia: true })
}

export async function syncRemoteConfig(): Promise<void> {
  const config = await fetchRemoteCatalogJson(WORKSPACE_RECORD_KEYS.config)
  await writeCatalogRecord(WORKSPACE_RECORD_KEYS.config, config)
}

/**
 * First-boot via API Piano (`/json_db`): índices essenciais em disco.
 * Substitui o pipeline legado FTP + SQLite + CatalogExtractor.
 * Detalhes (`music_*`, `album_*`, capítulos bíblia) ficam on-demand.
 */
export async function syncEssentialCatalogFromApi(
  onProgress: (progress: number) => void,
): Promise<void> {
  const lang = getCurrentApiPrefix()
  const files = [
    `${lang}_categories`,
    `${lang}_hymnal`,
    `${lang}_hymnal_1996`,
    `${lang}_musics`,
    `${lang}_bible_book`,
    `${lang}_bible_version`,
  ]

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const data = await fetchRemoteCatalogJson(file)
    const saved = await writeCatalogRecord(file, data)
    if (!saved && !getDesktopBridge()) {
      throw new Error('Bridge Electron indisponível')
    }
    if (!saved) {
      throw new Error(`Falha ao gravar catálogo local: ${file}`)
    }
    onProgress(Math.round(((i + 1) / files.length) * 100))
  }
}

/** @deprecated Use syncEssentialCatalogFromApi — mantido só por compat de imports. */
export async function downloadAndExtractCatalog(
  onDownloadProgress: (progress: number) => void,
  _onExtractProgress: (progress: number, text?: string) => void,
): Promise<void> {
  await syncEssentialCatalogFromApi(onDownloadProgress)
}
