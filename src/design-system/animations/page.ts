/**
 * Tokens de transição entre telas (RouterView).
 * Classes CSS em `styles/base.css`.
 */
export const pageTransition = {
  fade: {
    name: 'page-fade',
    durationMs: 450,
  },
  dynamic: {
    name: 'page-dynamic',
    durationMs: 280,
  },
  mist: {
    name: 'page-mist',
    durationMs: 520,
  },
} as const
