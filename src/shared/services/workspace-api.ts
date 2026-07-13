import { BROWSER_STORAGE_KEYS } from '@shared/constants/storage-keys'
import { getBrowserItem, setBrowserItem } from '@shared/services/browser-storage'
import { getDesktopBridge, isDesktopApp } from '@shared/services/desktop-bridge'

function sessionCacheKey(filename: string): string {
  return `${BROWSER_STORAGE_KEYS.catalogSessionPrefix}${filename}`
}

export async function readCatalogRecord<T = unknown>(filename: string): Promise<T | null> {
  const cached = getBrowserItem<T>(sessionCacheKey(filename), null, 'session')
  if (cached != null) return cached

  const bridge = getDesktopBridge()
  if (!bridge) return null

  const data = await bridge.workspace.getRecord<T>(filename)
  if (data != null) {
    setBrowserItem(sessionCacheKey(filename), data, 'session')
  }
  return data
}

export async function writeCatalogRecord(filename: string, data: unknown): Promise<boolean> {
  const bridge = getDesktopBridge()
  if (!bridge) return false

  const saved = await bridge.workspace.saveRecord(filename, data)
  if (saved) {
    setBrowserItem(sessionCacheKey(filename), data, 'session')
  }
  return saved
}

export async function clearWorkspace(): Promise<boolean> {
  const bridge = getDesktopBridge()
  if (!bridge) return false
  return bridge.workspace.clear()
}

export function resolveMediaUrl(relativePath: string): string {
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath

  if (isDesktopApp()) {
    return `local://media/${cleanPath}`
  }

  const base = import.meta.env.VITE_URL_FILES ?? 'https://api.louvorja.com.br/file'
  return `${base}/${cleanPath}`
}

export function resolveDatabaseUrl(relativePath: string): string {
  const base = import.meta.env.VITE_URL_DATABASE ?? 'https://api.louvorja.com.br/json_db'
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${base}${path}`
}
