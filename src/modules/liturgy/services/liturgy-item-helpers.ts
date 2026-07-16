import {
  DEFAULT_MOMENT_DURATION_MS,
  EXECUTABLE_ITEM_TYPES,
  getTypeDotColor,
  INTERNAL_FILE_TYPES,
  LITURGY_ITEM_TYPE_META,
  LITURGY_ITEM_TYPES,
  MOMENT_DURATION_MAX_MS,
  MOMENT_DURATION_MIN_MS,
  MOMENT_DURATION_STEP_MS,
  type LiturgyItem,
  type LiturgyItemDraft,
  type LiturgyItemType,
  type LiturgyMusicOption,
  type LiturgyBibleBookOption,
} from '../types/liturgy'
import { pad2 } from './liturgy-format'

export function createLiturgyItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

export function isLiturgyItemDraftValid(draft: LiturgyItemDraft): boolean {
  if (draft.type === 'music') {
    if (draft.musicId == null) return false
  } else if (draft.name.trim().length === 0) {
    return false
  }
  if (draft.type !== 'category' && !draft.categoryId) return false
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
  const details = draft.subtitle.trim()
  const item: LiturgyItem = {
    id: context.existingId ?? createLiturgyItemId(),
    type: draft.type,
    name: draft.name.trim(),
    subtitle: details,
    done: context.done ?? false,
    durationMs:
      draft.type === 'category'
        ? 0
        : draft.type === 'music'
          ? draft.durationMs > 0
            ? clampMomentDurationMs(draft.durationMs)
            : 0
          : clampMomentDurationMs(draft.durationMs || DEFAULT_MOMENT_DURATION_MS),
    accentColor: getTypeDotColor(draft.type),
    categoryId: draft.type === 'category' ? null : draft.categoryId,
  }

  if (draft.type === 'music') {
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

  if (draft.type === 'verse') {
    item.verseBookId = draft.verseBookId
    item.verseChapter = draft.verseChapter
    item.verseNumbers = draft.verseNumbers.trim()
    const book = context.bibleBooks.find((entry) => entry.id === draft.verseBookId)
    if (book && !details) {
      const verses = item.verseNumbers ? `:${item.verseNumbers}` : ''
      item.subtitle = `${book.name} ${draft.verseChapter}${verses}`
    }
  }

  if (INTERNAL_FILE_TYPES.includes(draft.type)) {
    item.filePath = draft.filePath.trim()
    if (item.filePath && !details) {
      const parts = item.filePath.split(/[\\/]/)
      item.subtitle = parts[parts.length - 1] ?? item.filePath
    }
  }

  if (draft.type === 'site' || draft.type === 'online_video') {
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
          : clampMomentDurationMs(item.durationMs || DEFAULT_MOMENT_DURATION_MS),
    accentColor: getTypeDotColor(item.type),
    categoryId: item.type === 'category' ? null : (item.categoryId ?? null),
    musicId: item.musicId ?? null,
    musicMode: item.musicMode ?? 'audio',
    verseBookId: item.verseBookId ?? null,
    verseChapter: item.verseChapter ?? null,
    verseNumbers: item.verseNumbers ?? '',
    filePath: item.filePath ?? '',
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
