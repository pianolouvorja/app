import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

import { WORKSPACE_DIRS } from './constants.mjs'
import { ensureWindowsSharedFolderAcl } from './windows-shared-acl.mjs'
import {
  resolveDefaultWindowsMediaRoot,
  resolveMediaRoot,
  resolveWindowsMediaRootUnderBase,
  writeWindowsMediaRootOverride,
} from './windows-media-root.mjs'

const MEDIA_SUBDIRS = [
  WORKSPACE_DIRS.covers,
  WORKSPACE_DIRS.music,
  WORKSPACE_DIRS.images,
]

/**
 * @returns {{
 *   currentPath: string
 *   defaultPath: string
 *   isCustom: boolean
 * }}
 */
export function getWindowsMediaFolderStatus() {
  const userData = app.getPath('userData')
  const defaultPath = resolveDefaultWindowsMediaRoot()
  const currentPath = resolveMediaRoot(userData)
  const isCustom =
    path.win32.normalize(currentPath).toLowerCase() !==
    path.win32.normalize(defaultPath).toLowerCase()

  return { currentPath, defaultPath, isCustom }
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
function directoryHasEntries(dir) {
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).length > 0
  } catch {
    return false
  }
}

/**
 * Copia conteúdo de source→dest (merge). Funciona entre discos (C:→D:).
 * @param {string} source
 * @param {string} dest
 */
function copyTreeMerge(source, dest) {
  if (!existsSync(source)) return
  mkdirSync(dest, { recursive: true })

  for (const entry of readdirSync(source)) {
    const from = path.win32.join(source, entry)
    const to = path.win32.join(dest, entry)
    const st = statSync(from)
    if (st.isDirectory()) {
      copyTreeMerge(from, to)
    } else {
      mkdirSync(path.win32.dirname(to), { recursive: true })
      cpSync(from, to)
    }
  }
}

/**
 * Move mídias para nova pasta, aplica ACL e persiste para todos os usuários.
 *
 * @param {string} targetPath
 * @param {{ removeSource?: boolean }} [options]
 * @returns {{
 *   ok: boolean
 *   path: string | null
 *   reason?: string
 *   movedBytes?: number
 * }}
 */
export function migrateWindowsMediaFolder(targetPath, { removeSource = true } = {}) {
  if (process.platform !== 'win32') {
    return { ok: false, path: null, reason: 'not-windows' }
  }

  const trimmed = typeof targetPath === 'string' ? targetPath.trim() : ''
  if (!trimmed) {
    return { ok: false, path: null, reason: 'empty-path' }
  }

  // Escolha do usuário = pasta base; mídia fica em {base}\LouvorJA-PIANO\Media.
  const destRoot = resolveWindowsMediaRootUnderBase(trimmed)
  if (!destRoot) {
    return { ok: false, path: null, reason: 'empty-path' }
  }
  const { currentPath, defaultPath } = getWindowsMediaFolderStatus()
  const sourceRoot = path.win32.normalize(currentPath)

  if (destRoot.toLowerCase() === sourceRoot.toLowerCase()) {
    writeWindowsMediaRootOverride(
      destRoot.toLowerCase() === path.win32.normalize(defaultPath).toLowerCase()
        ? null
        : destRoot,
    )
    return { ok: true, path: destRoot, reason: 'same-path' }
  }

  // Destino não pode ser dentro da origem (evita loop/apagar).
  const sourcePrefix = sourceRoot.toLowerCase().replace(/\\+$/, '') + '\\'
  if (destRoot.toLowerCase().startsWith(sourcePrefix)) {
    return { ok: false, path: null, reason: 'dest-inside-source' }
  }

  try {
    mkdirSync(destRoot, { recursive: true })
    ensureWindowsSharedFolderAcl(destRoot)

    for (const sub of MEDIA_SUBDIRS) {
      mkdirSync(path.win32.join(destRoot, sub), { recursive: true })
    }

    let movedBytes = 0
    for (const sub of MEDIA_SUBDIRS) {
      const from = path.win32.join(sourceRoot, sub)
      const to = path.win32.join(destRoot, sub)
      if (!existsSync(from)) continue
      copyTreeMerge(from, to)
      try {
        const walk = (dir) => {
          for (const name of readdirSync(dir)) {
            const full = path.win32.join(dir, name)
            const st = statSync(full)
            if (st.isDirectory()) walk(full)
            else movedBytes += st.size
          }
        }
        walk(to)
      } catch {
        /* ignore size accounting */
      }
    }

    // Também copia arquivos soltos na raiz Media (se houver).
    if (existsSync(sourceRoot)) {
      for (const entry of readdirSync(sourceRoot)) {
        if (MEDIA_SUBDIRS.includes(entry)) continue
        if (entry.startsWith('.')) continue
        const from = path.win32.join(sourceRoot, entry)
        const to = path.win32.join(destRoot, entry)
        const st = statSync(from)
        if (st.isDirectory()) copyTreeMerge(from, to)
        else {
          mkdirSync(path.win32.dirname(to), { recursive: true })
          cpSync(from, to)
        }
      }
    }

    const isDefault =
      destRoot.toLowerCase() === path.win32.normalize(defaultPath).toLowerCase()
    const persisted = writeWindowsMediaRootOverride(isDefault ? null : destRoot)
    if (!persisted.ok) {
      return { ok: false, path: destRoot, reason: 'persist-failed' }
    }

    if (removeSource && directoryHasEntries(sourceRoot)) {
      try {
        rmSync(sourceRoot, { recursive: true, force: true })
        // Recria pasta padrão vazia se era o default (estrutura esperada).
        if (
          sourceRoot.toLowerCase() ===
          path.win32.normalize(defaultPath).toLowerCase()
        ) {
          mkdirSync(sourceRoot, { recursive: true })
        }
      } catch (error) {
        console.warn('[media-folder] não removeu origem após migração', error)
      }
    }

    ensureWindowsSharedFolderAcl(destRoot)
    return { ok: true, path: destRoot, reason: 'moved', movedBytes }
  } catch (error) {
    console.error('[media-folder] migração falhou', error)
    return { ok: false, path: null, reason: 'error' }
  }
}
