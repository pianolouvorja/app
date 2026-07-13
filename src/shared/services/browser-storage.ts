type StorageKind = 'local' | 'session'

function resolveStorage(kind: StorageKind): Storage {
  return kind === 'session' ? sessionStorage : localStorage
}

export function setBrowserItem(key: string, data: unknown, kind: StorageKind = 'local'): void {
  const value = typeof data === 'object' ? JSON.stringify(data) : String(data)
  resolveStorage(kind).setItem(key, value)
}

export function getBrowserItem<T = unknown>(
  key: string,
  fallback: T | null = null,
  kind: StorageKind = 'local',
): T | null {
  const raw = resolveStorage(kind).getItem(key)
  if (raw == null) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return raw as T
  }
}

export function removeBrowserItem(key: string, kind: StorageKind = 'local'): void {
  resolveStorage(kind).removeItem(key)
}

export function removeBrowserItemsByPrefix(prefix: string, kind: StorageKind = 'local'): void {
  const storage = resolveStorage(kind)
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)
    if (key?.startsWith(prefix)) {
      storage.removeItem(key)
    }
  }
}
