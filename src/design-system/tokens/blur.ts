/**
 * Intensidade de glass / backdrop-blur (configurável).
 * Stitch: bottom nav ~12–16px; overlays ~24px.
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
