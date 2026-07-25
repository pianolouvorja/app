export type TimerTimeFormat =
  | 'hh:mm:ss.ms'
  | 'hh:mm:ss'
  | 'mm:ss.ms'
  | 'mm:ss'

export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerDisplayConfig {
  timeFormat: TimerTimeFormat
  bgColor: string
  textColor: string
}

export interface TimerRuntimeState {
  status: TimerStatus
  /** Epoch ms when the current running segment started. */
  segmentStartedAt: number | null
  /** Milliseconds accumulated before the current segment. */
  accumulatedMs: number
  savedTimesMs: number[]
}

export const DEFAULT_TIMER_DISPLAY_CONFIG: TimerDisplayConfig = {
  timeFormat: 'hh:mm:ss.ms',
  bgColor: '#000000',
  textColor: '#FFFFFF',
}

export const DEFAULT_TIMER_RUNTIME: TimerRuntimeState = {
  status: 'idle',
  segmentStartedAt: null,
  accumulatedMs: 0,
  savedTimesMs: [],
}

export const TIMER_TIME_FORMATS: TimerTimeFormat[] = [
  'hh:mm:ss.ms',
  'hh:mm:ss',
  'mm:ss.ms',
  'mm:ss',
]

export const TIMER_BG_PRESETS = [
  '#000000',
  '#1A1A1A',
  '#FFFFFF',
  '#1976D2',
  '#388E3C',
  '#D32F2F',
  '#F57C00',
  '#7B1FA2',
] as const

export const TIMER_TEXT_PRESETS = [
  '#FFFFFF',
  '#000000',
  '#f6c32a',
  '#FF6B6B',
  '#4ECDC4',
  '#96CEB4',
  '#FFEAA7',
  '#0097d7',
] as const
