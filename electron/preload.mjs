import { contextBridge, ipcRenderer } from 'electron'

/**
 * @template T
 * @param {string} channel
 * @param {(payload: T) => void} callback
 */
function subscribe(channel, callback) {
  /** @param {Electron.IpcRendererEvent} _event @param {T} payload */
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('louvorja', {
  platform: process.platform,
  isElectron: true,

  workspace: {
    getRecord: (filename) => ipcRenderer.invoke('workspace:get-record', filename),
    saveRecord: (filename, data) => ipcRenderer.invoke('workspace:save-record', filename, data),
    clear: () => ipcRenderer.invoke('workspace:clear'),
  },

  catalog: {
    downloadDatabase: () => ipcRenderer.invoke('catalog:download-database'),
    extractDatabase: () => ipcRenderer.invoke('catalog:extract-database'),
    onDownloadProgress: (callback) => subscribe('catalog:download-progress', callback),
    onExtractProgress: (callback) => subscribe('catalog:extract-progress', callback),
  },

  media: {
    download: (url, mediaType, filename) =>
      ipcRenderer.invoke('media:download', url, mediaType, filename),
    check: (mediaType, filename) => ipcRenderer.invoke('media:check', mediaType, filename),
    delete: (mediaType, filename) => ipcRenderer.invoke('media:delete', mediaType, filename),
  },

  displays: {
    list: () => ipcRenderer.invoke('displays:list'),
    identify: () => ipcRenderer.invoke('displays:identify'),
  },
})
