/** Chaves de persistência no browser (localStorage / sessionStorage). */
export const BROWSER_STORAGE_KEYS = {
  userPreferences: 'user_data',
  recentCollections: 'history_recent_collections',
  topSongs: 'history_top_songs',
  catalogSessionPrefix: 'db:',
} as const

/** Campos dentro de `user_data` (preferências do operador). */
export const USER_PREFERENCE_KEYS = {
  theme: 'theme',
  blur: 'blur',
} as const

/** Registros do workspace em disco (`.sysdata/*.bin`). */
export const WORKSPACE_RECORD_KEYS = {
  bootstrapComplete: 'bootstrap_complete',
  coversSynced: 'covers_synced',
  downloadedAlbums: 'downloaded_albums',
  config: 'config',
} as const
