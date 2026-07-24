import { etherealLumens } from './ethereal'
import { luminousClarity } from './luminous'

export const themes = {
  etherealLumens,
  luminousClarity,
} as const

export type ThemeKey = keyof typeof themes
export type ThemeDefinition = (typeof themes)[ThemeKey]
export type ThemeId = ThemeDefinition['id']

export const defaultTheme: ThemeKey = 'etherealLumens'

export {
  type AccentDefinition,
  type AccentKey,
  accents,
  accentsLegacy,
  defaultAccent,
} from './accents'
export {
  defaultInteraction,
  type InteractionDefinition,
  type InteractionKey,
  interactions,
} from './interactions'
export { etherealLumens, luminousClarity }
