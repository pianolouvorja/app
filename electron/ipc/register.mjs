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

export function registerWorkspaceIpc() {
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
      return false
    }
  })

  ipcMain.handle('catalog:extract-database', async (event) => {
    try {
      return await extractCatalogDatabase((data) => {
        event.sender.send('catalog:extract-progress', data)
      })
    } catch (error) {
      console.error('[ipc] catalog:extract-database', error)
      return false
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
