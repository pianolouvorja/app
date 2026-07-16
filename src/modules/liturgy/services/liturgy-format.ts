export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatClock(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export function formatDateBr(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/** Contagem regressiva do evento: HH:MM:SS. */
export function formatCountdown(ms: number): string {
  return formatElapsed(ms)
}

export function formatDurationLabel(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—'
  return formatElapsed(ms)
}
