import {
  DEFAULT_STAGE_SETTINGS,
  STAGE_MODULE_SCOPES,
  parseStageSettings,
  type StageSettings,
} from '../types/stage-settings'

/**
 * Runtime de StageSettings para VIEWS DE PROJEÇÃO (popups), que rodam fora
 * da app principal e não têm pinia ativo: lê direto do user_data
 * (localStorage) + BroadcastChannel para aplicar mudanças em tempo real.
 */

const STAGE_CHANNEL = 'louvorja-stage-settings'

type Scope = string

function readScope(scope: Scope): StageSettings | null {
  try {
    const raw = localStorage.getItem('user_data')
    if (!raw) return null
    const prefs = JSON.parse(raw) as Record<string, unknown>
    const stored = prefs[`stage.settings.${scope}`]
    if (!stored || typeof stored !== 'object') return null
    return parseStageSettings(stored)
  } catch {
    return null
  }
}

/** Settings efetivas do módulo (override > global > default). */
export function readEffectiveStageSettings(scope: string): StageSettings {
  if (!STAGE_MODULE_SCOPES.includes(scope)) {
    // escopo desconhecido → defaults (defensive)
    return { ...DEFAULT_STAGE_SETTINGS }
  }
  return readScope(scope) ?? readScope('global') ?? { ...DEFAULT_STAGE_SETTINGS }
}

/** Assina mudanças de settings (mesma origem). Retorna unsubscribe. */
export function subscribeStageSettings(callback: () => void): () => void {
  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(STAGE_CHANNEL)
    channel.addEventListener('message', callback)
  } catch {
    channel = null
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'user_data') callback()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', callback)
    channel?.close()
  }
}

/** Notifica popups que as settings mudaram (chamado pelo store na app). */
export function notifyStageSettingsChanged(): void {
  try {
    const channel = new BroadcastChannel(STAGE_CHANNEL)
    channel.postMessage('changed')
    channel.close()
  } catch {
    // popups caem no listener de storage
  }
}
