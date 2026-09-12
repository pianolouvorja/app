import { execFile } from 'node:child_process'
import {
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

import { resolveMediaRoot } from '../windows-media-root.mjs'
import { cacheKeyFor } from './presentation-convert.mjs'

const execFileAsync = promisify(execFile)

/**
 * Engine PowerPoint (MS Office) para PPTX — exportação slide-a-slide em PNG.
 *
 * O LibreOffice (presentation-convert.mjs) quebra formatação complexa
 * (fontes, SmartArt, transições). O PowerPoint exporta pixel-perfect.
 * Pipeline: PPTX --COM/PowerPoint--> PNGs --player de imagens--> projeção.
 *
 * Windows: PowerPoint COM via PowerShell.
 * macOS: AppleScript (Keynote/PowerPoint) — não implementado aqui ainda.
 */

const POWERPOINT_CANDIDATES = [
  'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
  'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
  'C:\\Program Files\\Microsoft Office\\Office16\\POWERPNT.EXE',
  'C:\\Program Files (x86)\\Microsoft Office\\Office16\\POWERPNT.EXE',
  'C:\\Program Files\\Microsoft Office\\root\\Office15\\POWERPNT.EXE',
]

/** @returns {boolean} true se MS PowerPoint está instalado */
export function hasPowerPoint() {
  if (process.platform !== 'win32') return false
  return POWERPOINT_CANDIDATES.some((p) => existsSync(p))
}

function getPngCacheDir() {
  const dir = path.join(resolveMediaRoot(app.getPath('userData')), 'pptx-png-cache')
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Exporta cada slide do PPTX como PNG usando PowerPoint COM (Windows).
 * @param {string} filePath caminho absoluto do .pptx
 * @returns {Promise<string[]>} caminhos absolutos dos PNGs, em ordem de slide
 */
export async function exportPptxToPngs(filePath) {
  const absolute = path.resolve(filePath)
  if (!existsSync(absolute)) {
    throw new Error('presentation-file-missing')
  }
  if (process.platform !== 'win32') {
    throw new Error('powerpoint-windows-only')
  }

  const cacheDir = getPngCacheDir()
  const key = cacheKeyFor(absolute)
  const outDir = path.join(cacheDir, key)

  // cache hit: retorna PNGs existentes em ordem
  if (existsSync(outDir)) {
    const cached = listSortedPngs(outDir)
    if (cached.length > 0) return cached
  }
  mkdirSync(outDir, { recursive: true })

  // O PowerPoint COM exporta como Slide1.PNG, Slide2.PNG... num outDir.
  // Escapamos as aspas simples nos caminhos para o PowerShell.
  const esc = (s) => s.replaceAll("'", "''")
  const script = `
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open('${esc(absolute)}', $true, $false, $false) # ReadOnly, no Window
  $pres.Export('${esc(outDir)}', 'PNG', 1920, 1080)
  $pres.Close()
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}
`

  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 180_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    )
  } catch (error) {
    rmSync(outDir, { recursive: true, force: true })
    throw new Error(`powerpoint-export-failed: ${error.message}`)
  }

  const pngs = listSortedPngs(outDir)
  if (pngs.length === 0) {
    throw new Error('powerpoint-export-empty')
  }
  return pngs
}

/** Lista PNGs do diretório ordenados numericamente (Slide1, Slide2, ..., Slide10). */
function listSortedPngs(dir) {
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const na = Number(a.match(/(\d+)/)?.[1] ?? 0)
      const nb = Number(b.match(/(\d+)/)?.[1] ?? 0)
      return na - nb || a.localeCompare(b)
    })
    .map((f) => path.join(dir, f))
}

/**
 * Determina o engine a usar para o arquivo, considerando setting do usuário
 * e disponibilidade. 'auto' = PowerPoint se instalado, senão LibreOffice.
 * @param {'auto' | 'powerpoint' | 'libreoffice'} preference
 * @returns {{engine: 'powerpoint' | 'libreoffice'}}
 */
export function resolvePresentationEngine(preference) {
  const pp = hasPowerPoint()
  if (preference === 'powerpoint') {
    if (!pp) throw new Error('powerpoint-not-installed')
    return { engine: 'powerpoint' }
  }
  if (preference === 'libreoffice') return { engine: 'libreoffice' }
  return { engine: pp ? 'powerpoint' : 'libreoffice' }
}
