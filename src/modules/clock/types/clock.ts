export type ClockStyle = 'digital' | 'analog'

export interface ClockConfig {
  style: ClockStyle
  showSeconds: boolean
  format24h: boolean
  bgColor: string
  textColor: string
}

export const DEFAULT_CLOCK_CONFIG: ClockConfig = {
  style: 'digital',
  showSeconds: true,
  format24h: true,
  bgColor: '#000000',
  textColor: '#FFFFFF',
}

export const CLOCK_BG_PRESETS = [
  '#000000',
  '#1A1A1A',
  '#FFFFFF',
  '#1976D2',
  '#388E3C',
  '#D32F2F',
  '#F57C00',
  '#7B1FA2',
] as const

export const CLOCK_TEXT_PRESETS = [
  '#FFFFFF',
  '#000000',
  '#f6c32a',
  '#FF6B6B',
  '#4ECDC4',
  '#96CEB4',
  '#FFEAA7',
  '#0097d7',
] as const

export interface UtilityHubItem {
  key: string
  titleKey: string
  descriptionKey: string
  icon: string
  to: string | null
  available: boolean
}
