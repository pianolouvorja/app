import { Client } from 'basic-ftp'
import {
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
  readFileSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { net } from 'electron'

import { API_BASE_URL } from './constants.mjs'
import { obfuscateText, revealText } from './crypto.mjs'
import { getFtpParams } from './ftp.mjs'
import { CatalogExtractor } from './catalog-extractor.mjs'
import {
  ensureWorkspaceDirectories,
  getWorkspacePaths,
  resetWorkspaceDirectories,
  resolveMediaDirectory,
} from './paths.mjs'

/**
 * @param {string} filename
 * @returns {unknown | null}
 */
export function readWorkspaceRecord(filename) {
  const { sysdata } = getWorkspacePaths()
  const filePath = path.join(sysdata, `${filename}.bin`)

  if (existsSync(filePath)) {
    const encryptedContent = readFileSync(filePath, 'utf8')
    const decryptedString = revealText(encryptedContent)
    if (decryptedString) {
      return JSON.parse(decryptedString)
    }
  }

  const plainFilePath = path.join(sysdata, filename)
  if (existsSync(plainFilePath)) {
    const content = readFileSync(plainFilePath, 'utf8')
    const data = JSON.parse(content)

    try {
      const encryptedContent = obfuscateText(content)
      if (encryptedContent) {
        writeFileSync(filePath, encryptedContent, 'utf8')
        unlinkSync(plainFilePath)
      }
    } catch (error) {
      console.error('[workspace] erro ao migrar registro plain → .bin', error)
    }

    return data
  }

  return null
}

/**
 * @param {string} filename
 * @param {unknown} data
 */
export function writeWorkspaceRecord(filename, data) {
  const { sysdata } = getWorkspacePaths()
  ensureWorkspaceDirectories()
  const filePath = path.join(sysdata, `${filename}.bin`)
  const encryptedContent = obfuscateText(JSON.stringify(data))
  if (!encryptedContent) return false
  writeFileSync(filePath, encryptedContent, 'utf8')
  return true
}

export function clearWorkspaceData() {
  resetWorkspaceDirectories()
  return true
}

/**
 * @param {(data: { progress: number }) => void} onProgress
 */
export async function downloadCatalogDatabase(onProgress) {
  const { tempDatabase, downloadCompleteFlag } = getWorkspacePaths()

  if (existsSync(downloadCompleteFlag) && existsSync(tempDatabase)) {
    console.log('[catalog] banco já baixado completamente — pulando FTP')
    onProgress({ progress: 100 })
    return true
  }

  const ftpParams = await getFtpParams()
  const client = new Client()

  try {
    await client.access({
      host: ftpParams.host,
      user: ftpParams.username,
      password: ftpParams.password,
      port: Number.parseInt(ftpParams.port || '21', 10),
      secure: false,
    })

    const langPrefix = (ftpParams.lang || 'pt').toLowerCase()
    const root = ftpParams.root || '/'
    const remotePath = `${root}${root.endsWith('/') ? '' : '/'}config/${langPrefix}_database.db`

    // Check de tamanho secundário: retomada/overwrite quando a flag não existe
    let size = 0
    try {
      size = await client.size(remotePath)
    } catch (error) {
      console.warn('[catalog] não foi possível obter tamanho FTP', error)
    }

    if (size > 0 && existsSync(tempDatabase)) {
      const localStat = statSync(tempDatabase)
      if (localStat.size === size) {
        console.log('[catalog] banco local completo — pulando download e gravando flag')
        writeFileSync(downloadCompleteFlag, '1')
        onProgress({ progress: 100 })
        return true
      }
    }

    client.trackProgress((info) => {
      if (size > 0) {
        onProgress({ progress: Math.floor((info.bytesOverall / size) * 100) })
      }
    })

    await client.downloadTo(tempDatabase, remotePath)
    writeFileSync(downloadCompleteFlag, '1')
    return true
  } finally {
    client.close()
  }
}

/**
 * @param {(data: { text: string, progress: number }) => void} onProgress
 */
export async function extractCatalogDatabase(onProgress) {
  const { tempDatabase, downloadCompleteFlag } = getWorkspacePaths()
  if (!existsSync(tempDatabase)) {
    throw new Error(`Arquivo não encontrado em: ${tempDatabase}`)
  }

  const extractor = new CatalogExtractor(tempDatabase)
  await extractor.extract(onProgress)

  try {
    unlinkSync(tempDatabase)
    if (existsSync(downloadCompleteFlag)) unlinkSync(downloadCompleteFlag)
  } catch (error) {
    console.error('[catalog] erro ao excluir database.db após extração', error)
  }

  return true
}

/**
 * @param {'covers' | 'music' | 'slides'} mediaType
 * @param {string} filename
 */
function buildApiMediaUrl(mediaType, filename) {
  let urlFolder = 'covers'
  if (mediaType === 'music') urlFolder = 'musics'
  else if (mediaType === 'slides') urlFolder = 'images'

  const cleanFilename = filename.replace(/\\/g, '/')
  return `${API_BASE_URL}/file/${urlFolder}/${encodeURIComponent(cleanFilename).replace(/%2F/g, '/')}`
}

/** @type {boolean} */
let useFtpFallback = false
/** @type {ReturnType<typeof setTimeout> | null} */
let ftpFallbackTimer = null

function resetFtpFallbackTimer() {
  if (ftpFallbackTimer) clearTimeout(ftpFallbackTimer)
  ftpFallbackTimer = setTimeout(() => {
    useFtpFallback = false
  }, 120_000)
}

/**
 * @param {'covers' | 'music' | 'slides'} mediaType
 * @param {string} filename
 * @param {string} filePath
 */
async function downloadMediaViaFtp(mediaType, filename, filePath) {
  const ftpParams = await getFtpParams()

  let ftpFolder = 'config/capas'
  if (mediaType === 'music') ftpFolder = 'config/musicas'
  else if (mediaType === 'slides') ftpFolder = 'config/imagens'

  let cleanFilename = filename
  if (cleanFilename.startsWith('pt/') || cleanFilename.startsWith('es/')) {
    cleanFilename = cleanFilename.slice(3)
  }

  const root = ftpParams.root || '/'
  const remotePath = `${root}${root.endsWith('/') ? '' : '/'}${ftpFolder}/${cleanFilename}`

  const client = new Client(12_000)
  try {
    await client.access({
      host: ftpParams.host,
      user: ftpParams.username,
      password: ftpParams.password,
      port: Number.parseInt(ftpParams.port || '21', 10),
      secure: false,
    })
    await client.downloadTo(filePath, remotePath)
  } finally {
    client.close()
  }
}

/**
 * @param {string} _url
 * @param {'covers' | 'music' | 'slides'} mediaType
 * @param {string} filename
 */
export async function downloadMediaFile(_url, mediaType, filename) {
  const TIMEOUT_MS = 20_000

  /** @returns {Promise<boolean>} */
  const run = async () => {
    await getFtpParams().catch((error) => {
      console.warn('[media] pré-fetch FTP falhou:', error.message)
    })

    const destFolder = resolveMediaDirectory(mediaType)
    const decodedFilename = decodeURIComponent(filename)
    const filePath = path.join(destFolder, decodedFilename)
    mkdirSync(path.dirname(filePath), { recursive: true })

    if (useFtpFallback) {
      resetFtpFallbackTimer()
      await downloadMediaViaFtp(mediaType, decodedFilename, filePath)
      return true
    }

    const apiUrl = buildApiMediaUrl(mediaType, decodedFilename)
    const response = await net.fetch(apiUrl)

    if (response.status === 429) {
      useFtpFallback = true
      resetFtpFallbackTimer()
      await downloadMediaViaFtp(mediaType, decodedFilename, filePath)
      return true
    }

    if (!response.ok) return false

    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(filePath, buffer)
    return true
  }

  let timer
  try {
    const work = run()
    // Evita unhandled rejection se o timeout vencer primeiro.
    work.catch(() => {})
    return await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`media download timeout (${TIMEOUT_MS}ms)`))
        }, TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    console.warn('[media] download falhou/timeout:', error?.message || error)
    // Se FTP travou, volta para API na próxima tentativa.
    useFtpFallback = false
    return false
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * @param {'covers' | 'music' | 'slides'} mediaType
 * @param {string} filename
 */
export function checkMediaFile(mediaType, filename) {
  const destFolder = resolveMediaDirectory(mediaType)
  const decodedFilename = decodeURIComponent(filename)
  const filePath = path.join(destFolder, decodedFilename)

  if (!existsSync(filePath)) return false

  const cleanFilename = decodedFilename.replace(/\\/g, '/')
  const mappedType = mediaType === 'slides' ? 'images' : mediaType
  return `local://media/${mappedType}/${cleanFilename}`
}

/**
 * @param {'covers' | 'music' | 'slides'} mediaType
 * @param {string} filename
 */
export function deleteMediaFile(mediaType, filename) {
  const destFolder = resolveMediaDirectory(mediaType)
  const decodedFilename = decodeURIComponent(filename)
  const filePath = path.join(destFolder, decodedFilename)

  if (!existsSync(filePath)) return true

  try {
    unlinkSync(filePath)
    return true
  } catch (error) {
    console.error('[media] erro ao deletar', error)
    return false
  }
}
