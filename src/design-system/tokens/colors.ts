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
    surfaceContainer: '#201f1f',
    surfaceContainerHigh: '#2a2a2a',
    surfaceVariant: '#353534',
    onSurface: '#e5e2e1',
    onSurfaceVariant: '#bfc7d4',
    onPrimary: '#003258',
    outline: 'rgba(255, 255, 255, 0.05)',
    outlineStrong: 'rgba(255, 255, 255, 0.10)',
  },

  light: {
    background: '#f8f9ff',
    surface: '#f8f9ff',
    surfaceElevated: '#ffffff',
    surfaceCard: '#ffffff',
    surfaceContainer: '#eeeeef',
    surfaceContainerHigh: '#e8e8ea',
    surfaceVariant: '#dfe3eb',
    onSurface: '#191c20',
    onSurfaceVariant: '#43474e',
    onPrimary: '#ffffff',
    outline: 'rgba(0, 0, 0, 0.06)',
    outlineStrong: 'rgba(0, 0, 0, 0.10)',
  },
} as const

export type ColorPalette = typeof colors
