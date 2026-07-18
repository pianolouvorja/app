import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'

const execFileAsync = promisify(execFile)

const OFFICE_CANDIDATES = [
  process.env.LIBREOFFICE_PATH,
  'soffice',
  'libreoffice',
  '/usr/bin/soffice',
  '/usr/bin/libreoffice',
  '/usr/lib/libreoffice/program/soffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
].filter(Boolean)

/**
 * @param {string} command
 * @returns {string | null}
 */
function whichSync(command) {
  const pathEnv = process.env.PATH || ''
  const parts = pathEnv.split(path.delimiter)
  const extensions =
    process.platform === 'win32' ? ['.exe', '', '.bat', '.cmd'] : ['']

  for (const dir of parts) {
    for (const ext of extensions) {
      const full = path.join(dir, command + ext)
      try {
        accessSync(full, constants.X_OK)
        return full
      } catch {
        // continue
      }
    }
  }
  return null
}

/** @returns {string | null} */
export function findPresentationOffice() {
  for (const candidate of OFFICE_CANDIDATES) {
    if (!candidate) continue
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate
      continue
    }
    const found = whichSync(candidate)
    if (found) return found
  }
  return null
}

export function hasPresentationOffice() {
  return Boolean(findPresentationOffice())
}

function getCacheDir() {
  const dir = path.join(app.getPath('userData'), 'Media', 'pptx-cache')
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * @param {string} filePath
 */
function cacheKeyFor(filePath) {
  const stats = statSync(filePath)
  return createHash('sha1')
    .update(filePath)
    .update(String(stats.mtimeMs))
    .update(String(stats.size))
    .digest('hex')
}

/**
 * Converte PPT/PPTX/ODP em PDF via LibreOffice (headless).
 * @param {string} filePath
 * @returns {Promise<string>} caminho absoluto do PDF
 */
export async function convertPresentationToPdf(filePath) {
  const absolute = path.resolve(filePath.trim())
  if (!absolute || !existsSync(absolute)) {
    throw new Error('presentation-file-missing')
  }

  const office = findPresentationOffice()
  if (!office) {
    throw new Error('presentation-office-missing')
  }

  const cacheDir = getCacheDir()
  const key = cacheKeyFor(absolute)
  const cachedPdf = path.join(cacheDir, `${key}.pdf`)
  if (existsSync(cachedPdf)) {
    return cachedPdf
  }

  const workDir = path.join(cacheDir, `job-${key}`)
  mkdirSync(workDir, { recursive: true })

  try {
    await execFileAsync(
      office,
      [
        '--headless',
        '--norestore',
        '--nolockcheck',
        '--nodefault',
        '--convert-to',
        'pdf',
        '--outdir',
        workDir,
        absolute,
      ],
      {
        timeout: 180_000,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
    )

    const produced = readdirSync(workDir).find((name) =>
      name.toLowerCase().endsWith('.pdf'),
    )
    if (!produced) {
      throw new Error('presentation-convert-failed')
    }

    renameSync(path.join(workDir, produced), cachedPdf)
    return cachedPdf
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}
