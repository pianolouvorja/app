import { useBibleStore } from '@modules/bible/stores/useBibleStore'
import { openMusicPlayer } from '@modules/media/services/open-music-player'
import type { MediaPlaybackMode } from '@modules/media/types/media'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import type { Router } from 'vue-router'

import type { LiturgyItem } from '../types/liturgy'
import { INTERNAL_FILE_TYPES } from '../types/liturgy'
import { isExecutableItem } from './liturgy-item-helpers'
import {
  openLiturgyLocalImageControl,
  openLiturgyLocalPdfControl,
  openLiturgyLocalPresentationControl,
  openLiturgyLocalVideoControl,
  openLiturgySiteControl,
  openLiturgySiteOnScreens,
  openLiturgyVideoControl,
  playLiturgyLocalImageOnScreens,
  playLiturgyLocalPdfOnScreens,
  playLiturgyLocalPresentationOnScreens,
  playLiturgyLocalVideoOnScreens,
  playLiturgyWebOnConfiguredScreens,
} from './liturgy-web-projection'

export type LiturgyActionResult =
  | { ok: true; messageKey?: string }
  | { ok: false; messageKey: string }

function resolveMusicId(item: LiturgyItem): number | null {
  if (item.type !== 'music') return null
  const musicId = Number(item.musicId)
  if (!Number.isFinite(musicId) || musicId <= 0) return null
  return musicId
}

function resolveImagePaths(item: LiturgyItem): string[] {
  if (item.type !== 'images') return []
  if (item.filePaths && item.filePaths.length > 0) {
    return item.filePaths.map((entry) => entry.trim()).filter(Boolean)
  }
  const single = item.filePath?.trim()
  return single ? [single] : []
}

/**
 * Abre a música no player padrão — exatamente o mesmo contrato dos Álbuns.
 */
export async function openLiturgyMusicPlayer(
  item: LiturgyItem,
  mode: MediaPlaybackMode,
  options?: { project?: boolean },
): Promise<LiturgyActionResult> {
  const musicId = resolveMusicId(item)
  if (musicId == null) {
    return { ok: false, messageKey: 'liturgy.messages.catalogEmpty' }
  }

  const result = await openMusicPlayer({
    musicId,
    mode,
    project: options?.project,
  })

  if (!result.ok) {
    return { ok: false, messageKey: result.messageKey }
  }

  return { ok: true, messageKey: result.warningKey }
}

/** Abre música no player e projeta nas telas (fluxo legado do clique único). */
export async function openLiturgyMusicOnScreens(
  item: LiturgyItem,
): Promise<LiturgyActionResult> {
  return openLiturgyMusicPlayer(item, item.musicMode ?? 'audio', {
    project: true,
  })
}

/** Abre o item (música já projeta nas telas configuradas). */
export async function executeLiturgyItem(
  item: LiturgyItem,
  router: Router,
): Promise<LiturgyActionResult> {
  if (!isExecutableItem(item)) {
    return { ok: true }
  }

  switch (item.type) {
    case 'music': {
      const result = await openLiturgyMusicOnScreens(item)
      if (result.ok) {
        await router.push({ name: 'media' })
      }
      return result
    }

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

      const opened = await openLiturgyVideoControl(
        rawUrl,
        item.name?.trim() || rawUrl,
      )
      if (!opened) {
        return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
      }
      return { ok: true }
    }

    case 'video': {
      const filePath = item.filePath?.trim()
      if (!filePath) {
        return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
      }

      const opened = await openLiturgyLocalVideoControl(
        filePath,
        item.name?.trim() || filePath,
      )
      if (!opened) {
        return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
      }
      return { ok: true }
    }

    case 'images': {
      const paths = resolveImagePaths(item)
      if (paths.length === 0) {
        return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
      }

      const opened = await openLiturgyLocalImageControl(
        paths,
        item.name?.trim() || paths[0] || 'Imagens',
      )
      if (!opened) {
        return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
      }
      return { ok: true }
    }

    case 'pdf': {
      const filePath = item.filePath?.trim()
      if (!filePath) {
        return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
      }

      const opened = await openLiturgyLocalPdfControl(
        filePath,
        item.name?.trim() || filePath,
      )
      if (!opened) {
        return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
      }
      return { ok: true }
    }

    case 'presentation': {
      const filePath = item.filePath?.trim()
      if (!filePath) {
        return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
      }

      const bridge = getDesktopBridge()
      const hasOffice = await bridge?.presentation?.detectOffice?.()
      if (hasOffice === false) {
        return {
          ok: false,
          messageKey: 'liturgy.messages.presentationOfficeMissing',
        }
      }

      const opened = await openLiturgyLocalPresentationControl(
        filePath,
        item.name?.trim() || filePath,
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
  if (item.type === 'music') {
    return openLiturgyMusicOnScreens(item)
  }

  if (item.type === 'video') {
    const filePath = item.filePath?.trim()
    if (!filePath) {
      return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
    }
    const ok = await playLiturgyLocalVideoOnScreens(
      filePath,
      item.name?.trim() || filePath,
    )
    if (!ok) {
      return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
    }
    return { ok: true }
  }

  if (item.type === 'images') {
    const paths = resolveImagePaths(item)
    if (paths.length === 0) {
      return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
    }
    const ok = await playLiturgyLocalImageOnScreens(
      paths,
      item.name?.trim() || paths[0] || 'Imagens',
    )
    if (!ok) {
      return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
    }
    return { ok: true }
  }

  if (item.type === 'pdf') {
    const filePath = item.filePath?.trim()
    if (!filePath) {
      return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
    }
    const ok = await playLiturgyLocalPdfOnScreens(
      filePath,
      item.name?.trim() || filePath,
    )
    if (!ok) {
      return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
    }
    return { ok: true }
  }

  if (item.type === 'presentation') {
    const filePath = item.filePath?.trim()
    if (!filePath) {
      return { ok: false, messageKey: 'liturgy.messages.mediaDesktopOnly' }
    }
    const bridge = getDesktopBridge()
    const hasOffice = await bridge?.presentation?.detectOffice?.()
    if (hasOffice === false) {
      return {
        ok: false,
        messageKey: 'liturgy.messages.presentationOfficeMissing',
      }
    }
    const ok = await playLiturgyLocalPresentationOnScreens(
      filePath,
      item.name?.trim() || filePath,
    )
    if (!ok) {
      return { ok: false, messageKey: 'liturgy.messages.projectionFailed' }
    }
    return { ok: true }
  }

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
