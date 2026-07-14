import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'

import {
  DEFAULT_PROJECTION_SETTINGS,
  type LyricFontWeight,
  type LyricVerticalAlign,
  type MonitorArrangementSlot,
  type ProjectionSettings,
} from '../types/projection'

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number')
}

function asArrangement(value: unknown): MonitorArrangementSlot[] {
  if (!Array.isArray(value)) return []
  const slots: MonitorArrangementSlot[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const displayId = row.displayId
    const x = row.x
    const y = row.y
    if (typeof displayId !== 'number' || !Number.isFinite(displayId)) continue
    if (typeof x !== 'number' || !Number.isFinite(x)) continue
    if (typeof y !== 'number' || !Number.isFinite(y)) continue
    slots.push({ displayId, x, y })
  }
  return slots
}

function asAlign(value: unknown): LyricVerticalAlign {
  if (value === 'top' || value === 'center' || value === 'bottom') return value
  // Compatibilidade com legado (Cima/Centro/Baixo)
  if (value === 'Cima') return 'top'
  if (value === 'Centro') return 'center'
  if (value === 'Baixo') return 'bottom'
  return DEFAULT_PROJECTION_SETTINGS.lyricAlign
}

function asFontWeight(value: unknown): LyricFontWeight {
  if (
    value === '400' ||
    value === '600' ||
    value === '700' ||
    value === '900'
  ) {
    return value
  }
  return DEFAULT_PROJECTION_SETTINGS.fontWeight
}

function normalizeSettings(raw: unknown): ProjectionSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PROJECTION_SETTINGS }
  }

  const source = raw as Record<string, unknown>

  return {
    targetDisplayIds: asNumberArray(source.targetDisplayIds),
    declinedDisplayIds: asNumberArray(source.declinedDisplayIds),
    monitorArrangement: asArrangement(source.monitorArrangement),
    openFullscreenOnPrimary: asBoolean(
      source.openFullscreenOnPrimary,
      DEFAULT_PROJECTION_SETTINGS.openFullscreenOnPrimary,
    ),
    disablePrimaryWhenExtended: asBoolean(
      source.disablePrimaryWhenExtended,
      DEFAULT_PROJECTION_SETTINGS.disablePrimaryWhenExtended,
    ),
    autoMinimizePlayer: asBoolean(
      source.autoMinimizePlayer,
      DEFAULT_PROJECTION_SETTINGS.autoMinimizePlayer,
    ),
    lyricAlign: asAlign(source.lyricAlign),
    showSongTitle: asBoolean(
      source.showSongTitle,
      DEFAULT_PROJECTION_SETTINGS.showSongTitle,
    ),
    customTextFormat: asBoolean(
      source.customTextFormat,
      DEFAULT_PROJECTION_SETTINGS.customTextFormat,
    ),
    customBackground: asBoolean(
      source.customBackground,
      DEFAULT_PROJECTION_SETTINGS.customBackground,
    ),
    fontSizePercent: Math.min(
      200,
      Math.max(
        50,
        asNumber(source.fontSizePercent, DEFAULT_PROJECTION_SETTINGS.fontSizePercent),
      ),
    ),
    fontColor: asString(source.fontColor, DEFAULT_PROJECTION_SETTINGS.fontColor),
    fontWeight: asFontWeight(source.fontWeight),
    backgroundColor: asString(
      source.backgroundColor,
      DEFAULT_PROJECTION_SETTINGS.backgroundColor,
    ),
    backgroundImage:
      typeof source.backgroundImage === 'string' ? source.backgroundImage : null,
    backgroundOpacity: Math.min(
      100,
      Math.max(
        0,
        asNumber(
          source.backgroundOpacity,
          DEFAULT_PROJECTION_SETTINGS.backgroundOpacity,
        ),
      ),
    ),
  }
}

export function loadProjectionSettings(): ProjectionSettings {
  const stored = getUserPreference<unknown>(
    USER_PREFERENCE_KEYS.projectionSettings,
    null,
  )
  return normalizeSettings(stored)
}

export function saveProjectionSettings(settings: ProjectionSettings): void {
  setUserPreference(USER_PREFERENCE_KEYS.projectionSettings, settings)
}

/**
 * Monitores estendidos novos entram selecionados, salvo se o operador já
 * os tiver desmarcado (declinedDisplayIds).
 */
export function reconcileTargetDisplays(
  settings: ProjectionSettings,
  extendedDisplayIds: number[],
): ProjectionSettings {
  const declined = new Set(settings.declinedDisplayIds)
  const current = new Set(settings.targetDisplayIds)
  let changed = false

  for (const id of extendedDisplayIds) {
    if (!current.has(id) && !declined.has(id)) {
      current.add(id)
      changed = true
    }
  }

  const nextTargets = [...current].filter((id) => extendedDisplayIds.includes(id))
  const nextDeclined = settings.declinedDisplayIds.filter((id) =>
    extendedDisplayIds.includes(id),
  )

  if (
    !changed &&
    nextTargets.length === settings.targetDisplayIds.length &&
    nextDeclined.length === settings.declinedDisplayIds.length
  ) {
    return settings
  }

  return {
    ...settings,
    targetDisplayIds: nextTargets,
    declinedDisplayIds: nextDeclined,
  }
}

export function toggleTargetDisplay(
  settings: ProjectionSettings,
  displayId: number,
): ProjectionSettings {
  const selected = settings.targetDisplayIds.includes(displayId)

  if (selected) {
    return {
      ...settings,
      targetDisplayIds: settings.targetDisplayIds.filter((id) => id !== displayId),
      declinedDisplayIds: settings.declinedDisplayIds.includes(displayId)
        ? settings.declinedDisplayIds
        : [...settings.declinedDisplayIds, displayId],
    }
  }

  return {
    ...settings,
    targetDisplayIds: [...settings.targetDisplayIds, displayId],
    declinedDisplayIds: settings.declinedDisplayIds.filter((id) => id !== displayId),
  }
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('invalid image result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}
