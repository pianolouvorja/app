import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { APP_USER_DATA_DIR, WORKSPACE_DIRS } from './constants.mjs'

/** Chave HKLM gravada pelo instalador NSIS (pasta de mídia compartilhada). */
export const WINDOWS_MEDIA_ROOT_REG_KEY = 'HKLM\\Software\\LouvorJA\\PIANO'
export const WINDOWS_MEDIA_ROOT_REG_VALUE = 'MediaRoot'

/** Arquivo compartilhado (ACL do ProgramData) — gravável sem admin nas Configurações. */
export const WINDOWS_MEDIA_ROOT_FILENAME = '.media-root'

/**
 * Pasta padrão de mídia no Windows: %ProgramData%\LouvorJA-PIANO\Media
 * @returns {string}
 */
export function resolveDefaultWindowsMediaRoot() {
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  return path.win32.join(programData, APP_USER_DATA_DIR, WORKSPACE_DIRS.media)
}

/**
 * Normaliza a pasta escolhida pelo usuário para a estrutura canônica
 * `{base}\LouvorJA-PIANO\Media`.
 *
 * - Já termina em `\LouvorJA-PIANO\Media` → mantém
 * - Termina em `\LouvorJA-PIANO` → acrescenta `\Media`
 * - Caso contrário → acrescenta `\LouvorJA-PIANO\Media`
 *
 * @param {string} selectedBase
 * @returns {string}
 */
export function resolveWindowsMediaRootUnderBase(selectedBase) {
  const trimmed = typeof selectedBase === 'string' ? selectedBase.trim() : ''
  if (!trimmed) return ''

  const normalized = path.win32.normalize(trimmed).replace(/[\\/]+$/, '')
  const lower = normalized.toLowerCase()
  const dataSeg = APP_USER_DATA_DIR.toLowerCase()
  const mediaSeg = WORKSPACE_DIRS.media.toLowerCase()
  const fullSuffix = `${dataSeg}\\${mediaSeg}`

  if (lower.endsWith(`\\${fullSuffix}`) || lower === fullSuffix) {
    return normalized
  }
  if (lower.endsWith(`\\${dataSeg}`) || lower === dataSeg) {
    return path.win32.join(normalized, WORKSPACE_DIRS.media)
  }
  return path.win32.join(normalized, APP_USER_DATA_DIR, WORKSPACE_DIRS.media)
}

/**
 * Caminho do arquivo .media-root em ProgramData (sempre o data root padrão).
 * @returns {string}
 */
export function resolveWindowsMediaRootConfigPath() {
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  return path.win32.join(
    programData,
    APP_USER_DATA_DIR,
    WINDOWS_MEDIA_ROOT_FILENAME,
  )
}

/**
 * @param {string} raw
 * @returns {string}
 */
function expandWindowsEnvVars(raw) {
  return raw.replace(/%([^%]+)%/g, (_, name) => {
    const value = process.env[name]
    return value != null && value !== '' ? value : `%${name}%`
  })
}

/**
 * Lê override do arquivo ProgramData\.media-root.
 * @returns {string | null}
 */
export function readWindowsMediaRootFromFile() {
  if (process.platform !== 'win32') return null
  try {
    const configPath = resolveWindowsMediaRootConfigPath()
    if (!existsSync(configPath)) return null
    const raw = readFileSync(configPath, 'utf8').trim()
    if (!raw) return null
    return path.win32.normalize(expandWindowsEnvVars(raw))
  } catch {
    return null
  }
}

/**
 * Lê MediaRoot do registro (instalador). Retorna null se ausente/inválido.
 * Usa /reg:64 para alinhar com SetRegView 64 do NSIS.
 * @returns {string | null}
 */
export function readWindowsMediaRootFromRegistry() {
  if (process.platform !== 'win32') return null

  const result = spawnSync(
    'reg',
    [
      'query',
      WINDOWS_MEDIA_ROOT_REG_KEY,
      '/v',
      WINDOWS_MEDIA_ROOT_REG_VALUE,
      '/reg:64',
    ],
    { windowsHide: true, encoding: 'utf8' },
  )

  if (result.status !== 0) return null

  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  const match = output.match(
    new RegExp(
      `${WINDOWS_MEDIA_ROOT_REG_VALUE}\\s+REG_(?:EXPAND_)?SZ\\s+(.+)$`,
      'im',
    ),
  )
  if (!match) return null

  const raw = match[1].trim()
  if (!raw) return null

  return path.win32.normalize(expandWindowsEnvVars(raw))
}

/**
 * Override efetivo: arquivo (Configurações) tem prioridade sobre HKLM (instalador).
 * @returns {string | null}
 */
export function readWindowsMediaRootOverride() {
  return readWindowsMediaRootFromFile() ?? readWindowsMediaRootFromRegistry()
}

/**
 * Persiste a pasta de mídia para todos os usuários.
 * - Sempre grava `.media-root` em ProgramData (ACL compartilhada).
 * - Tenta HKLM (pode falhar sem elevação — ok).
 * - path vazio/null restaura o padrão (apaga override).
 *
 * @param {string | null} mediaRoot
 * @returns {{ ok: boolean; path: string | null; registryOk: boolean }}
 */
export function writeWindowsMediaRootOverride(mediaRoot) {
  invalidateMediaRootCache()

  if (process.platform !== 'win32') {
    return { ok: false, path: null, registryOk: false }
  }

  const configPath = resolveWindowsMediaRootConfigPath()
  const dataRoot = path.win32.dirname(configPath)
  const normalized =
    mediaRoot && mediaRoot.trim()
      ? path.win32.normalize(mediaRoot.trim())
      : null

  try {
    mkdirSync(dataRoot, { recursive: true })
    if (normalized) {
      writeFileSync(configPath, `${normalized}\n`, 'utf8')
    } else if (existsSync(configPath)) {
      unlinkSync(configPath)
    }
  } catch (error) {
    console.warn('[media-root] falha ao gravar .media-root', error)
    return { ok: false, path: normalized, registryOk: false }
  }

  let registryOk = false
  try {
    if (normalized) {
      const result = spawnSync(
        'reg',
        [
          'add',
          WINDOWS_MEDIA_ROOT_REG_KEY,
          '/v',
          WINDOWS_MEDIA_ROOT_REG_VALUE,
          '/t',
          'REG_EXPAND_SZ',
          '/d',
          normalized,
          '/f',
          '/reg:64',
        ],
        { windowsHide: true, encoding: 'utf8' },
      )
      registryOk = result.status === 0
    } else {
      const result = spawnSync(
        'reg',
        [
          'delete',
          WINDOWS_MEDIA_ROOT_REG_KEY,
          '/v',
          WINDOWS_MEDIA_ROOT_REG_VALUE,
          '/f',
          '/reg:64',
        ],
        { windowsHide: true, encoding: 'utf8' },
      )
      // status != 0 se valor já não existia — trata como ok
      registryOk = result.status === 0 || /unable|unable to find/i.test(
        `${result.stdout || ''} ${result.stderr || ''}`,
      )
    }
  } catch {
    registryOk = false
  }

  return { ok: true, path: normalized, registryOk }
}

/** Cache: no Windows, ler HKLM via `reg query` a cada capa trava a Central. */
let cachedMediaRoot = null
let cachedUserDataRoot = null

export function invalidateMediaRootCache() {
  cachedMediaRoot = null
  cachedUserDataRoot = null
}

/**
 * Resolve a pasta raiz de mídia (covers/music/images).
 * No Windows o resultado é cacheado — registry/arquivo só são lidos de novo
 * após `writeWindowsMediaRootOverride` ou `invalidateMediaRootCache`.
 * @param {string} userDataRoot
 * @returns {string}
 */
export function resolveMediaRoot(userDataRoot) {
  if (process.platform === 'win32') {
    if (cachedMediaRoot && cachedUserDataRoot === userDataRoot) {
      return cachedMediaRoot
    }
    const custom = readWindowsMediaRootOverride()
    const resolved = custom || path.win32.join(userDataRoot, WORKSPACE_DIRS.media)
    cachedMediaRoot = resolved
    cachedUserDataRoot = userDataRoot
    return resolved
  }

  return path.join(userDataRoot, WORKSPACE_DIRS.media)
}
