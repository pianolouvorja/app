import {
  EXECUTABLE_ITEM_TYPES,
  getTypeDotColor,
  INTERNAL_FILE_TYPES,
  LITURGY_ITEM_TYPE_META,
  LITURGY_ITEM_TYPES,
  MOMENT_DURATION_MAX_MS,
  MOMENT_DURATION_MIN_MS,
  type LiturgyItem,
  type LiturgyItemDraft,
  type LiturgyItemType,
  type LiturgyMusicOption,
  type LiturgyBibleBookOption,
} from '../types/liturgy'
import { normalizeLiturgyTimeHHmm, pad2 } from './liturgy-format'

export function createLiturgyItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Categoria preferida ao adicionar item (seleção atual ou última sessão). */
export function resolvePreferredCategoryId(
  items: LiturgyItem[],
  selected: LiturgyItem | null | undefined,
): string | null {
  if (selected?.type === 'category') return selected.id
  if (selected?.categoryId) return selected.categoryId

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]
    if (item?.type === 'category') return item.id
  }
  return null
}

/**
 * Índice de inserção: imediatamente após o último filho da categoria
 * (necessário para a timeline aninhar por sequência contígua).
 */
export function findCategoryInsertIndex(
  items: LiturgyItem[],
  categoryId: string,
): number {
  const categoryIndex = items.findIndex(
    (item) => item.type === 'category' && item.id === categoryId,
  )
  if (categoryIndex < 0) return items.length

  let insertAt = categoryIndex + 1
  while (insertAt < items.length) {
    const child = items[insertAt]
    if (!child || child.type === 'category') break
    if (child.categoryId !== categoryId) break
    insertAt += 1
  }
  return insertAt
}

/** Copia itens com novos IDs, remapeando categoryId e limpando done. */
export function cloneLiturgyItems(items: LiturgyItem[]): LiturgyItem[] {
  const idMap = new Map<string, string>()
  for (const item of items) {
    idMap.set(item.id, createLiturgyItemId())
  }

  return items.map((item) => {
    const nextCategoryId =
      item.categoryId != null ? (idMap.get(item.categoryId) ?? null) : null
    return {
      ...item,
      id: idMap.get(item.id) ?? createLiturgyItemId(),
      categoryId: nextCategoryId,
      done: false,
    }
  })
}

export function isExecutableItem(item: Pick<LiturgyItem, 'type'>): boolean {
  return EXECUTABLE_ITEM_TYPES.includes(item.type)
}

export function getItemTypeIcon(type: LiturgyItemType): string {
  return LITURGY_ITEM_TYPE_META.find((entry) => entry.value === type)?.icon ?? 'mdi-help'
}

export function getItemTypeTone(type: LiturgyItemType): string {
  return LITURGY_ITEM_TYPE_META.find((entry) => entry.value === type)?.tone ?? 'grey'
}

/** Normaliza aliases antigos para o vocabulário Stitch atual. */
export function normalizeItemType(raw: unknown): LiturgyItemType | null {
  if (raw === 'media' || raw === 'files') return 'other_files'
  if (raw === 'link') return 'site'
  if (typeof raw === 'string' && (LITURGY_ITEM_TYPES as readonly string[]).includes(raw)) {
    return raw as LiturgyItemType
  }
  return null
}

export function getSectionItemNumber(
  items: LiturgyItem[],
  index: number,
): number | null {
  if (!items[index] || items[index].type === 'category') return null

  let count = 0
  for (let i = 0; i <= index; i += 1) {
    const item = items[i]
    if (item.type === 'category') {
      count = 0
    } else {
      count += 1
    }
  }
  return count
}

export function clampMomentDurationMs(value: number): number {
  if (value <= 0) return 0
  const stepped = Math.round(value / 1000) * 1000
  return Math.min(
    MOMENT_DURATION_MAX_MS,
    Math.max(MOMENT_DURATION_MIN_MS, stepped),
  )
}

export function formatMomentDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${pad2(minutes)}:${pad2(seconds)}`
}

/** Aceita http(s) com host válido (ex.: youtube.com, vimeo.com). */
export function isValidLiturgyUrl(raw: string): boolean {
  const value = raw.trim()
  if (!value) return false

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

    const host = parsed.hostname.toLowerCase()
    if (!host || host.startsWith('.') || host.endsWith('.')) return false
    if (host === 'localhost') return true
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true
    return host.includes('.') && /[a-z0-9-]/i.test(host)
  } catch {
    return false
  }
}

export function isLiturgyItemDraftValid(draft: LiturgyItemDraft): boolean {
  if (draft.type == null) return false
  if (draft.name.trim().length === 0) return false
  if (draft.type === 'category' && !normalizeLiturgyTimeHHmm(draft.startTime)) {
    return false
  }
  if (draft.type === 'music' && draft.musicId == null) return false
  if (draft.type !== 'category' && !draft.categoryId) return false
  if (draft.type === 'images') {
    const paths =
      draft.filePaths.length > 0
        ? draft.filePaths
        : draft.filePath.trim()
          ? [draft.filePath]
          : []
    if (paths.length === 0) return false
  }
  if (
    (draft.type === 'video' ||
      draft.type === 'pdf' ||
      draft.type === 'presentation') &&
    !draft.filePath.trim()
  ) {
    return false
  }
  if (
    (draft.type === 'site' || draft.type === 'online_video') &&
    !isValidLiturgyUrl(draft.url)
  ) {
    return false
  }
  return true
}

export function buildLiturgyItemFromDraft(
  draft: LiturgyItemDraft,
  context: {
    musicList: LiturgyMusicOption[]
    bibleBooks: LiturgyBibleBookOption[]
    existingId?: string
    done?: boolean
  },
): LiturgyItem {
  if (draft.type == null) {
    throw new Error('Liturgy item draft requires a type')
  }

  const type = draft.type
  const details = draft.subtitle.trim()
  const item: LiturgyItem = {
    id: context.existingId ?? createLiturgyItemId(),
    type,
    name: draft.name.trim(),
    subtitle: details,
    done: context.done ?? false,
    durationMs:
      type === 'category'
        ? 0
        : type === 'music'
          ? draft.durationMs > 0
            ? clampMomentDurationMs(draft.durationMs)
            : 0
          : clampMomentDurationMs(draft.durationMs),
    accentColor: getTypeDotColor(type),
    categoryId: type === 'category' ? null : draft.categoryId,
    startTime:
      type === 'category' ? normalizeLiturgyTimeHHmm(draft.startTime) : null,
  }

  if (type === 'music') {
    item.musicId = draft.musicId
    item.musicMode = draft.musicMode
    const complementary = draft.name.trim()
    const music = context.musicList.find((entry) => entry.id === draft.musicId)
    if (music) {
      item.name = music.displayLabel
      item.complementaryTitle = complementary || undefined
      item.subtitle = music.albumNames
      item.notes = details || undefined
    } else {
      item.name = complementary || 'Música'
      item.complementaryTitle = undefined
      item.subtitle = ''
      item.notes = details || undefined
    }
  }

  if (type === 'verse') {
    item.verseBookId = draft.verseBookId
    item.verseChapter = draft.verseChapter
    item.verseNumbers = draft.verseNumbers.trim()
    const book = context.bibleBooks.find((entry) => entry.id === draft.verseBookId)
    if (book && !details) {
      const verses = item.verseNumbers ? `:${item.verseNumbers}` : ''
      item.subtitle = `${book.name} ${draft.verseChapter}${verses}`
    }
  }

  if (INTERNAL_FILE_TYPES.includes(type)) {
    const paths =
      type === 'images'
        ? (draft.filePaths.length > 0
            ? draft.filePaths
            : draft.filePath.trim()
              ? [draft.filePath.trim()]
              : []
          ).map((entry) => entry.trim()).filter(Boolean)
        : draft.filePath.trim()
          ? [draft.filePath.trim()]
          : []

    item.filePath = paths[0] ?? ''
    if (type === 'images' && paths.length > 0) {
      item.filePaths = paths
      if (!details) {
        item.subtitle =
          paths.length === 1
            ? (paths[0]!.split(/[\\/]/).pop() ?? paths[0]!)
            : `${paths.length} imagens`
      }
    } else if (item.filePath && !details) {
      const parts = item.filePath.split(/[\\/]/)
      item.subtitle = parts[parts.length - 1] ?? item.filePath
    }
  }

  if (type === 'site' || type === 'online_video') {
    item.url = draft.url.trim()
    if (item.url && !details) {
      item.subtitle = item.url
    }
  }

  return item
}

export function draftFromLiturgyItem(item: LiturgyItem): LiturgyItemDraft {
  return {
    type: item.type,
    name:
      item.type === 'music'
        ? (item.complementaryTitle ?? '').trim()
        : item.name,
    subtitle:
      item.type === 'music' ? (item.notes ?? '').trim() : item.subtitle,
    durationMs:
      item.type === 'category'
        ? 0
        : item.type === 'music'
          ? item.durationMs > 0
            ? clampMomentDurationMs(item.durationMs)
            : 0
          : clampMomentDurationMs(item.durationMs),
    accentColor: getTypeDotColor(item.type),
    categoryId: item.type === 'category' ? null : (item.categoryId ?? null),
    startTime:
      item.type === 'category'
        ? (normalizeLiturgyTimeHHmm(item.startTime) ?? '')
        : '',
    musicId: item.musicId ?? null,
    musicMode: item.musicMode ?? 'audio',
    verseBookId: item.verseBookId ?? null,
    verseChapter: item.verseChapter ?? null,
    verseNumbers: item.verseNumbers ?? '',
    filePath: item.filePath ?? '',
    filePaths:
      item.filePaths && item.filePaths.length > 0
        ? [...item.filePaths]
        : item.filePath
          ? [item.filePath]
          : [],
    url: item.url ?? '',
  }
}

/** Alinha nome/álbum da música ao catálogo e separa anotações do subtítulo. */
export function reconcileMusicItemTitles(
  items: LiturgyItem[],
  musicList: LiturgyMusicOption[],
): LiturgyItem[] {
  if (musicList.length === 0) return items

  let changed = false
  const next = items.map((item) => {
    if (item.type !== 'music' || item.musicId == null) return item
    const music = musicList.find((entry) => entry.id === item.musicId)
    if (!music) return item

    let nextItem = item
    const complementary = item.complementaryTitle?.trim()

    if (!complementary && item.name !== music.displayLabel) {
      changed = true
      nextItem = {
        ...nextItem,
        complementaryTitle: item.name,
        name: music.displayLabel,
      }
    } else if (item.name !== music.displayLabel) {
      changed = true
      nextItem = { ...nextItem, name: music.displayLabel }
    }

    const existingNotes = nextItem.notes?.trim()
    const subtitle = nextItem.subtitle.trim()
    if (subtitle !== music.albumNames) {
      changed = true
      nextItem = {
        ...nextItem,
        subtitle: music.albumNames,
        notes: existingNotes || subtitle || undefined,
      }
    } else if (nextItem.notes && !existingNotes) {
      changed = true
      nextItem = { ...nextItem, notes: undefined }
    }

    return nextItem
  })

  return changed ? next : items
}

export function clearDoneFlags(items: LiturgyItem[]): LiturgyItem[] {
  return items.map((item) => ({ ...item, done: false }))
}
