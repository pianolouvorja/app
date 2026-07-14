export type LyricVerticalAlign = 'top' | 'center' | 'bottom'

export type LyricFontWeight = '400' | '600' | '700' | '900'

export type DisplayBounds = {
  x: number
  y: number
  width: number
  height: number
}

/** Monitor detectado pelo sistema (Electron screen API). */
export type SystemDisplay = {
  id: number
  bounds: DisplayBounds
  workArea: DisplayBounds
  scaleFactor: number
  isPrimary: boolean
}

/** Posição visual no arranjo (unidades virtuais = bounds do SO). */
export type MonitorArrangementSlot = {
  displayId: number
  x: number
  y: number
}

/** Preferências de Projeção & Telas (slides de músicas). */
export type ProjectionSettings = {
  /** IDs dos monitores estendidos onde projetar. */
  targetDisplayIds: number[]
  /** Monitores estendidos que o operador desmarcou de propósito. */
  declinedDisplayIds: number[]
  /**
   * Arranjo visual customizado (arrastar). Vazio = usar bounds físicos do SO.
   */
  monitorArrangement: MonitorArrangementSlot[]
  openFullscreenOnPrimary: boolean
  disablePrimaryWhenExtended: boolean
  autoMinimizePlayer: boolean
  lyricAlign: LyricVerticalAlign
  showSongTitle: boolean
  customTextFormat: boolean
  customBackground: boolean
  fontSizePercent: number
  fontColor: string
  fontWeight: LyricFontWeight
  backgroundColor: string
  backgroundImage: string | null
  backgroundOpacity: number
}

export type ProjectionMonitorOption = {
  id: number
  index: number
  label: string
  resolutionLabel: string
  isPrimary: boolean
  isSelected: boolean
}

export const DEFAULT_PROJECTION_SETTINGS: ProjectionSettings = {
  targetDisplayIds: [],
  declinedDisplayIds: [],
  monitorArrangement: [],
  openFullscreenOnPrimary: true,
  disablePrimaryWhenExtended: true,
  autoMinimizePlayer: false,
  lyricAlign: 'center',
  showSongTitle: true,
  customTextFormat: false,
  customBackground: false,
  fontSizePercent: 100,
  fontColor: '#FFFFFF',
  fontWeight: '700',
  backgroundColor: '#000000',
  backgroundImage: null,
  backgroundOpacity: 100,
}

/** Cores de fundo sugeridas (stitch multi-screen). */
export const PROJECTION_BACKGROUND_PRESETS = [
  '#0061a4',
  '#121c2c',
  '#f8f9fa',
  '#343a40',
  '#f1f3f5',
  '#495057',
  '#c2185b',
  '#4a148c',
] as const

export const LYRIC_ALIGN_OPTIONS: LyricVerticalAlign[] = [
  'top',
  'center',
  'bottom',
]

export const LYRIC_WEIGHT_OPTIONS: LyricFontWeight[] = [
  '400',
  '600',
  '700',
  '900',
]
