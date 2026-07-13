export type LibraryAlbumStatus =
  | 'idle'
  | 'downloading'
  | 'downloaded'
  | 'error'

export type LibraryAlbumId = string | number

export type LibraryAlbum = {
  id: LibraryAlbumId
  name: string
  subtitle: string
  coverUrl: string | null
  rawCoverUrl: string | null
  status: LibraryAlbumStatus
  progress: number
  progressText: string
  totalCount: number
  downloadedCount: number
  isHymnal: boolean
  /** Quantidade de hinos (apenas hinários). */
  songCount: number | null
  cancelRequested: boolean
}

export type LibraryCategory = {
  id: string | number
  name: string
  albums: LibraryAlbum[]
}

export type CatalogCategoryAlbum = {
  id_album: number
  name: string
  subtitle?: string
  url_image?: string | null
}

export type CatalogCategory = {
  id_category: number | string
  name: string
  albums?: CatalogCategoryAlbum[]
}

export type CatalogAlbumRecord = {
  musics?: Array<{ id_music: number | string }>
}

export type CatalogMusicRecord = {
  url_music?: string | null
  url_instrumental_music?: string | null
  url_image?: string | null
  lyric?: Array<{ url_image?: string | null }> | Record<string, { url_image?: string | null }>
}

export type CatalogHymnalEntry = {
  id_music: number | string
}

export type MediaDownloadItem = {
  url: string
  type: 'music' | 'slides' | 'covers'
}

export type DownloadFailureReason = 'offline' | 'server' | 'cancelled' | 'unknown' | null
