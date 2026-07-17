export type AlbumCollectionKind = 'hymnal' | 'album'

export type AlbumCollectionId = string | number

export type AlbumCollection = {
  id: AlbumCollectionId
  kind: AlbumCollectionKind
  name: string
  subtitle: string
  coverUrl: string | null
  trackCount: number | null
  /** Arquivo de catálogo: pt_hymnal, pt_hymnal_1996 ou album_{id} */
  catalogKey: string
}

export type AlbumCategory = {
  id: string | number
  name: string
  collections: AlbumCollection[]
}

export type AlbumTrack = {
  musicId: number
  name: string
  track: number | null
  durationLabel: string
  hasInstrumental: boolean
}

/** Resultado da busca global (home/álbuns), com subtítulo de álbuns. */
export type AlbumSearchHit = AlbumTrack & {
  albumNames: string
  /** Título sem número (o número do hinário vai em `track`). */
  displayTitle: string
  /** True quando `track` veio de um álbum do tipo hinário. */
  isHymnal: boolean
  /** Todos os números de hinário associados (busca por número). */
  hymnalTracks: number[]
}

export type AlbumLyricLine = {
  order: number
  text: string
}

export type AlbumLyricDocument = {
  musicId: number
  title: string
  lines: AlbumLyricLine[]
}
