import { ipcMain } from 'electron'

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
import { registerDialogIpc } from './dialog.mjs'
import {
  hasPresentationOffice,
} from './presentation-convert.mjs'
import {
  broadcastPlaybackSync,
  closeWebProjectionWindows,
  getSourceMediaIdFor,
  getImageSlideState,
  getPdfPageState,
  getPptSlideState,
  getSourceNavigationState,
  getSourcePlaybackState,
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
} from './web-projection.mjs'

export function registerWorkspaceIpc() {
  registerDisplayIpc()
  registerDialogIpc()
  registerProjectionCapturePermissions()

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

  ipcMain.handle('projection:close-url', () => {
    try {
      closeWebProjectionWindows()
      return true
    } catch (error) {
      console.error('[ipc] projection:close-url', error)
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
}
