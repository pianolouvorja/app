/** Detecta janela de projeção (/popup) — espelha o legado `location.href.includes("popup")`. */
export function isProjectionPopupLocation(): boolean {
  if (typeof window === 'undefined') return false
  const href = window.location.href
  const path = window.location.pathname
  return href.includes('#/popup') || path.includes('/popup') || href.includes('/popup?')
}
