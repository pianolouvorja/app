/** Versão do app — injetada pelo Vite a partir do package.json */
export const APP_VERSION = `v${__APP_VERSION__}`

/** Nome do produto no Electron (productName / título da janela). */
export const APP_PRODUCT_NAME = 'LouvorJA - PIANO'

/**
 * Nome da pasta de dados legada (per-user).
 * No Windows empacotado os dados ficam em {installDir}/Data (compartilhado).
 */
export const APP_USER_DATA_DIR = 'LouvorJA-PIANO'
