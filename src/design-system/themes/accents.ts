/**
 * Acentos de cor da tela de Aparência (Stitch settings/appearance).
 * Sobrescrevem --ds-color-primary / --ds-color-primary-soft em runtime.
 *
 * Para restaurar a paleta anterior: troque `accents` por `accentsLegacy`
 * (ou copie os valores de `accentsLegacy` de volta para `accents`).
 */

/** Paleta anterior (backup) — realces mais vivos/saturados. */
export const accentsLegacy = {
  azure: {
    id: 'azure',
    label: 'Azure',
    primary: '#2196f3',
    soft: '#9ecaff',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    primary: '#0d9488',
    soft: '#78d6d2',
  },
  apricot: {
    id: 'apricot',
    label: 'Apricot',
    primary: '#db7900',
    soft: '#ffb77b',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    primary: '#ea580c',
    soft: '#fb923c',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    primary: '#059669',
    soft: '#34d399',
  },
} as const

/** Paleta atual — tons mais suaves e convencionais de sistema. */
export const accents = {
  azure: {
    id: 'azure',
    label: 'Azul',
    primary: '#5B9BD5',
    soft: '#B4D4F0',
  },
  sky: {
    id: 'sky',
    label: 'Céu',
    primary: '#5BA4C9',
    soft: '#B5D8E8',
  },
  teal: {
    id: 'teal',
    label: 'Verde-água',
    primary: '#4DB6AC',
    soft: '#B2DFDB',
  },
  emerald: {
    id: 'emerald',
    label: 'Verde',
    primary: '#6BAA7A',
    soft: '#B8D9C0',
  },
  apricot: {
    id: 'apricot',
    label: 'Âmbar',
    primary: '#E0A84A',
    soft: '#F0D9A8',
  },
  orange: {
    id: 'orange',
    label: 'Laranja',
    primary: '#E0895A',
    soft: '#F0C4A8',
  },
  coral: {
    id: 'coral',
    label: 'Coral',
    primary: '#D4847A',
    soft: '#F0C0B8',
  },
  rose: {
    id: 'rose',
    label: 'Rosa',
    primary: '#C97B8F',
    soft: '#E8C4CE',
  },
  violet: {
    id: 'violet',
    label: 'Violeta',
    primary: '#8B7BB8',
    soft: '#CDC4E0',
  },
  slate: {
    id: 'slate',
    label: 'Ardósia',
    primary: '#7A8FA3',
    soft: '#C5D0DA',
  },
} as const

export type AccentKey = keyof typeof accents
export type AccentDefinition = (typeof accents)[AccentKey]

export const defaultAccent: AccentKey = 'orange'
