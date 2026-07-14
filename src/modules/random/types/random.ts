export type RandomDrawMode = 'names' | 'numbers'

export type RandomAnimationSpeed = 'fast' | 'normal' | 'slow'

export type RandomTextTransform = 'none' | 'uppercase' | 'lowercase'

export interface RandomDisplayConfig {
  bgColor: string
  textColor: string
  fontSizePc: number
  textTransform: RandomTextTransform
  animationSpeed: RandomAnimationSpeed
}

export interface RandomRuntimeState {
  currentDisplay: string
  isDrawing: boolean
}

/** Lista e histórico de um modo (nomes ou números). */
export interface RandomModePool {
  available: string[]
  drawn: string[]
  currentDisplay: string
}

export interface RandomSessionState {
  mode: RandomDrawMode
  names: RandomModePool
  numbers: RandomModePool
  numberMin: number
  numberMax: number
}

export interface RandomAnimationProfile {
  maxTicks: number
  intervalMs: number
  slowdownAfterRatio: number
  slowdownStepMs: number
}

export const DEFAULT_RANDOM_DISPLAY_CONFIG: RandomDisplayConfig = {
  bgColor: '#000000',
  textColor: '#FFFFFF',
  fontSizePc: 15,
  textTransform: 'none',
  animationSpeed: 'normal',
}

export const DEFAULT_RANDOM_RUNTIME: RandomRuntimeState = {
  currentDisplay: '',
  isDrawing: false,
}

export const DEFAULT_RANDOM_MODE_POOL: RandomModePool = {
  available: [],
  drawn: [],
  currentDisplay: '',
}

export const DEFAULT_RANDOM_SESSION: RandomSessionState = {
  mode: 'names',
  names: { available: [], drawn: [], currentDisplay: '' },
  numbers: { available: [], drawn: [], currentDisplay: '' },
  numberMin: 1,
  numberMax: 100,
}

export const RANDOM_ANIMATION_SPEEDS: RandomAnimationSpeed[] = [
  'fast',
  'normal',
  'slow',
]

export const RANDOM_TEXT_TRANSFORMS: RandomTextTransform[] = [
  'none',
  'uppercase',
  'lowercase',
]

export const RANDOM_ANIMATION_PROFILES: Record<
  RandomAnimationSpeed,
  RandomAnimationProfile
> = {
  fast: {
    maxTicks: 15,
    intervalMs: 30,
    slowdownAfterRatio: 0.7,
    slowdownStepMs: 20,
  },
  normal: {
    maxTicks: 30,
    intervalMs: 50,
    slowdownAfterRatio: 0.7,
    slowdownStepMs: 20,
  },
  slow: {
    maxTicks: 50,
    intervalMs: 80,
    slowdownAfterRatio: 0.7,
    slowdownStepMs: 20,
  },
}

export const RANDOM_BG_PRESETS = [
  '#FFFFFF',
  '#000000',
  '#1A1A1A',
  '#1976D2',
  '#388E3C',
  '#D32F2F',
  '#F57C00',
  '#7B1FA2',
] as const

export const RANDOM_TEXT_PRESETS = [
  '#0097d7',
  '#FFFFFF',
  '#000000',
  '#f6c32a',
  '#FF6B6B',
  '#4ECDC4',
  '#96CEB4',
  '#FFEAA7',
] as const

/** Limite de nomes gerados por intervalo numérico. */
export const RANDOM_MAX_RANGE_SIZE = 100_000

export const RANDOM_FONT_SIZE_MIN = 5
export const RANDOM_FONT_SIZE_MAX = 30

export function emptyModePool(): RandomModePool {
  return {
    available: [],
    drawn: [],
    currentDisplay: '',
  }
}

export function activeModePool(session: RandomSessionState): RandomModePool {
  return session.mode === 'names' ? session.names : session.numbers
}
