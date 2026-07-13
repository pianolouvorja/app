/**
 * Perfis de motion da tela de Aparência (Stitch settings/appearance).
 * `pageTransition` = nome da <Transition> Vue nas trocas de rota.
 */
export const interactions = {
  dynamic: {
    id: 'dynamic',
    duration: '280ms',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    pageTransition: 'page-dynamic',
  },
  soft: {
    id: 'soft',
    duration: '450ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    pageTransition: 'page-fade',
  },
  /** Fade + blur — combina com a estética glass do app. */
  mist: {
    id: 'mist',
    duration: '520ms',
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    pageTransition: 'page-mist',
  },
} as const

export type InteractionKey = keyof typeof interactions
export type InteractionDefinition = (typeof interactions)[InteractionKey]

export const defaultInteraction: InteractionKey = 'soft'
