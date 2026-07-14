import {
  RANDOM_ANIMATION_PROFILES,
  RANDOM_MAX_RANGE_SIZE,
  type RandomAnimationSpeed,
} from '../types/random'

export function pickRandomItem<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null
  const index = Math.floor(Math.random() * items.length)
  return items[index] ?? null
}

export function parseNameListFromText(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of text.split(/\r?\n/)) {
    const name = line.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }

  return result
}

export function mergeUniqueNames(
  existing: readonly string[],
  incoming: readonly string[],
): { next: string[]; addedCount: number } {
  const seen = new Set(existing)
  const next = [...existing]
  let addedCount = 0

  for (const name of incoming) {
    const trimmed = name.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    next.push(trimmed)
    addedCount++
  }

  return { next, addedCount }
}

export type NumberRangeResult =
  | { ok: true; values: string[] }
  | { ok: false; reason: 'invalid' | 'tooLarge' }

export function buildNumberRange(minRaw: number, maxRaw: number): NumberRangeResult {
  const min = Math.trunc(minRaw)
  const max = Math.trunc(maxRaw)

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return { ok: false, reason: 'invalid' }
  }

  if (max - min > RANDOM_MAX_RANGE_SIZE) {
    return { ok: false, reason: 'tooLarge' }
  }

  const values: string[] = []
  for (let i = min; i <= max; i++) {
    values.push(String(i))
  }

  return { ok: true, values }
}

export function remainingCandidates(
  available: readonly string[],
  drawn: readonly string[],
): string[] {
  const drawnSet = new Set(drawn)
  return available.filter((item) => !drawnSet.has(item))
}

export interface DrawAnimationCallbacks {
  onTick: (candidate: string) => void
  onFinish: (winner: string) => void
}

/**
 * Animação de sorteio com desaceleração no final.
 * Retorna função para cancelar o timer pendente.
 */
export function runDrawAnimation(
  pool: readonly string[],
  speed: RandomAnimationSpeed,
  callbacks: DrawAnimationCallbacks,
): () => void {
  const profile = RANDOM_ANIMATION_PROFILES[speed]
  let ticks = 0
  let intervalMs = profile.intervalMs
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  const tick = () => {
    if (cancelled || pool.length === 0) return

    ticks++
    const candidate = pickRandomItem(pool)
    if (candidate != null) {
      callbacks.onTick(candidate)
    }

    if (ticks < profile.maxTicks) {
      if (ticks > profile.maxTicks * profile.slowdownAfterRatio) {
        intervalMs += profile.slowdownStepMs
      }
      timeoutId = setTimeout(tick, intervalMs)
      return
    }

    const winner = pickRandomItem(pool)
    if (winner != null) {
      callbacks.onFinish(winner)
    }
  }

  timeoutId = setTimeout(tick, intervalMs)

  return () => {
    cancelled = true
    if (timeoutId != null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
}
