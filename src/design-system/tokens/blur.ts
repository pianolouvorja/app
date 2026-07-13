/**
 * Intensidade de glass / backdrop-blur (configurável).
 * Stitch appearance: blur ~ (intensity/5 + 4)px e fill cresce com o slider.
 */

export const blur = {
  none: '0px',
  low: '8px',
  medium: '16px',
  high: '28px',
  glow: '120px',
  /** Valor inicial sugerido para glassmorphism */
  default: '16px',
} as const

export type BlurToken = keyof typeof blur

/** Intensidade contínua do slider (0 = Suave, 100 = Profundo). Default Stitch ≈ 60. */
export const DEFAULT_GLASS_INTENSITY = 60

const TOKEN_TO_INTENSITY: Record<BlurToken, number> = {
  none: 0,
  low: 25,
  medium: 50,
  default: 60,
  high: 85,
  glow: 100,
}

export function clampGlassIntensity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_GLASS_INTENSITY
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Converte preferência legada (token) ou número para intensidade 0–100. */
export function resolveGlassIntensity(stored: unknown): number {
  if (typeof stored === 'number') return clampGlassIntensity(stored)
  if (typeof stored === 'string' && stored in TOKEN_TO_INTENSITY) {
    return TOKEN_TO_INTENSITY[stored as BlurToken]
  }
  return DEFAULT_GLASS_INTENSITY
}

/**
 * Blur em px (Stitch: val/5 + 4 → 4…24).
 * Ampliado levemente até 28px no máximo para “Profundo”.
 */
export function blurPxFromIntensity(intensity: number): string {
  const value = clampGlassIntensity(intensity)
  return `${Math.round(4 + (value / 100) * 24)}px`
}

/**
 * Opacidade do fill do vidro para color-mix (Suave → mais translúcido).
 * Stitch aproxima alpha 0.3…0.8 → usamos 42%…82%.
 */
export function glassFillFromIntensity(intensity: number): string {
  const value = clampGlassIntensity(intensity)
  return `${Math.round(42 + (value / 100) * 40)}%`
}

/** Token discreto mais próximo (compat BlurContainer / APIs antigas). */
export function blurTokenFromIntensity(intensity: number): BlurToken {
  const value = clampGlassIntensity(intensity)
  if (value <= 12) return 'none'
  if (value <= 35) return 'low'
  if (value <= 70) return 'medium'
  return 'high'
}

export function intensityFromBlurToken(token: BlurToken): number {
  return TOKEN_TO_INTENSITY[token] ?? DEFAULT_GLASS_INTENSITY
}
