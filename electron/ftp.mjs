import { net } from 'electron'

import { API_BASE_URL } from './constants.mjs'

/** @type {Record<string, string> | null} */
let cachedFtpParams = null

/**
 * Busca e autoriza credenciais FTP via API (mesmo fluxo do desktop legado).
 * @returns {Promise<Record<string, string>>}
 */
export async function getFtpParams() {
  if (cachedFtpParams) return cachedFtpParams

  const response = await net.fetch(`${API_BASE_URL}/params?type=env`)
  if (!response.ok) {
    throw new Error('Falha ao buscar parâmetros de ambiente')
  }

  const text = await response.text()
  /** @type {Record<string, string>} */
  const params = {}
  text.split('\n').forEach((line) => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      params[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  })

  const connFtp = params.conn_ftp
  if (!connFtp) {
    throw new Error('conn_ftp não encontrado')
  }

  const payload = Buffer.from('pc_name=Electron&lang=PT').toString('base64')
  const ftpUrl = `${connFtp}${connFtp.includes('?') ? '&' : '?'}data=${payload}&lang=PT`

  const ftpResponse = await net.fetch(ftpUrl)
  if (!ftpResponse.ok) {
    throw new Error('Falha ao autorizar FTP')
  }

  const encodedFtpParams = await ftpResponse.text()
  const decodedFtpText = Buffer.from(encodedFtpParams, 'base64').toString('utf8')
  /** @type {Record<string, string>} */
  const ftpParams = {}
  decodedFtpText.split('\n').forEach((line) => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      ftpParams[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  })

  cachedFtpParams = ftpParams
  return ftpParams
}

export function clearFtpParamsCache() {
  cachedFtpParams = null
}
