export type MediaFolderType = 'covers' | 'music' | 'slides'

export type ProgressPayload = {
  progress: number
  text?: string
}

export type WorkspaceApi = {
  getRecord: <T = unknown>(filename: string) => Promise<T | null>
  saveRecord: (filename: string, data: unknown) => Promise<boolean>
  clear: () => Promise<boolean>
}

export type CatalogApi = {
  downloadDatabase: () => Promise<boolean>
  extractDatabase: () => Promise<boolean>
  onDownloadProgress: (callback: (payload: ProgressPayload) => void) => () => void
  onExtractProgress: (callback: (payload: ProgressPayload) => void) => () => void
}

export type MediaApi = {
  download: (url: string, mediaType: MediaFolderType, filename: string) => Promise<boolean>
  check: (mediaType: MediaFolderType, filename: string) => Promise<string | false>
  delete: (mediaType: MediaFolderType, filename: string) => Promise<boolean>
}

export type DisplayBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type SystemDisplayInfo = {
  id: number
  bounds: DisplayBounds
  workArea: DisplayBounds
  scaleFactor: number
  isPrimary: boolean
}

export type DisplaysApi = {
  list: () => Promise<SystemDisplayInfo[]>
  identify: () => Promise<boolean>
}

export type OpenUrlProjectionPayload = {
  url: string
  title?: string
  videoId?: string
  monitorIds?: number[]
  fullscreenOnPrimary?: boolean
  mode?: 'video' | 'site'
  withScreens?: boolean
}

export type PlaybackSyncPayload = {
  currentTime: number
  paused: boolean
  ended?: boolean
  updatedAt?: number
}

export type ProjectionPlaybackState = {
  paused: boolean
  currentTime: number
  duration: number
}

export type ProjectionNavigationState = {
  canGoBack: boolean
  canGoForward: boolean
  projecting?: boolean
}

export type ProjectionApi = {
  openUrl: (payload: OpenUrlProjectionPayload) => Promise<boolean>
  closeUrl: () => Promise<boolean>
  getSourceMediaId?: () => Promise<string | null>
  publishPlaybackSync?: (payload: PlaybackSyncPayload) => void
  onPlaybackSync?: (callback: (payload: PlaybackSyncPayload) => void) => () => void
  remotePlay?: () => Promise<boolean>
  remotePause?: () => Promise<boolean>
  remoteSeek?: (seconds: number) => Promise<boolean>
  getPlaybackState?: () => Promise<ProjectionPlaybackState | null>
  getNavigationState?: () => Promise<ProjectionNavigationState | null>
  remoteGoBack?: () => Promise<boolean>
  remoteGoForward?: () => Promise<boolean>
  remoteReload?: () => Promise<boolean>
  toggleSiteScreens?: () => Promise<boolean>
  getSiteTargetMonitors?: () => Promise<number[]>
  setSiteTargetMonitors?: (ids: number[]) => Promise<boolean>
  setSiteControlPanelOpen?: (open: boolean) => Promise<boolean>
  onSiteTargetsChanged?: (callback: (ids: number[]) => void) => () => void
}

export type LouvorJaBridge = {
  platform: string
  isElectron: boolean
  workspace: WorkspaceApi
  catalog: CatalogApi
  media: MediaApi
  displays: DisplaysApi
  projection: ProjectionApi
}
