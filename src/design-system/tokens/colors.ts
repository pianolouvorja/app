/**
 * Cores do design system (Stitch / Ethereal Lumens).
 * Fonte: docs/stitch/home/DESIGN.md · docs/prd/DESIGN_SYSTEM.md
 */
export const colors = {
  /** Ação / destaque (PRD) */
  primary: '#2196f3',
  /** Texto de marca em dark (Stitch primary soft) */
  primarySoft: '#9ecaff',
  secondary: '#78d6d2',
  brandBlueAlt: '#0097D7',
  /** Amarelo do logo oficial */
  brandYellow: '#F8C800',

  dark: {
    background: '#131313',
    surface: '#131313',
    surfaceElevated: '#1E1E1E',
    surfaceCard: '#242424',
    onSurface: '#e5e2e1',
    onSurfaceVariant: '#bfc7d4',
    outline: 'rgba(255, 255, 255, 0.05)',
    outlineStrong: 'rgba(255, 255, 255, 0.10)',
  },

  light: {
    background: '#f7f8fb',
    surface: '#f4f5f8',
    surfaceElevated: '#ffffff',
    surfaceCard: '#ffffff',
    onSurface: '#1c1b1b',
    onSurfaceVariant: '#404752',
    outline: 'rgba(0, 0, 0, 0.06)',
    outlineStrong: 'rgba(0, 0, 0, 0.10)',
  },
} as const

export type ColorPalette = typeof colors
