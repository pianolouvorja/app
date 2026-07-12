/**
 * Espaçamento — grade 8px (Stitch).
 */
export const spacing = {
  unit: '8px',
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  marginPage: '32px',
  gutterGrid: '24px',
  paddingCard: '20px',
  bottomNavHeight: '72px',
} as const

export type SpacingToken = keyof typeof spacing
