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

export { etherealLumens, luminousClarity }
export {
  accents,
  accentsLegacy,
  defaultAccent,
  type AccentDefinition,
  type AccentKey,
} from './accents'
export {
  interactions,
  defaultInteraction,
  type InteractionDefinition,
  type InteractionKey,
} from './interactions'
