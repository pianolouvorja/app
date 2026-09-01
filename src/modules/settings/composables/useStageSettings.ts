import { storeToRefs } from 'pinia'

import { useStageSettingsStore } from '../stores/useStageSettingsStore'
import type { StageModuleScope, StageSettings } from '../types/stage-settings'

/** Fachada da Personalização do Palco para views/componentes. */
export function useStageSettings() {
  const store = useStageSettingsStore()
  const { settings, activeScope, isInheritingGlobal } = storeToRefs(store)

  return {
    settings,
    activeScope,
    isInheritingGlobal,
    setActiveScope: store.setActiveScope,
    patch: store.patch,
    setBackgroundImage: store.setBackgroundImage,
    resetScope: store.resetScope,
    effective: (scope: StageModuleScope): StageSettings => store.effective(scope),
  }
}
