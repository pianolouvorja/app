export const LITURGY_WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

export type LiturgyWeekday = (typeof LITURGY_WEEKDAYS)[number]

/** Ordem das chips no Stitch: seg→sáb, depois domingo. */
export const LITURGY_DAY_TAB_ORDER: LiturgyWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export type LiturgyDayKey = LiturgyWeekday | 'custom'

/** Fonte para clonar liturgia (dia da semana ou avulsa). */
export type LiturgyCloneSource =
  | { kind: 'weekday'; day: LiturgyWeekday; labelKey: string; itemCount: number }
  | {
      kind: 'custom'
      id: string
      index: number
      name: string
      itemCount: number
    }

/** Tipos de momento alinhados ao Stitch addItem (+ verse legado). */
export const LITURGY_ITEM_TYPES = [
  'category',
  'music',
  'annotation',
  'notice',
  'scheduled',
  'prayer',
  'video',
  'images',
  'pdf',
  'presentation',
  'other_files',
  'online_video',
  'site',
  'verse',
] as const

export type LiturgyItemType = (typeof LITURGY_ITEM_TYPES)[number]

export type LiturgyTypeGroupId = 'default' | 'internal' | 'external'

export interface LiturgyTypeChip {
  value: LiturgyItemType
  dot: string
}

export interface LiturgyTypeGroup {
  id: LiturgyTypeGroupId
  labelKey: string
  toneClass: 'primary' | 'secondary' | 'tertiary'
  types: LiturgyTypeChip[]
}

/** Grupos e pills do popup (Stitch addItem).
 * Cores bem separadas no espectro — prioriza distinção, não harmonia de tema.
 */
export const LITURGY_TYPE_GROUPS: LiturgyTypeGroup[] = [
  {
    id: 'default',
    labelKey: 'liturgy.dialog.groups.default',
    toneClass: 'primary',
    types: [
      { value: 'category', dot: '#FFD600' }, // amarelo puro
      { value: 'music', dot: '#00E676' }, // verde neon
      { value: 'annotation', dot: '#FF6D00' }, // laranja vivo
    ],
  },
  {
    id: 'internal',
    labelKey: 'liturgy.dialog.groups.internal',
    toneClass: 'secondary',
    types: [
      { value: 'video', dot: '#00B8D4' }, // ciano
      { value: 'images', dot: '#6D4C41' }, // marrom
      { value: 'pdf', dot: '#1A237E' }, // índigo/navy
      { value: 'presentation', dot: '#F5F5F5' }, // branco
    ],
  },
  {
    id: 'external',
    labelKey: 'liturgy.dialog.groups.external',
    toneClass: 'tertiary',
    types: [
      { value: 'online_video', dot: '#2979FF' }, // azul royal
      { value: 'site', dot: '#AEEA00' }, // chartreuse
    ],
  },
]

export type LiturgyMusicMode = 'audio' | 'instrumental'

export const DEFAULT_MOMENT_DURATION_MS = 0
export const MOMENT_DURATION_STEP_MS = 60 * 1000
export const MOMENT_DURATION_MIN_MS = 0
export const MOMENT_DURATION_MAX_MS = 99 * 60 * 1000

export function getTypeDotColor(type: LiturgyItemType): string {
  for (const group of LITURGY_TYPE_GROUPS) {
    const chip = group.types.find((entry) => entry.value === type)
    if (chip) return chip.dot
  }
  return '#9ecaff'
}

export interface LiturgyItem {
  id: string
  type: LiturgyItemType
  name: string
  subtitle: string
  done: boolean
  durationMs: number
  accentColor: string
  /** ID da Categoria/Sessão vinculada (itens que não são category). */
  categoryId?: string | null
  /** Horário de início da categoria/separador (HH:MM). */
  startTime?: string | null
  /** Horário de término da categoria/separador (HH:MM). */
  endTime?: string | null
  /** Título opcional ao lado do nome da música na listagem. */
  complementaryTitle?: string
  /** Anotações livres (em música, exibidas abaixo do álbum). */
  notes?: string
  musicId?: number | null
  musicMode?: LiturgyMusicMode
  verseBookId?: number | null
  verseChapter?: number | null
  verseNumbers?: string
  filePath?: string
  /** Caminhos locais (galeria de imagens). */
  filePaths?: string[]
  url?: string
}

export interface CustomLiturgy {
  id: string
  name: string
  items: LiturgyItem[]
  notes: string
  /** Horário de início real (HH:MM). */
  startTime?: string | null
  /** Horário final planejado (HH:MM). */
  endTime?: string | null
}

export type WeekdayLiturgies = Record<LiturgyWeekday, LiturgyItem[]>

export type WeekdayNotes = Record<LiturgyWeekday, string>

export interface LiturgySessionTimes {
  startTime: string | null
  endTime: string | null
}

export type WeekdaySessionTimes = Record<LiturgyWeekday, LiturgySessionTimes>

export interface LiturgyPersistedState {
  weekdays: WeekdayLiturgies
  dayNotes: WeekdayNotes
  daySessionTimes: WeekdaySessionTimes
  customLiturgies: CustomLiturgy[]
  /** Cadeado anti-exclusão por chave de dia (`monday`) ou avulsa (`custom:<id>`). */
  deletionLocks: Record<string, boolean>
}

export interface LiturgyItemDraft {
  type: LiturgyItemType | null
  name: string
  subtitle: string
  durationMs: number
  accentColor: string
  categoryId: string | null
  /** Horário de início (HH:MM) — usado em categorias/separadores. */
  startTime: string
  /** Horário de término (HH:MM) — usado em categorias/separadores. */
  endTime: string
  musicId: number | null
  musicMode: LiturgyMusicMode
  verseBookId: number | null
  verseChapter: number | null
  verseNumbers: string
  filePath: string
  filePaths: string[]
  url: string
}

export interface LiturgyMusicOption {
  id: number
  name: string
  hymnalTrack: number | null
  albumNames: string
  displayLabel: string
  /** Duração detectada no catálogo (ms). Null se indisponível. */
  durationMs: number | null
  /** True quando há faixa instrumental no catálogo. */
  hasInstrumental: boolean
}

export interface LiturgyBibleBookOption {
  id: number
  name: string
  chapters: number
}

export interface LiturgyItemTypeMeta {
  value: LiturgyItemType
  icon: string
  tone: string
}

export const DEFAULT_LITURGY_ITEM_DRAFT: LiturgyItemDraft = {
  type: null,
  name: '',
  subtitle: '',
  durationMs: 0,
  accentColor: '#9ecaff',
  categoryId: null,
  startTime: '',
  endTime: '',
  musicId: null,
  musicMode: 'audio',
  verseBookId: null,
  verseChapter: null,
  verseNumbers: '',
  filePath: '',
  filePaths: [],
  url: '',
}

export function createEmptyWeekdayLiturgies(): WeekdayLiturgies {
  return {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  }
}

export function createEmptyWeekdayNotes(): WeekdayNotes {
  return {
    sunday: '',
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
  }
}

export function createEmptySessionTimes(): LiturgySessionTimes {
  return { startTime: null, endTime: null }
}

export function createEmptyWeekdaySessionTimes(): WeekdaySessionTimes {
  return {
    sunday: createEmptySessionTimes(),
    monday: createEmptySessionTimes(),
    tuesday: createEmptySessionTimes(),
    wednesday: createEmptySessionTimes(),
    thursday: createEmptySessionTimes(),
    friday: createEmptySessionTimes(),
    saturday: createEmptySessionTimes(),
  }
}

export const LITURGY_ITEM_TYPE_META: LiturgyItemTypeMeta[] = [
  { value: 'category', icon: 'mdi-tag', tone: 'warning' },
  { value: 'music', icon: 'mdi-music-note', tone: 'success' },
  { value: 'annotation', icon: 'mdi-text', tone: 'info' },
  { value: 'notice', icon: 'mdi-bullhorn-outline', tone: 'warning' },
  { value: 'scheduled', icon: 'mdi-calendar-clock', tone: 'cyan' },
  { value: 'prayer', icon: 'mdi-hands-pray', tone: 'info' },
  { value: 'video', icon: 'mdi-video-outline', tone: 'orange' },
  { value: 'images', icon: 'mdi-image-outline', tone: 'success' },
  { value: 'pdf', icon: 'mdi-file-pdf-box', tone: 'warning' },
  { value: 'presentation', icon: 'mdi-file-powerpoint-box', tone: 'orange' },
  { value: 'other_files', icon: 'mdi-file-multiple-outline', tone: 'cyan' },
  { value: 'online_video', icon: 'mdi-youtube', tone: 'orange' },
  { value: 'site', icon: 'mdi-web', tone: 'cyan' },
  { value: 'verse', icon: 'mdi-book-open-variant', tone: 'purple' },
]

export const EXECUTABLE_ITEM_TYPES: LiturgyItemType[] = [
  'music',
  'verse',
  'video',
  'images',
  'pdf',
  'presentation',
  'other_files',
  'online_video',
  'site',
]

export const INTERNAL_FILE_TYPES: LiturgyItemType[] = [
  'video',
  'images',
  'pdf',
  'presentation',
  'other_files',
]
