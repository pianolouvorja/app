/** Nome do produto no SO (janela, atalhos, productName do build). */
export const APP_PRODUCT_NAME = 'LouvorJA - PIANO'

/** Pasta userData no ambiente do cliente (ex.: ~/.config/LouvorJA-PIANO). */
export const APP_USER_DATA_DIR = 'LouvorJA-PIANO'

export const WORKSPACE_DIRS = {
  sysdata: '.sysdata',
  media: 'Media',
  covers: 'covers',
  music: 'music',
  images: 'images',
}

/** Arquivo SQLite temporário baixado no first-boot (removido após extração). */
export const TEMP_DATABASE_FILE = 'database.db'

/** Marca download FTP concluído — evita re-download em retentativas do first-boot. */
export const DB_DOWNLOAD_COMPLETE_FLAG = 'db_download_complete.flag'

export const MEDIA_FOLDER_BY_TYPE = {
  covers: 'covers',
  music: 'music',
  slides: 'images',
}

/** Base da API usada pelo main-process (fallback de mídia no protocolo local://).
 * Override via PIANO_API_BASE_URL p/ testes com espelho/túnel (ver pitfall 60). */
export const API_BASE_URL =
  process.env.PIANO_API_BASE_URL ?? 'https://api.louvorja.com.br'
