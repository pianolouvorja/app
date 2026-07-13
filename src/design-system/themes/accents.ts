/**
 * Acentos de cor da tela de Aparência (Stitch settings/appearance).
 * Sobrescrevem --ds-color-primary / --ds-color-primary-soft em runtime.
 */
export const accents = {
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

export type AccentKey = keyof typeof accents
export type AccentDefinition = (typeof accents)[AccentKey]

export const defaultAccent: AccentKey = 'azure'
