import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'
import { getBrowserItem, setBrowserItem } from '@shared/services/browser-storage'

import {
  createEmptySessionTimes,
  createEmptyWeekdayLiturgies,
  createEmptyWeekdayNotes,
  createEmptyWeekdaySessionTimes,
  DEFAULT_MOMENT_DURATION_MS,
  getTypeDotColor,
  LITURGY_WEEKDAYS,
  type CustomLiturgy,
  type LiturgyItem,
  type LiturgyPersistedState,
  type LiturgySessionTimes,
  type LiturgyWeekday,
  type WeekdayLiturgies,
  type WeekdayNotes,
  type WeekdaySessionTimes,
} from '../types/liturgy'
import {
  clearDoneFlags,
  clampMomentDurationMs,
  createLiturgyItemId,
  normalizeItemType,
} from './liturgy-item-helpers'

const CHECKS_CLEARED_KEY = 'liturgy_checks_cleared'

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeItem(raw: unknown): LiturgyItem | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const type = normalizeItemType(source.type)
  if (!type) return null

  const name = asString(source.name).trim()
  if (!name) return null

  const durationRaw = asNumberOrNull(source.durationMs)
  const durationMs =
    type === 'category'
      ? 0
      : type === 'music'
        ? durationRaw != null && durationRaw > 0
          ? clampMomentDurationMs(durationRaw)
          : 0
        : clampMomentDurationMs(durationRaw ?? DEFAULT_MOMENT_DURATION_MS)

  return {
    id: asString(source.id) || createLiturgyItemId(),
    type,
    name,
    subtitle: asString(source.subtitle),
    done: Boolean(source.done),
    durationMs,
    accentColor: getTypeDotColor(type),
    categoryId:
      type === 'category' ? null : asString(source.categoryId) || null,
    startTime:
      type === 'category'
        ? normalizeTimeHHmm(source.startTime)
        : null,
    endTime:
      type === 'category'
        ? normalizeTimeHHmm(source.endTime)
        : null,
    complementaryTitle: asString(source.complementaryTitle).trim() || undefined,
    notes: asString(source.notes).trim() || undefined,
    musicId: asNumberOrNull(source.musicId),
    musicMode: source.musicMode === 'instrumental' ? 'instrumental' : 'audio',
    verseBookId: asNumberOrNull(source.verseBookId),
    verseChapter: asNumberOrNull(source.verseChapter),
    verseNumbers: asString(source.verseNumbers),
    filePath: asString(source.filePath),
    filePaths: (() => {
      if (Array.isArray(source.filePaths)) {
        return source.filePaths
          .map((entry) => asString(entry).trim())
          .filter(Boolean)
      }
      const single = asString(source.filePath).trim()
      return single ? [single] : undefined
    })(),
    url: asString(source.url),
  }
}

function normalizeItems(raw: unknown): LiturgyItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => normalizeItem(entry))
    .filter((entry): entry is LiturgyItem => entry != null)
}

function normalizeWeekdays(raw: unknown): WeekdayLiturgies {
  const base = createEmptyWeekdayLiturgies()
  if (!raw || typeof raw !== 'object') return base

  const source = raw as Record<string, unknown>
  for (const day of LITURGY_WEEKDAYS) {
    base[day] = normalizeItems(source[day])
  }
  return base
}

function normalizeTimeHHmm(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return null
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeSessionTimes(raw: unknown): LiturgySessionTimes {
  if (!raw || typeof raw !== 'object') return createEmptySessionTimes()
  const source = raw as Record<string, unknown>
  return {
    startTime: normalizeTimeHHmm(source.startTime),
    endTime: normalizeTimeHHmm(source.endTime),
  }
}

function normalizeWeekdaySessionTimes(raw: unknown): WeekdaySessionTimes {
  const base = createEmptyWeekdaySessionTimes()
  if (!raw || typeof raw !== 'object') return base
  const source = raw as Record<string, unknown>
  for (const day of LITURGY_WEEKDAYS) {
    base[day] = normalizeSessionTimes(source[day])
  }
  return base
}

function normalizeNotes(raw: unknown): WeekdayNotes {
  const base = createEmptyWeekdayNotes()
  if (!raw || typeof raw !== 'object') return base

  const source = raw as Record<string, unknown>
  for (const day of LITURGY_WEEKDAYS) {
    base[day] = asString(source[day])
  }
  return base
}

function normalizeCustomLiturgies(raw: unknown): CustomLiturgy[] {
  if (!Array.isArray(raw)) return []

  const result: CustomLiturgy[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const source = entry as Record<string, unknown>
    const name = asString(source.name).trim()
    if (!name) continue
    result.push({
      id: asString(source.id) || createLiturgyItemId(),
      name,
      items: normalizeItems(source.items),
      notes: asString(source.notes),
      startTime: normalizeTimeHHmm(source.startTime),
      endTime: normalizeTimeHHmm(source.endTime),
    })
  }
  return result
}

function normalizeDeletionLocks(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  const result: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof key === 'string' && key && value === true) {
      result[key] = true
    }
  }
  return result
}

export function normalizeLiturgyState(raw: unknown): LiturgyPersistedState {
  if (!raw || typeof raw !== 'object') {
    return {
      weekdays: createEmptyWeekdayLiturgies(),
      dayNotes: createEmptyWeekdayNotes(),
      daySessionTimes: createEmptyWeekdaySessionTimes(),
      customLiturgies: [],
      deletionLocks: {},
    }
  }

  const source = raw as Record<string, unknown>

  return {
    weekdays: normalizeWeekdays(source.weekdays ?? source.liturgies),
    dayNotes: normalizeNotes(source.dayNotes),
    daySessionTimes: normalizeWeekdaySessionTimes(source.daySessionTimes),
    customLiturgies: normalizeCustomLiturgies(source.customLiturgies),
    deletionLocks: normalizeDeletionLocks(source.deletionLocks),
  }
}

export function loadLiturgyState(): LiturgyPersistedState {
  const stored = getUserPreference<unknown>(USER_PREFERENCE_KEYS.liturgyState, null)
  const state = normalizeLiturgyState(stored)

  const checksCleared = getBrowserItem<boolean>(CHECKS_CLEARED_KEY, false, 'session')
  if (!checksCleared) {
    for (const day of LITURGY_WEEKDAYS) {
      state.weekdays[day] = clearDoneFlags(state.weekdays[day])
    }
    state.customLiturgies = state.customLiturgies.map((custom) => ({
      ...custom,
      items: clearDoneFlags(custom.items),
    }))
    saveLiturgyState(state)
    setBrowserItem(CHECKS_CLEARED_KEY, true, 'session')
  }

  return state
}

export function saveLiturgyState(state: LiturgyPersistedState): void {
  setUserPreference(USER_PREFERENCE_KEYS.liturgyState, state)
}

export function todayWeekday(): LiturgyWeekday {
  return LITURGY_WEEKDAYS[new Date().getDay()] ?? 'sunday'
}
