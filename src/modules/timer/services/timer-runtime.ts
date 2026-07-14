import {
  DEFAULT_TIMER_RUNTIME,
  type TimerRuntimeState,
  type TimerStatus,
} from '../types/timer'

export const TIMER_RUNTIME_CHANNEL = 'louvorja-timer-runtime'
export const TIMER_RUNTIME_STORAGE_KEY = 'louvorja-timer-runtime-state'

function asStatus(value: unknown): TimerStatus {
  if (value === 'running' || value === 'paused' || value === 'idle') return value
  return DEFAULT_TIMER_RUNTIME.status
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

export function normalizeTimerRuntime(raw: unknown): TimerRuntimeState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TIMER_RUNTIME, savedTimesMs: [] }
  }

  const source = raw as Record<string, unknown>

  return {
    status: asStatus(source.status),
    segmentStartedAt: asNumberOrNull(source.segmentStartedAt),
    accumulatedMs: asNumber(source.accumulatedMs, 0),
    savedTimesMs: asNumberArray(source.savedTimesMs),
  }
}

export function readTimerRuntimeFromStorage(): TimerRuntimeState {
  try {
    // localStorage: compartilhado entre a janela principal e as popups de projeção
    const raw = localStorage.getItem(TIMER_RUNTIME_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_TIMER_RUNTIME, savedTimesMs: [] }
    return normalizeTimerRuntime(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_TIMER_RUNTIME, savedTimesMs: [] }
  }
}

export function writeTimerRuntimeToStorage(state: TimerRuntimeState): void {
  try {
    localStorage.setItem(TIMER_RUNTIME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage pode falhar em contextos restritos
  }
}

export function publishTimerRuntime(state: TimerRuntimeState): void {
  writeTimerRuntimeToStorage(state)

  try {
    const channel = new BroadcastChannel(TIMER_RUNTIME_CHANNEL)
    channel.postMessage(state)
    channel.close()
  } catch {
    // BroadcastChannel pode não existir em ambientes antigos
  }
}
