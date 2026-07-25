import { computed } from 'vue'

import { useThemeManager } from './useThemeManager'

/**
 * Nome da Transition Vue conforme Interações (Dinâmico / Suave).
 * Suave → fade; Dinâmico → fade + leve escala/deslocamento.
 */
export function usePageTransition() {
  const { interactionKey, currentInteraction } = useThemeManager()

  const transitionName = computed(
    () => currentInteraction.value.pageTransition,
  )

  const isSoft = computed(() => interactionKey.value === 'soft')

  return {
    transitionName,
    isSoft,
    interactionKey,
  }
}
