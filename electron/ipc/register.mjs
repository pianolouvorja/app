import { ipcMain } from 'electron'

import { detectClassoInstallation, probeClassoRegistry } from '../classo-detect.mjs'
import {
  analyzeLegacyMediaImport,
  importLegacyMediaItems,
} from '../legacy-media-import.mjs'

import {
  checkMediaFile,
  clearWorkspaceData,
  deleteMediaFile,
  downloadCatalogDatabase,
  downloadMediaFile,
  extractCatalogDatabase,
  readWorkspaceRecord,
  writeWorkspaceRecord,
} from '../workspace.mjs'
import { registerDisplayIpc } from './displays.mjs'
import { registerDialogIpc, registerReadBinaryFileIpc } from './dialog.mjs'
import { probeMediaDurationMsMain } from './media-probe.mjs'
import {
  hasPresentationOffice,
} from './presentation-convert.mjs'
import {
  broadcastPlaybackSync,
  closeAllProjectionWindows,
  closeWebProjectionWindows,
  getSourceMediaIdFor,
  getImageSlideState,
  getPdfPageState,
  getPptSlideState,
  getSourceNavigationState,
  getSourcePlaybackState,
  captureSourceFrameBase64,
  getVideoTargetMonitorIds,
  openWebProjectionWindows,
  registerProjectionCapturePermissions,
  remoteGoBackSource,
  remoteGoForwardSource,
  remoteImageNext,
  remoteImagePrev,
  remotePdfNext,
  remotePdfPrev,
  remotePptNext,
  remotePptPrev,
  remotePauseSource,
  remotePlaySource,
  remoteReloadSource,
  remoteSeekSource,
  remoteSetVolumeSource,
  remoteToggleMuteSource,
  setSiteControlPanelOpen,
  setSiteTargetMonitorIds,
  getSiteTargetMonitorIds,
  setVideoTargetMonitorIds,
  toggleSiteProjectionScreens,
  toggleVideoProjectionScreens,
  getSourceMediaInfo,
  isExternalProjectionAlive, } from './web-projection.mjs'
import { collectAliveProjectionWindows, isProjectionPopupWindow } from '../projection-hotkey.mjs'

export function registerWorkspaceIpc() {
  registerDisplayIpc()
  registerDialogIpc()
  registerReadBinaryFileIpc()
  registerProjectionCapturePermissions()

  // Wakeup do receiver (spec multi-telas): abre o app Palco em devices
  // com dev mode (simulador/TV) via ares-launch. Best-effort: falha
  // silenciosa — sem device, o receiver browser/simulador manual segue.
  const wakeDebounce = { last: 0 }
  ipcMain.handle('palco:wake', async () => {
    const now = Date.now()
    if (now - wakeDebounce.last < 30_000) return { ok: false, skipped: 'debounce' }
    wakeDebounce.last = now
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const exec = promisify(execFile)
    const npmBin = `${process.env.HOME}/.npm-global/bin`
    const results = []
    for (const dev of ['emulator', 'tv']) {
      try {
        await exec(`${npmBin}/ares-launch`, ['-d', dev, 'com.piano.louvorja.palco'], { timeout: 8000 })
        results.push(`${dev}:ok`)
      } catch {
        results.push(`${dev}:skip`)
      }
    }
    return { ok: results.some((r) => r.endsWith(':ok')), results }
  })

  ipcMain.handle('projection:open-url', async (_event, payload) => {
    try {
      return await openWebProjectionWindows(payload ?? {})
    } catch (error) {
      console.error('[ipc] projection:open-url', error)
      return false
    }
  })

  ipcMain.handle('presentation:detect-office', () => {
    try {
      return hasPresentationOffice()
    } catch (error) {
      console.error('[ipc] presentation:detect-office', error)
      return false
    }
  })

  // Player HTML avisou que o vídeo acabou → fecha projeção (autoclose).
  ipcMain.on('projection:video-ended', () => {
    try {
      closeWebProjectionWindows()
    } catch (error) {
      console.error('[ipc] projection:video-ended', error)
    }
  })

  ipcMain.handle('projection:close-url', () => {
    try {
      closeAllProjectionWindows()
      return true
    } catch (error) {
      console.error('[ipc] projection:close-url', error)
      return false
    }
  })

  ipcMain.handle('projection:external-alive', () => {
    try {
      // Fonte única: popups (hinos/slides) + web-projection (vídeo/pdf/site)
      const hasPopup = collectAliveProjectionWindows().some((win) => isProjectionPopupWindow(win.webContents.getURL()))
      return Boolean(hasPopup || isExternalProjectionAlive())
    } catch {
      return false
    }
  })

  ipcMain.handle('projection:get-source-media-id', (event) => {
    try {
      return getSourceMediaIdFor(event.sender)
    } catch (error) {
      console.error('[ipc] projection:get-source-media-id', error)
      return null
    }
  })

  ipcMain.on('projection:playback-sync', (_event, payload) => {
    try {
      broadcastPlaybackSync(payload)
    } catch (error) {
      console.error('[ipc] projection:playback-sync', error)
    }
  })

  ipcMain.handle('projection:remote-play', async () => {
    try {
      return await remotePlaySource()
    } catch (error) {
      console.error('[ipc] projection:remote-play', error)
      return false
    }
  })

  ipcMain.handle('projection:remote-pause', async () => {
    try {
      return await remotePauseSource()
    } catch (error) {
      console.error('[ipc] projection:remote-pause', error)
      return false
    }
  })

  ipcMain.handle('projection:remote-seek', async (_event, seconds) => {
    try {
      return await remoteSeekSource(seconds)
    } catch (error) {
      console.error('[ipc] projection:remote-seek', error)
      return false
    }
  })

  ipcMain.handle('projection:remote-toggle-mute', async () => {
    try {
      return await remoteToggleMuteSource()
    } catch (error) {
      console.error('[ipc] projection:remote-toggle-mute', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-set-volume', async (_event, volume) => {
    try {
      return await remoteSetVolumeSource(volume)
    } catch (error) {
      console.error('[ipc] projection:remote-set-volume', error)
      return null
    }
  })

  ipcMain.handle('projection:get-source-media-info', () => {
    try {
      return getSourceMediaInfo()
    } catch (error) {
      console.error('[ipc] projection:get-source-media-info', error)
      return { filePath: '', title: '' }
    }
  })

  ipcMain.handle('projection:get-playback-state', async () => {
    try {
      return await getSourcePlaybackState()
    } catch (error) {
      console.error('[ipc] projection:get-playback-state', error)
      return null
    }
  })

  ipcMain.handle('projection:get-navigation-state', async () => {
    try {
      return await getSourceNavigationState()
    } catch (error) {
      console.error('[ipc] projection:get-navigation-state', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-go-back', () => {
    try {
      return remoteGoBackSource()
    } catch (error) {
      console.error('[ipc] projection:remote-go-back', error)
      return false
    }
  })

  ipcMain.handle('projection:remote-go-forward', () => {
    try {
      return remoteGoForwardSource()
    } catch (error) {
      console.error('[ipc] projection:remote-go-forward', error)
      return false
    }
  })

  ipcMain.handle('projection:remote-reload', () => {
    try {
      return remoteReloadSource()
    } catch (error) {
      console.error('[ipc] projection:remote-reload', error)
      return false
    }
  })

  ipcMain.handle('projection:toggle-site-screens', () => {
    try {
      return toggleSiteProjectionScreens()
    } catch (error) {
      console.error('[ipc] projection:toggle-site-screens', error)
      return false
    }
  })

  ipcMain.handle('projection:toggle-video-screens', () => {
    try {
      return toggleVideoProjectionScreens()
    } catch (error) {
      console.error('[ipc] projection:toggle-video-screens', error)
      return false
    }
  })

  ipcMain.handle('projection:remote-image-next', async () => {
    try {
      return await remoteImageNext()
    } catch (error) {
      console.error('[ipc] projection:remote-image-next', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-image-prev', async () => {
    try {
      return await remoteImagePrev()
    } catch (error) {
      console.error('[ipc] projection:remote-image-prev', error)
      return null
    }
  })

  ipcMain.handle('projection:get-image-slide-state', async () => {
    try {
      return await getImageSlideState()
    } catch (error) {
      console.error('[ipc] projection:get-image-slide-state', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-pdf-next', async () => {
    try {
      return await remotePdfNext()
    } catch (error) {
      console.error('[ipc] projection:remote-pdf-next', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-pdf-prev', async () => {
    try {
      return await remotePdfPrev()
    } catch (error) {
      console.error('[ipc] projection:remote-pdf-prev', error)
      return null
    }
  })

  ipcMain.handle('projection:get-pdf-page-state', async () => {
    try {
      return await getPdfPageState()
    } catch (error) {
      console.error('[ipc] projection:get-pdf-page-state', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-ppt-next', async () => {
    try {
      return await remotePptNext()
    } catch (error) {
      console.error('[ipc] projection:remote-ppt-next', error)
      return null
    }
  })

  ipcMain.handle('projection:remote-ppt-prev', async () => {
    try {
      return await remotePptPrev()
    } catch (error) {
      console.error('[ipc] projection:remote-ppt-prev', error)
      return null
    }
  })

  ipcMain.handle('projection:capture-source-frame', async () => {
    try {
      return await captureSourceFrameBase64()
    } catch (error) {
      console.error('[ipc] projection:capture-source-frame', error)
      return null
    }
  })

  ipcMain.handle('projection:get-ppt-slide-state', async () => {
    try {
      return await getPptSlideState()
    } catch (error) {
      console.error('[ipc] projection:get-ppt-slide-state', error)
      return null
    }
  })

  ipcMain.handle('projection:get-site-target-monitors', () => {
    try {
      return getSiteTargetMonitorIds()
    } catch (error) {
      console.error('[ipc] projection:get-site-target-monitors', error)
      return []
    }
  })

  ipcMain.handle('projection:set-site-target-monitors', (_event, ids) => {
    try {
      return setSiteTargetMonitorIds(ids)
    } catch (error) {
      console.error('[ipc] projection:set-site-target-monitors', error)
      return false
    }
  })

  ipcMain.handle('projection:get-video-target-monitors', () => {
    try {
      return getVideoTargetMonitorIds()
    } catch (error) {
      console.error('[ipc] projection:get-video-target-monitors', error)
      return []
    }
  })

  ipcMain.handle('projection:set-video-target-monitors', (_event, ids) => {
    try {
      return setVideoTargetMonitorIds(ids)
    } catch (error) {
      console.error('[ipc] projection:set-video-target-monitors', error)
      return false
    }
  })

  ipcMain.handle('projection:set-site-control-panel-open', (_event, open) => {
    try {
      return setSiteControlPanelOpen(open)
    } catch (error) {
      console.error('[ipc] projection:set-site-control-panel-open', error)
      return false
    }
  })

  ipcMain.handle('workspace:get-record', (_event, filename) => {
    try {
      return readWorkspaceRecord(filename)
    } catch {
      return null
    }
  })

  ipcMain.handle('workspace:save-record', (_event, filename, data) => {
    try {
      return writeWorkspaceRecord(filename, data)
    } catch {
      return false
    }
  })

  ipcMain.handle('workspace:clear', () => {
    try {
      return clearWorkspaceData()
    } catch (error) {
      console.error('[ipc] workspace:clear', error)
      return false
    }
  })

  ipcMain.handle('catalog:download-database', async (event) => {
    try {
      return await downloadCatalogDatabase((data) => {
        event.sender.send('catalog:download-progress', data)
      })
    } catch (error) {
      console.error('[ipc] catalog:download-database', error)
      throw error
    }
  })

  ipcMain.handle('catalog:extract-database', async (event) => {
    try {
      return await extractCatalogDatabase((data) => {
        event.sender.send('catalog:extract-progress', data)
      })
    } catch (error) {
      console.error('[ipc] catalog:extract-database', error)
      throw error
    }
  })

  // Detector da instalação do LouvorJA Classo (Delphi) — issue #142
  ipcMain.handle('classo:detect', () => {
    try {
      return detectClassoInstallation({ registryProbe: probeClassoRegistry })
    } catch (error) {
      console.error('[ipc] classo:detect', error)
      return { found: false, root: null, media: { albums: [], totalBytes: 0 }, dataFiles: null }
    }
  })

  // Importação de mídia do Louvor JA legado (Windows: config/capas|imagens|musicas)
  ipcMain.handle('legacy-media:analyze', () => {
    try {
      const analysis = analyzeLegacyMediaImport({
        registryConfigProbe: () => {
          const root = probeClassoRegistry()
          if (!root) return null
          return root.replace(/[\\/]+$/, '') + '\\config'
        },
      })
      // Não serializa absolutePath de todos os itens na resposta leve — só
      // contagens. O import reanalisa no main.
      return {
        found: analysis.found,
        configDir: analysis.configDir,
        lang: analysis.lang,
        scanned: analysis.scanned,
        missing: analysis.missing,
        present: analysis.present,
        totalBytes: analysis.totalBytes,
        missingBytes: analysis.missingBytes,
        counts: analysis.counts,
      }
    } catch (error) {
      console.error('[ipc] legacy-media:analyze', error)
      return {
        found: false,
        configDir: null,
        lang: 'pt',
        scanned: 0,
        missing: 0,
        present: 0,
        totalBytes: 0,
        missingBytes: 0,
        counts: { covers: 0, music: 0, slides: 0 },
      }
    }
  })

  ipcMain.handle('legacy-media:import', async (event) => {
    try {
      const analysis = analyzeLegacyMediaImport({
        registryConfigProbe: () => {
          const root = probeClassoRegistry()
          if (!root) return null
          return root.replace(/[\\/]+$/, '') + '\\config'
        },
      })
      if (!analysis.found) {
        return { ok: false, imported: 0, skipped: 0, failed: 0, total: 0, reason: 'not-found' }
      }
      if (analysis.itemsToImport.length === 0) {
        return { ok: true, imported: 0, skipped: analysis.present, failed: 0, total: 0, reason: 'nothing-to-import' }
      }

      const result = importLegacyMediaItems(analysis.itemsToImport, (progress) => {
        event.sender.send('legacy-media:import-progress', progress)
      })
      return { ok: true, ...result, reason: 'done' }
    } catch (error) {
      console.error('[ipc] legacy-media:import', error)
      return { ok: false, imported: 0, skipped: 0, failed: 0, total: 0, reason: 'error' }
    }
  })

  ipcMain.handle('media:download', async (_event, url, mediaType, filename) => {
    try {
      return await downloadMediaFile(url, mediaType, filename)
    } catch (error) {
      console.error('[ipc] media:download', error)
      return false
    }
  })

  ipcMain.handle('media:check', (_event, mediaType, filename) => {
    return checkMediaFile(mediaType, filename)
  })

  ipcMain.handle('media:delete', (_event, mediaType, filename) => {
    return deleteMediaFile(mediaType, filename)
  })

  ipcMain.handle('media:probe-duration', async (_event, path) => {
    try {
      return await probeMediaDurationMsMain(String(path ?? ''))
    } catch (error) {
      console.error('[ipc] media:probe-duration', error)
      return 0
    }
  })
}
