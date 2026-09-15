/**
 * FTP legado removido do first-boot e dos downloads de mídia.
 * Catálogo: sync HTTP via API Piano (`/json_db`).
 * Mídia: `API_BASE_URL/file/...`.
 */

/** @type {Record<string, string> | null} */
let cachedFtpParams = null

/**
 * @deprecated Sem uso — lança erro de propósito.
 * @returns {Promise<Record<string, string>>}
 */
export async function getFtpParams() {
  throw new Error(
    'FTP legado removido — catálogo e mídia usam a API Piano (HTTP)',
  )
}

export function clearFtpParamsCache() {
  cachedFtpParams = null
}
