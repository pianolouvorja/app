import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  clearStageSettings,
  loadStageSettingsOptional,
  resolveStageSettings,
  saveStageSettings,
} from '../services/stage-settings-preferences'
import { notifyStageSettingsChanged } from '../services/stage-settings-runtime'
import {
  DEFAULT_STAGE_SETTINGS,
  STAGE_MODULE_SCOPES,
  type StageSettings,
} from '../types/stage-settings'

type StageScope = string

/**
 * Personalização do Palco por módulo — paridade com o APK
 * (StageCustomizationSheet + StageSettingsRepository).
 *
 * Um escopo ativo por vez na UI; módulo sem override herda o global.
 */
export const useStageSettingsStore = defineStore('settings-stage', () => {
  /** Escopo sendo editado na UI (default: global). */
  const activeScope = ref<StageScope>('global')
  const hydrated = ref(false)

  /** Override do escopo ativo (null = herdando global). */
  const overrides = ref<Partial<Record<StageScope, StageSettings>>>({})

  function hydrate() {
    if (hydrated.value) return
    for (const scope of ['global', ...STAGE_MODULE_SCOPES] as const) {
      overrides.value[scope] = loadStageSettingsOptional(scope) ?? undefined
    }
    hydrated.value = true
  }

  /** Settings EFETIVAS do escopo ativo (override > global > default). */
  const settings = computed<StageSettings>(() => {
    if (activeScope.value !== 'global') {
      const own = overrides.value[activeScope.value]
      if (own) return own
    }
    return overrides.value.global ?? { ...DEFAULT_STAGE_SETTINGS }
  })

  const isInheritingGlobal = computed(
    () => activeScope.value !== 'global' && !overrides.value[activeScope.value],
  )

  function setActiveScope(scope: StageScope) {
    activeScope.value = scope
  }

  function patch(partial: Partial<StageSettings>) {
    const scope = activeScope.value
    const base = scope === 'global' ? settings.value : { ...settings.value }
    const next = { ...base, ...partial }
    // Editar um módulo em herança CRIA o override a partir do global.
    overrides.value = { ...overrides.value, [scope]: next }
    saveStageSettings(scope, next)
    notifyStageSettingsChanged()
  }

  function setBackgroundImage(dataUrl: string | null) {
    patch({ backgroundImage: dataUrl })
  }

  /** Redefinir: apaga o override do escopo (global volta aos defaults). */
  function resetScope() {
    const scope = activeScope.value
    if (scope === 'global') {
      overrides.value = { ...overrides.value, global: { ...DEFAULT_STAGE_SETTINGS } }
      saveStageSettings('global', { ...DEFAULT_STAGE_SETTINGS })
    } else {
      overrides.value = { ...overrides.value, [scope]: undefined }
      clearStageSettings(scope)
    }
    notifyStageSettingsChanged()
  }

  /** Settings efetivas de qualquer módulo (para as views de projeção). */
  function effective(scope: string): StageSettings {
    const own = overrides.value[scope]
    if (own) return own
    return overrides.value.global ?? { ...DEFAULT_STAGE_SETTINGS }
  }

  hydrate()

  return {
    activeScope,
    settings,
    isInheritingGlobal,
    hydrated,
    hydrate,
    setActiveScope,
    patch,
    setBackgroundImage,
    resetScope,
    effective,
    resolve: resolveStageSettings,
  }
})
