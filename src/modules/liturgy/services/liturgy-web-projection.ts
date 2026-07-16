import {
  listExtendedDisplays,
  listSystemDisplays,
} from '@modules/settings/services/display-service'
import { loadProjectionSettings } from '@modules/settings/services/projection-preferences'
import {
  closeProjectionModule,
  openProjectionModule,
} from '@shared/composables/useProjectionWindow'
import { getDesktopBridge } from '@shared/services/desktop-bridge'

import {
  parseLiturgyWebTarget,
  publishLiturgyWebRuntime,
} from './liturgy-web-runtime'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resolveTargetMonitorIds(): Promise<number[]> {
  const settings = loadProjectionSettings()
  const displays = await listSystemDisplays()
  const extendedIds = new Set(
    listExtendedDisplays(displays).map((display) => display.id),
  )
  return settings.targetDisplayIds.filter((id) => extendedIds.has(id))
}

type LiturgyWebProjectionOptions = {
  mode?: 'video' | 'site'
  withScreens?: boolean
}

/**
 * Abre URL nas telas configuradas, espelhada.
 * Electron: janelas nativas (YouTube com controles + áudio).
 */
export async function openLiturgyWebOnConfiguredScreens(
  rawUrl: string,
  title = '',
  options: LiturgyWebProjectionOptions = {},
): Promise<boolean> {
  const target = parseLiturgyWebTarget(rawUrl)
  if (!target) return false

  const label = title.trim() || rawUrl.trim() || target.url
  const mode = options.mode ?? (target.kind === 'site' ? 'site' : 'video')
  const withScreens = options.withScreens ?? true
  const bridge = getDesktopBridge()

  if (bridge?.projection?.openUrl) {
    closeProjectionModule()

    const monitorIds = await resolveTargetMonitorIds()

    return bridge.projection.openUrl({
      url: target.url,
      title: label,
      videoId: target.kind === 'youtube' ? target.videoId : undefined,
      monitorIds,
      mode,
      withScreens,
    })
  }

  publishLiturgyWebRuntime({
    active: true,
    url: target.url,
    title: label,
    kind: target.kind,
    videoId: target.videoId,
    startedAt: Date.now(),
  })
  return openProjectionModule('liturgy-web')
}

/** Popup de controle do site, sem espelhar nas telas estendidas. */
export async function openLiturgySiteControl(
  rawUrl: string,
  title = '',
): Promise<boolean> {
  return openLiturgyWebOnConfiguredScreens(rawUrl, title, {
    mode: 'site',
    withScreens: false,
  })
}

/** Popup de controle do site + espelho nas telas estendidas (zoom normal). */
export async function openLiturgySiteOnScreens(
  rawUrl: string,
  title = '',
): Promise<boolean> {
  return openLiturgyWebOnConfiguredScreens(rawUrl, title, {
    mode: 'site',
    withScreens: true,
  })
}

/**
 * Garante o popup de controle aberto e dispara play
 * (telas estendidas abrem/tocam via sync).
 */
export async function playLiturgyWebOnConfiguredScreens(
  rawUrl: string,
  title = '',
): Promise<boolean> {
  const target = parseLiturgyWebTarget(rawUrl)
  if (!target) return false

  if (target.kind === 'site') {
    return openLiturgySiteOnScreens(rawUrl, title)
  }

  const opened = await openLiturgyWebOnConfiguredScreens(rawUrl, title, {
    mode: 'video',
    withScreens: true,
  })
  if (!opened) return false

  const bridge = getDesktopBridge()
  if (!bridge?.projection?.remotePlay) return opened

  // Dá tempo do YouTube montar o <video> no popup
  await sleep(600)
  const playing = await bridge.projection.remotePlay()
  if (playing) return true

  await sleep(800)
  return bridge.projection.remotePlay()
}
