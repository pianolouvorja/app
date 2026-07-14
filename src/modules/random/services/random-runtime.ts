import {
  DEFAULT_RANDOM_RUNTIME,
  type RandomRuntimeState,
} from '../types/random'

export const RANDOM_RUNTIME_CHANNEL = 'louvorja-random-runtime'
export const RANDOM_RUNTIME_STORAGE_KEY = 'louvorja-random-runtime-state'

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizeRandomRuntime(raw: unknown): RandomRuntimeState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_RANDOM_RUNTIME }
  }

  const source = raw as Record<string, unknown>

  return {
    currentDisplay: asString(source.currentDisplay, ''),
    isDrawing: source.isDrawing === true,
  }
}

export function readRandomRuntimeFromStorage(): RandomRuntimeState {
  try {
    const raw = localStorage.getItem(RANDOM_RUNTIME_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_RANDOM_RUNTIME }
    return normalizeRandomRuntime(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_RANDOM_RUNTIME }
  }
}

export function writeRandomRuntimeToStorage(state: RandomRuntimeState): void {
  try {
    localStorage.setItem(RANDOM_RUNTIME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage pode falhar em contextos restritos
  }
}

export function publishRandomRuntime(state: RandomRuntimeState): void {
  writeRandomRuntimeToStorage(state)

  try {
    const channel = new BroadcastChannel(RANDOM_RUNTIME_CHANNEL)
    channel.postMessage(state)
    channel.close()
  } catch {
    // BroadcastChannel pode não existir em ambientes antigos
  }
}
