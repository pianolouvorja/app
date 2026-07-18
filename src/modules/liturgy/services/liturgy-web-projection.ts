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
  mode?: 'video' | 'site' | 'image' | 'pdf' | 'presentation'
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

/** Popup de controle do vídeo online, sem projetar nas telas estendidas. */
export async function openLiturgyVideoControl(
  rawUrl: string,
  title = '',
): Promise<boolean> {
  return openLiturgyWebOnConfiguredScreens(rawUrl, title, {
    mode: 'video',
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

async function openLiturgyLocalVideo(
  filePath: string,
  title = '',
  withScreens: boolean,
): Promise<boolean> {
  const path = filePath.trim()
  if (!path) return false

  const label = title.trim() || path.split(/[\\/]/).pop() || path
  const bridge = getDesktopBridge()
  if (!bridge?.projection?.openUrl) return false

  closeProjectionModule()
  // Sempre envia os monitores das preferências — mesmo com withScreens:false —
  // para o popup refletir a seleção da liturgia (badge "2", etc.).
  const monitorIds = await resolveTargetMonitorIds()

  const opened = await bridge.projection.openUrl({
    filePath: path,
    title: label,
    monitorIds,
    mode: 'video',
    withScreens,
  })
  if (!opened) return false
  if (!withScreens || !bridge.projection.remotePlay) return true

  await sleep(400)
  const playing = await bridge.projection.remotePlay()
  if (playing) return true
  await sleep(600)
  return bridge.projection.remotePlay()
}

/** Popup de controle de vídeo local, sem projetar nas telas estendidas. */
export async function openLiturgyLocalVideoControl(
  filePath: string,
  title = '',
): Promise<boolean> {
  return openLiturgyLocalVideo(filePath, title, false)
}

/** Popup de vídeo local + espelho nas telas estendidas. */
export async function playLiturgyLocalVideoOnScreens(
  filePath: string,
  title = '',
): Promise<boolean> {
  return openLiturgyLocalVideo(filePath, title, true)
}

async function openLiturgyLocalImages(
  filePaths: string[],
  title = '',
  withScreens: boolean,
): Promise<boolean> {
  const paths = filePaths.map((entry) => entry.trim()).filter(Boolean)
  if (paths.length === 0) return false

  const label = title.trim() || paths[0]?.split(/[\\/]/).pop() || 'Imagens'
  const bridge = getDesktopBridge()
  if (!bridge?.projection?.openUrl) return false

  closeProjectionModule()
  const monitorIds = await resolveTargetMonitorIds()

  return bridge.projection.openUrl({
    filePaths: paths,
    title: label,
    monitorIds,
    mode: 'image',
    withScreens,
  })
}

/** Popup de controle da galeria de imagens, sem projetar nas telas. */
export async function openLiturgyLocalImageControl(
  filePaths: string[],
  title = '',
): Promise<boolean> {
  return openLiturgyLocalImages(filePaths, title, false)
}

/** Popup de imagens + espelho nas telas estendidas. */
export async function playLiturgyLocalImageOnScreens(
  filePaths: string[],
  title = '',
): Promise<boolean> {
  return openLiturgyLocalImages(filePaths, title, true)
}

async function openLiturgyLocalPdf(
  filePath: string,
  title = '',
  withScreens: boolean,
): Promise<boolean> {
  const path = filePath.trim()
  if (!path) return false

  const label = title.trim() || path.split(/[\\/]/).pop() || 'PDF'
  const bridge = getDesktopBridge()
  if (!bridge?.projection?.openUrl) return false

  closeProjectionModule()
  const monitorIds = await resolveTargetMonitorIds()

  return bridge.projection.openUrl({
    filePath: path,
    title: label,
    monitorIds,
    mode: 'pdf',
    withScreens,
  })
}

/** Popup de controle do PDF, sem projetar nas telas. */
export async function openLiturgyLocalPdfControl(
  filePath: string,
  title = '',
): Promise<boolean> {
  return openLiturgyLocalPdf(filePath, title, false)
}

/** Popup de PDF + espelho nas telas estendidas. */
export async function playLiturgyLocalPdfOnScreens(
  filePath: string,
  title = '',
): Promise<boolean> {
  return openLiturgyLocalPdf(filePath, title, true)
}

async function openLiturgyLocalPresentation(
  filePath: string,
  title = '',
  withScreens: boolean,
): Promise<boolean> {
  const path = filePath.trim()
  if (!path) return false

  const label = title.trim() || path.split(/[\\/]/).pop() || 'Apresentação'
  const bridge = getDesktopBridge()
  if (!bridge?.projection?.openUrl) return false

  const hasOffice = await bridge.presentation?.detectOffice?.()
  if (hasOffice === false) {
    return false
  }

  closeProjectionModule()
  const monitorIds = await resolveTargetMonitorIds()

  return bridge.projection.openUrl({
    filePath: path,
    title: label,
    monitorIds,
    mode: 'presentation',
    withScreens,
  })
}

/** Popup de controle da apresentação, sem projetar nas telas. */
export async function openLiturgyLocalPresentationControl(
  filePath: string,
  title = '',
): Promise<boolean> {
  return openLiturgyLocalPresentation(filePath, title, false)
}

/** Popup de apresentação + espelho nas telas estendidas. */
export async function playLiturgyLocalPresentationOnScreens(
  filePath: string,
  title = '',
): Promise<boolean> {
  return openLiturgyLocalPresentation(filePath, title, true)
}
