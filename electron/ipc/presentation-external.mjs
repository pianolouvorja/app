import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import {
  readWorkspaceRecord,
  writeWorkspaceRecord,
} from '../workspace.mjs'

const execAsync = promisify(exec)

/**
 * Abre a apresentação no aplicativo externo escolhido pelo usuário
 * (LibreOffice Impress ou Microsoft PowerPoint), em modo slideshow.
 *
 * Contrato de produto (app#176, feedback Rafael 12/09): engine explícito
 * no item da liturgia = ABRE O PROGRAMA por fora (fidelidade 100%, o
 * aplicativo cuida da própria tela cheia). 'auto' = conversão interna
 * do app (PDF/PNGs) que alimenta a projeção multi-tela.
 */

const POWERPOINT_CANDIDATES = [
  'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
  'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
  'C:\\Program Files\\Microsoft Office\\Office16\\POWERPNT.EXE',
  'C:\\Program Files (x86)\\Microsoft Office\\Office16\\POWERPNT.EXE',
]

const SOFFICE_CANDIDATES = [
  'soffice',
  '/usr/bin/soffice',
  '/usr/lib/libreoffice/program/soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
]

function whichSync(command) {
  const pathEnv = process.env.PATH || ''
  const parts = pathEnv.split(path.delimiter)
  const extensions = process.platform === 'win32' ? ['.exe', '', '.bat', '.cmd'] : ['']
  for (const dir of parts) {
    for (const ext of extensions) {
      const full = path.join(dir, command + ext)
      try {
        if (existsSync(full)) return full
      } catch {
        // continue
      }
    }
  }
  return null
}

function findBinary(candidates) {
  for (const candidate of candidates) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate
      continue
    }
    const found = whichSync(candidate)
    if (found) return found
  }
  return null
}

export function hasPowerPoint() {
  if (process.platform !== 'win32') return false
  return POWERPOINT_CANDIDATES.some((p) => existsSync(p))
}

export function hasLibreOffice() {
  return Boolean(findBinary(SOFFICE_CANDIDATES))
}

/** App externo custom de apresentação salvo pelo usuário (workspace). */
export function getCustomPresentationApp() {
  try {
    const rec = readWorkspaceRecord('presentation-custom-app')
    if (
      typeof rec?.path === 'string' &&
      rec.path.trim() &&
      existsSync(rec.path.trim())
    ) {
      return rec.path.trim()
    }
  } catch {
    // default
  }
  return null
}

export function setCustomPresentationApp(appPath) {
  const clean = String(appPath ?? '').trim()
  if (!clean || !existsSync(clean)) return false
  return writeWorkspaceRecord('presentation-custom-app', { path: clean })
}

/**
 * Abre o arquivo no aplicativo externo, em modo apresentação.
 * @param {string} filePath caminho absoluto do .pptx
 * @param {'powerpoint' | 'libreoffice' | 'custom'} engine
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function openPresentationExternal(filePath, engine) {
  const absolute = path.resolve(String(filePath ?? '').trim())
  if (!absolute || !existsSync(absolute)) {
    return { ok: false, error: 'file-missing' }
  }

  if (engine === 'custom') {
    // App escolhido pelo usuário (Keynote, OnlyOffice, WPS...): abre o
    // arquivo e o aplicativo cuida de como apresentar. Sem flags especiais —
    // cada programa tem seu próprio modo slideshow.
    const bin = getCustomPresentationApp()
    if (!bin) return { ok: false, error: 'custom-app-missing' }
    exec(`"${bin}" "${absolute}"`, (err) => {
      if (err) console.error('[external-presentation] custom', err.message)
    })
    return { ok: true }
  }

  if (engine === 'powerpoint') {
    const bin = POWERPOINT_CANDIDATES.find((p) => existsSync(p))
    if (!bin) return { ok: false, error: 'powerpoint-not-installed' }
    // Slideshow nativo: /S abre diretamente em modo apresentação
    const cmd = `"${bin}" /S "${absolute}"`
    exec(cmd, (err) => {
      if (err) console.error('[external-presentation] powerpoint', err.message)
    })
    return { ok: true }
  }

  // LibreOffice Impress em modo apresentação (--show)
  const soffice = findBinary(SOFFICE_CANDIDATES)
  if (!soffice) return { ok: false, error: 'libreoffice-not-installed' }
  const cmd = `"${soffice}" --show --norestore "${absolute}"`
  exec(cmd, (err) => {
    if (err) console.error('[external-presentation] libreoffice', err.message)
  })
  return { ok: true }
}
