import { WORKSPACE_RECORD_KEYS } from '@shared/constants/storage-keys'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import { fetchRemoteCatalogJson } from '@shared/services/remote-catalog'
import {
  clearWorkspace,
  readCatalogRecord,
  writeCatalogRecord,
} from '@shared/services/workspace-api'

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
    message.includes('Falha ao baixar')
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
  await clearWorkspace()
}

export async function syncRemoteConfig(): Promise<void> {
  const config = await fetchRemoteCatalogJson(WORKSPACE_RECORD_KEYS.config)
  await writeCatalogRecord(WORKSPACE_RECORD_KEYS.config, config)
}

export async function downloadAndExtractCatalog(
  onDownloadProgress: (progress: number) => void,
  onExtractProgress: (progress: number, text?: string) => void,
): Promise<void> {
  const bridge = getDesktopBridge()
  if (!bridge) {
    throw new Error('Bridge Electron indisponível')
  }

  const unsubscribeDownload = bridge.catalog.onDownloadProgress((payload) => {
    onDownloadProgress(payload.progress)
  })
  const unsubscribeExtract = bridge.catalog.onExtractProgress((payload) => {
    onExtractProgress(payload.progress, payload.text)
  })

  try {
    try {
      await bridge.catalog.downloadDatabase()
    } catch {
      throw new Error('Falha ao baixar banco de dados')
    }

    try {
      const extracted = await bridge.catalog.extractDatabase()
      if (!extracted) {
        throw new Error('Falha desconhecida ao extrair banco de dados local')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('Falha desconhecida')) throw error
      throw new Error('Erro na extração dos dados locais')
    }
  } finally {
    unsubscribeDownload()
    unsubscribeExtract()
  }
}
