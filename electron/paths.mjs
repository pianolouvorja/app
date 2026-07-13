import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

import { MEDIA_FOLDER_BY_TYPE, TEMP_DATABASE_FILE, WORKSPACE_DIRS } from './constants.mjs'

/**
 * @typedef {object} WorkspacePaths
 * @property {string} root
 * @property {string} sysdata
 * @property {string} media
 * @property {string} covers
 * @property {string} music
 * @property {string} images
 * @property {string} tempDatabase
 */

/**
 * @returns {WorkspacePaths}
 */
export function getWorkspacePaths() {
  const root = app.getPath('userData')
  const media = path.join(root, WORKSPACE_DIRS.media)

  return {
    root,
    sysdata: path.join(root, WORKSPACE_DIRS.sysdata),
    media,
    covers: path.join(media, WORKSPACE_DIRS.covers),
    music: path.join(media, WORKSPACE_DIRS.music),
    images: path.join(media, WORKSPACE_DIRS.images),
    tempDatabase: path.join(root, TEMP_DATABASE_FILE),
  }
}

/**
 * @param {string} dir
 */
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Cria a árvore `.sysdata` + `Media/{covers,music,images}` em userData.
 */
export function ensureWorkspaceDirectories() {
  const paths = getWorkspacePaths()
  const legacyDatabaseDir = path.join(paths.root, 'database')

  if (existsSync(legacyDatabaseDir)) {
    try {
      rmSync(legacyDatabaseDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('[workspace] não foi possível remover pasta database legada', error)
    }
  }

  ;[paths.sysdata, paths.media, paths.covers, paths.music, paths.images].forEach(ensureDir)
  return paths
}

/**
 * Esvazia e recria o workspace de dados/mídia.
 */
export function resetWorkspaceDirectories() {
  const paths = getWorkspacePaths()

  for (const dir of [paths.sysdata, paths.media]) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  return ensureWorkspaceDirectories()
}

/**
 * @param {'covers' | 'music' | 'slides'} mediaType
 */
export function resolveMediaDirectory(mediaType) {
  const paths = getWorkspacePaths()
  const folder = MEDIA_FOLDER_BY_TYPE[mediaType] ?? MEDIA_FOLDER_BY_TYPE.covers

  if (folder === 'music') return paths.music
  if (folder === 'images') return paths.images
  return paths.covers
}
