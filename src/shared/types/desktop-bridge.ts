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

export type LouvorJaBridge = {
  platform: string
  isElectron: boolean
  workspace: WorkspaceApi
  catalog: CatalogApi
  media: MediaApi
  displays: DisplaysApi
}
