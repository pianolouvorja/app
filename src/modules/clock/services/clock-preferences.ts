import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'

import {
  DEFAULT_CLOCK_CONFIG,
  type ClockConfig,
  type ClockStyle,
} from '../types/clock'

export const CLOCK_CONFIG_CHANNEL = 'louvorja-clock-config'

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function asStyle(value: unknown): ClockStyle {
  return value === 'analog' ? 'analog' : 'digital'
}

export function normalizeClockConfig(raw: unknown): ClockConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CLOCK_CONFIG }
  }

  const source = raw as Record<string, unknown>

  return {
    style: asStyle(source.style),
    showSeconds: asBoolean(source.showSeconds, DEFAULT_CLOCK_CONFIG.showSeconds),
    format24h: asBoolean(source.format24h, DEFAULT_CLOCK_CONFIG.format24h),
    bgColor: asString(source.bgColor, DEFAULT_CLOCK_CONFIG.bgColor),
    textColor: asString(source.textColor, DEFAULT_CLOCK_CONFIG.textColor),
  }
}

export function loadClockConfig(): ClockConfig {
  const stored = getUserPreference<unknown>(USER_PREFERENCE_KEYS.clockConfig, null)
  return normalizeClockConfig(stored)
}

export function saveClockConfig(config: ClockConfig): void {
  setUserPreference(USER_PREFERENCE_KEYS.clockConfig, config)

  try {
    const channel = new BroadcastChannel(CLOCK_CONFIG_CHANNEL)
    channel.postMessage(config)
    channel.close()
  } catch {
    // BroadcastChannel pode não existir em ambientes antigos
  }
}
