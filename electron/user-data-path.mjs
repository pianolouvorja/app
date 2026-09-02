import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

import { APP_USER_DATA_DIR } from './constants.mjs'

/** Subpasta legada (build anterior) dentro de Program Files — somente para migração. */
export const LEGACY_WINDOWS_PROGRAM_FILES_DATA_DIR = 'Data'

const MIGRATION_FLAG = '.migrated-from-roaming'

/**
 * Caminho compartilhado no Windows: C:\ProgramData\LouvorJA-PIANO
 * (gravável por todos os usuários; Program Files é somente leitura).
 * @returns {string}
 */
export function resolveWindowsSharedUserDataPath() {
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  return path.win32.join(programData, APP_USER_DATA_DIR)
}

/**
 * Caminho legado por usuário (%APPDATA%\\LouvorJA-PIANO no Windows).
 * @returns {string | null}
 */
export function resolveLegacyPerUserRoamingPath() {
  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA
    return roaming ? path.win32.join(roaming, APP_USER_DATA_DIR) : null
  }

  return path.join(app.getPath('appData'), APP_USER_DATA_DIR)
}

/**
 * Caminho legado da tentativa anterior (Program Files\\...\\Data).
 * @returns {string | null}
 */
export function resolveLegacyProgramFilesDataPath() {
  if (process.platform !== 'win32') return null

  const installDir = path.win32.dirname(app.getPath('exe'))
  return path.win32.join(installDir, LEGACY_WINDOWS_PROGRAM_FILES_DATA_DIR)
}

/**
 * Origens legadas em ordem de prioridade para migração.
 * @returns {string[]}
 */
export function resolveLegacyDataPaths() {
  const candidates = [
    resolveLegacyPerUserRoamingPath(),
    resolveLegacyProgramFilesDataPath(),
  ]

  return [...new Set(candidates.filter(Boolean))]
}

/**
 * Resolve o diretório de dados do app.
 * Windows (empacotado): %ProgramData%\\LouvorJA-PIANO — compartilhado entre perfis.
 * Demais casos: comportamento per-user padrão.
 *
 * @param {{ isDev?: boolean }} [options]
 * @returns {string}
 */
export function resolveUserDataPath({ isDev = false } = {}) {
  if (process.platform === 'win32' && !isDev) {
    return resolveWindowsSharedUserDataPath()
  }

  return path.join(app.getPath('appData'), APP_USER_DATA_DIR)
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
function directoryHasUserContent(dir) {
  if (!existsSync(dir)) return false

  return readdirSync(dir).some((entry) => entry !== MIGRATION_FLAG)
}

/**
 * Move ou copia dados legados para o destino compartilhado (uma vez).
 *
 * @param {string} targetRoot
 */
export function migrateLegacyUserDataIfNeeded(targetRoot) {
  const pathApi = process.platform === 'win32' ? path.win32 : path
  const migrationFlagPath = pathApi.join(targetRoot, MIGRATION_FLAG)
  if (existsSync(migrationFlagPath)) return

  const legacyRoot = resolveLegacyDataPaths().find(
    (candidate) => candidate !== targetRoot && existsSync(candidate) && directoryHasUserContent(candidate),
  )

  if (!legacyRoot) {
    mkdirSync(targetRoot, { recursive: true })
    writeFileSync(migrationFlagPath, 'no-legacy', 'utf8')
    return
  }

  if (directoryHasUserContent(targetRoot)) {
    mkdirSync(targetRoot, { recursive: true })
    writeFileSync(migrationFlagPath, `skipped-existing:${legacyRoot}`, 'utf8')
    return
  }

  mkdirSync(pathApi.dirname(targetRoot), { recursive: true })

  if (existsSync(targetRoot) && !directoryHasUserContent(targetRoot)) {
    try {
      rmSync(targetRoot, { recursive: true, force: true })
    } catch (error) {
      console.warn('[userData] não foi possível remover destino vazio antes da migração', error)
    }
  }

  try {
    renameSync(legacyRoot, targetRoot)
    writeFileSync(pathApi.join(targetRoot, MIGRATION_FLAG), `from:${legacyRoot}`, 'utf8')
    return
  } catch (error) {
    console.warn('[userData] rename legado → compartilhado falhou, tentando cópia', error)
  }

  mkdirSync(targetRoot, { recursive: true })
  cpSync(legacyRoot, targetRoot, { recursive: true })
  writeFileSync(migrationFlagPath, `copied-from:${legacyRoot}`, 'utf8')
}

/**
 * Configura `userData` e migra dados legados quando aplicável.
 * Deve rodar antes de `app.whenReady()` e de qualquer `getPath('userData')`.
 *
 * @param {{ isDev?: boolean }} [options]
 */
export function configureUserDataPath({ isDev = false } = {}) {
  const targetRoot = resolveUserDataPath({ isDev })

  if (process.platform === 'win32' && !isDev) {
    migrateLegacyUserDataIfNeeded(targetRoot)
  }

  app.setPath('userData', targetRoot)
}
