/**
 * Raios de borda (Stitch / PRD).
 * Fonte: docs/prd/DESIGN_SYSTEM.md · docs/stitch/home/DESIGN.md
 *
 * Assimetria de marca: arredondado no superior esquerdo e inferior direito;
 * canto superior direito e inferior esquerdo retos (0).
 * Formato CSS: top-left | top-right | bottom-right | bottom-left
 */
export const radius = {
  /** ROUND_EIGHT — inputs, botões, containers pequenos */
  eight: '8px 0 8px 0',
  sm: '8px 0 8px 0',
  md: '12px 0 12px 0',
  /** Cards / containers grandes (Stitch) */
  lg: '16px 0 16px 0',
  xl: '24px 0 24px 0',
  full: '9999px',
} as const

export type RadiusToken = keyof typeof radius
