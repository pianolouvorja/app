import { useBibleStore } from '@modules/bible/stores/useBibleStore'
import type { Router } from 'vue-router'

import type { LiturgyItem } from '../types/liturgy'
import { INTERNAL_FILE_TYPES } from '../types/liturgy'
import { isExecutableItem } from './liturgy-item-helpers'
import { openLiturgySiteControl, openLiturgySiteOnScreens, openLiturgyWebOnConfiguredScreens, playLiturgyWebOnConfiguredScreens } from './liturgy-web-projection'

export type LiturgyActionResult =
  | { ok: true }
  | { ok: false; messageKey: string }

/** Abre o popup de controle (sem forçar play). */
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

    case 'online_video': {
      const rawUrl = item.url?.trim()
      if (!rawUrl) {
        return { ok: false, messageKey: 'liturgy.messages.urlMissing' }
      }

      const opened = await openLiturgyWebOnConfiguredScreens(
        rawUrl,
        item.name?.trim() || rawUrl,
        { mode: 'video', withScreens: true },
      )
      if (!opened) {
        return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
      }
      return { ok: true }
    }

    case 'site': {
      const rawUrl = item.url?.trim()
      if (!rawUrl) {
        return { ok: false, messageKey: 'liturgy.messages.urlMissing' }
      }

      const opened = await openLiturgySiteControl(
        rawUrl,
        item.name?.trim() || rawUrl,
      )
      if (!opened) {
        return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
      }
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

/** Abre o controle (se preciso) e dá play — telas estendidas seguem. */
export async function playLiturgyItemOnScreens(
  item: LiturgyItem,
): Promise<LiturgyActionResult> {
  if (item.type !== 'online_video' && item.type !== 'site') {
    return { ok: true }
  }

  const rawUrl = item.url?.trim()
  if (!rawUrl) {
    return { ok: false, messageKey: 'liturgy.messages.urlMissing' }
  }

  const label = item.name?.trim() || rawUrl
  const ok =
    item.type === 'site'
      ? await openLiturgySiteOnScreens(rawUrl, label)
      : await playLiturgyWebOnConfiguredScreens(rawUrl, label)
  if (!ok) {
    return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
  }
  return { ok: true }
}
