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
    const downloaded = await bridge.catalog.downloadDatabase()
    if (!downloaded) {
      throw new Error('Falha ao baixar banco de dados')
    }

    const extracted = await bridge.catalog.extractDatabase()
    if (!extracted) {
      throw new Error('Falha ao extrair banco de dados local')
    }
  } finally {
    unsubscribeDownload()
    unsubscribeExtract()
  }
}
