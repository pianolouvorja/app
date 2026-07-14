import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'

import {
  DEFAULT_TIMER_DISPLAY_CONFIG,
  TIMER_TIME_FORMATS,
  type TimerDisplayConfig,
  type TimerTimeFormat,
} from '../types/timer'

export const TIMER_CONFIG_CHANNEL = 'louvorja-timer-config'

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function asTimeFormat(value: unknown): TimerTimeFormat {
  return TIMER_TIME_FORMATS.includes(value as TimerTimeFormat)
    ? (value as TimerTimeFormat)
    : DEFAULT_TIMER_DISPLAY_CONFIG.timeFormat
}

export function normalizeTimerDisplayConfig(raw: unknown): TimerDisplayConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TIMER_DISPLAY_CONFIG }
  }

  const source = raw as Record<string, unknown>

  return {
    timeFormat: asTimeFormat(source.timeFormat),
    bgColor: asString(source.bgColor, DEFAULT_TIMER_DISPLAY_CONFIG.bgColor),
    textColor: asString(source.textColor, DEFAULT_TIMER_DISPLAY_CONFIG.textColor),
  }
}

export function loadTimerDisplayConfig(): TimerDisplayConfig {
  const stored = getUserPreference<unknown>(USER_PREFERENCE_KEYS.timerConfig, null)
  return normalizeTimerDisplayConfig(stored)
}

export function saveTimerDisplayConfig(config: TimerDisplayConfig): void {
  setUserPreference(USER_PREFERENCE_KEYS.timerConfig, config)

  try {
    const channel = new BroadcastChannel(TIMER_CONFIG_CHANNEL)
    channel.postMessage(config)
    channel.close()
  } catch {
    // BroadcastChannel pode não existir em ambientes antigos
  }
}
