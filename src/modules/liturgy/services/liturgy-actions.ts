import { useBibleStore } from '@modules/bible/stores/useBibleStore'
import type { Router } from 'vue-router'

import type { LiturgyItem } from '../types/liturgy'
import { INTERNAL_FILE_TYPES } from '../types/liturgy'
import { isExecutableItem } from './liturgy-item-helpers'

export type LiturgyActionResult =
  | { ok: true }
  | { ok: false; messageKey: string }

/** Executa item litúrgico (mídia interna aguarda módulos futuros). */
export async function executeLiturgyItem(
  item: LiturgyItem,
  router: Router,
): Promise<LiturgyActionResult> {
  if (!isExecutableItem(item)) {
    return { ok: true }
  }

  switch (item.type) {
    case 'music':
      return { ok: false, messageKey: 'liturgy.messages.musicUnavailable' }

    case 'verse': {
      if (item.verseBookId == null || item.verseChapter == null) {
        return { ok: true }
      }

      const bibleStore = useBibleStore()
      if (bibleStore.books.length === 0) {
        await bibleStore.bootstrap()
      }
      await bibleStore.selectBook(item.verseBookId)
      await bibleStore.selectChapter(item.verseChapter)

      const verseQuery = item.verseNumbers?.trim()
      if (verseQuery) {
        bibleStore.verseSearchQuery = verseQuery
        bibleStore.applyVerseSearch()
      }

      await router.push({ name: 'bible' })
      return { ok: true }
    }

    case 'online_video':
    case 'site': {
      const url = item.url?.trim()
      if (!url) return { ok: true }
      window.open(url, '_blank', 'noopener,noreferrer')
      return { ok: true }
    }

    default: {
      if (INTERNAL_FILE_TYPES.includes(item.type)) {
        if (!item.filePath?.trim()) {
          return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
        }
        return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
      }
      return { ok: true }
    }
  }
}
