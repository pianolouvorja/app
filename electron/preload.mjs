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

  window: {
    control: (action) => ipcRenderer.invoke('window:control', action),
    onMaximizedState: (callback) => subscribe('window:maximized-state', callback),
  },

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

  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:open-file', options ?? {}),
  },

  presentation: {
    detectOffice: () => ipcRenderer.invoke('presentation:detect-office'),
  },

  projection: {
    openUrl: (payload) => ipcRenderer.invoke('projection:open-url', payload),
    closeUrl: () => ipcRenderer.invoke('projection:close-url'),
    getSourceMediaId: () => ipcRenderer.invoke('projection:get-source-media-id'),
    publishPlaybackSync: (payload) => {
      ipcRenderer.send('projection:playback-sync', payload)
    },
    onPlaybackSync: (callback) => subscribe('projection:playback-sync', callback),
    remotePlay: () => ipcRenderer.invoke('projection:remote-play'),
    remotePause: () => ipcRenderer.invoke('projection:remote-pause'),
    remoteSeek: (seconds) => ipcRenderer.invoke('projection:remote-seek', seconds),
    remoteToggleMute: () => ipcRenderer.invoke('projection:remote-toggle-mute'),
    remoteSetVolume: (volume) =>
      ipcRenderer.invoke('projection:remote-set-volume', volume),
    getPlaybackState: () => ipcRenderer.invoke('projection:get-playback-state'),
    getNavigationState: () => ipcRenderer.invoke('projection:get-navigation-state'),
    remoteGoBack: () => ipcRenderer.invoke('projection:remote-go-back'),
    remoteGoForward: () => ipcRenderer.invoke('projection:remote-go-forward'),
    remoteReload: () => ipcRenderer.invoke('projection:remote-reload'),
    toggleSiteScreens: () => ipcRenderer.invoke('projection:toggle-site-screens'),
    toggleVideoScreens: () => ipcRenderer.invoke('projection:toggle-video-screens'),
    remoteImageNext: () => ipcRenderer.invoke('projection:remote-image-next'),
    remoteImagePrev: () => ipcRenderer.invoke('projection:remote-image-prev'),
    getImageSlideState: () =>
      ipcRenderer.invoke('projection:get-image-slide-state'),
    remotePdfNext: () => ipcRenderer.invoke('projection:remote-pdf-next'),
    remotePdfPrev: () => ipcRenderer.invoke('projection:remote-pdf-prev'),
    getPdfPageState: () => ipcRenderer.invoke('projection:get-pdf-page-state'),
    remotePptNext: () => ipcRenderer.invoke('projection:remote-ppt-next'),
    remotePptPrev: () => ipcRenderer.invoke('projection:remote-ppt-prev'),
    getPptSlideState: () =>
      ipcRenderer.invoke('projection:get-ppt-slide-state'),
    getSiteTargetMonitors: () =>
      ipcRenderer.invoke('projection:get-site-target-monitors'),
    setSiteTargetMonitors: (ids) =>
      ipcRenderer.invoke('projection:set-site-target-monitors', ids),
    getVideoTargetMonitors: () =>
      ipcRenderer.invoke('projection:get-video-target-monitors'),
    setVideoTargetMonitors: (ids) =>
      ipcRenderer.invoke('projection:set-video-target-monitors', ids),
    setSiteControlPanelOpen: (open) =>
      ipcRenderer.invoke('projection:set-site-control-panel-open', open),
    onSiteTargetsChanged: (callback) =>
      subscribe('projection:site-targets-changed', callback),
    onVideoTargetsChanged: (callback) =>
      subscribe('projection:video-targets-changed', callback),
  },
})
