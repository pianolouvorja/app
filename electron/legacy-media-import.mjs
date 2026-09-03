/**
 * Importação de mídia do Louvor JA legado (Windows / Delphi).
 *
 * Origem (Delphi `dir_config`):
 *   C:\Program Files (x86)\Louvor JA\config\
 *     capas\     → arquivos flat (.bmp/.jpg) — LISTA_COLETANEAS.IMAGEM
 *     imagens\   → arquivos flat (.jpg) — MUSICAS_SLIDE.IMAGEM
 *     musicas\{álbum}\arquivo — MUSICAS.ALBUM + MUSICAS.URL
 *
 * Destino PIANO (paridade juanaleixo `storage:importFromClassic`):
 *   Media/covers/{arquivo}
 *   Media/images/{arquivo}
 *   Media/music/{lang}/{álbum}/{arquivo}   ← lang = pt|es
 *
 * O FTP/API do PIANO grava music com prefixo pt|es; o legado não tem
 * esse nível — precisamos injetar no import.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, win32 } from 'node:path'

import { resolveMediaDirectory } from './paths.mjs'

/** @typedef {'covers' | 'music' | 'slides'} LegacyMediaType */
/** @typedef {'pt' | 'es'} LegacyLang */

const FOLDER_TO_TYPE = /** @type {const} */ ({
  capas: 'covers',
  imagens: 'slides',
  musicas: 'music',
})

const IMAGE_EXTS = new Set([
  '.bmp',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
])

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'])

/**
 * Candidatos da pasta `config` do Louvor JA legado.
 * Prioriza "Louvor JA" (com espaço) — path real do instalador Windows.
 * @param {{ programFiles?: string, programFilesX86?: string }} [opts]
 * @returns {string[]}
 */
export function legacyMediaConfigCandidates({
  programFiles = 'C:\\Program Files',
  programFilesX86 = 'C:\\Program Files (x86)',
} = {}) {
  // Ordem: com espaço primeiro (prints do usuário), depois sem espaço (juanaleixo).
  const names = ['Louvor JA', 'LouvorJA']
  /** @type {string[]} */
  const roots = []
  for (const base of [programFilesX86, programFiles, 'C:\\']) {
    for (const name of names) {
      roots.push(win32.join(base, name, 'config'))
    }
  }
  return roots
}

/**
 * Idioma da instalação Delphi: %APPDATA%\LouvorJA\configPT|configES(.ja).
 * Default `pt` (paridade juanaleixo).
 * @param {{
 *   appDataLouvorJa?: string,
 *   exists?: (p: string) => boolean,
 *   join?: (...a: string[]) => string,
 * }} [opts]
 * @returns {LegacyLang}
 */
export function detectLegacyLanguage(opts = {}) {
  const exists = opts.exists ?? existsSync
  const joinPath = opts.join ?? join
  const base =
    opts.appDataLouvorJa ??
    joinPath(homedir(), 'AppData', 'Roaming', 'LouvorJA')

  const markers = [
    ['pt', ['configPT', 'configPT.ja']],
    ['es', ['configES', 'configES.ja']],
  ]

  for (const [lang, files] of markers) {
    for (const file of files) {
      if (exists(joinPath(base, file))) return /** @type {LegacyLang} */ (lang)
    }
  }
  return 'pt'
}

/**
 * Confirma pasta config com ao menos uma subpasta de mídia.
 * @param {string} configDir
 * @param {(p: string) => boolean} [exists]
 * @param {(p: string) => { isDirectory(): boolean }} [stat]
 * @param {(…a: string[]) => string} [joinPath]
 */
export function looksLikeLegacyMediaConfig(
  configDir,
  exists = existsSync,
  stat = statSync,
  joinPath = join,
) {
  for (const folder of Object.keys(FOLDER_TO_TYPE)) {
    const full = joinPath(configDir, folder)
    if (!exists(full)) continue
    try {
      if (stat(full).isDirectory()) return true
    } catch {
      // ignora
    }
  }
  return false
}

/**
 * Lista arquivos sob uma pasta filtrando por extensão.
 * @param {string} folder
 * @param {Set<string>} allowedExts
 * @param {{
 *   readdir?: (p: string) => string[],
 *   stat?: (p: string) => { isDirectory(): boolean, size: number },
 *   join?: (...a: string[]) => string,
 * }} [io]
 * @returns {{ relativePath: string, absolutePath: string, bytes: number }[]}
 */
export function listMediaFilesUnder(folder, allowedExts = IMAGE_EXTS, io = {}) {
  const readdir = io.readdir ?? readdirSync
  const stat = io.stat ?? statSync
  const joinPath = io.join ?? join
  /** @type {{ relativePath: string, absolutePath: string, bytes: number }[]} */
  const out = []

  const walk = (dir, prefix) => {
    let entries
    try {
      entries = readdir(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const full = joinPath(dir, entry)
      let st
      try {
        st = stat(full)
      } catch {
        continue
      }
      const rel = prefix ? `${prefix}/${entry}` : entry
      if (st.isDirectory()) {
        walk(full, rel)
        continue
      }
      const ext = entry.includes('.')
        ? entry.slice(entry.lastIndexOf('.')).toLowerCase()
        : ''
      if (!allowedExts.has(ext)) continue
      out.push({
        relativePath: rel.replace(/\\/g, '/'),
        absolutePath: full,
        bytes: st.size,
      })
    }
  }

  walk(folder, '')
  return out
}

/**
 * Escaneia capas/imagens/musicas na pasta config.
 * Músicas recebem prefixo `{lang}/` para bater com o catálogo PIANO.
 *
 * @param {string} configDir
 * @param {{
 *   lang?: LegacyLang,
 *   readdir?: (p: string) => string[],
 *   stat?: (p: string) => { isDirectory(): boolean, size: number },
 *   join?: (...a: string[]) => string,
 *   exists?: (p: string) => boolean,
 * }} [io]
 */
export function scanLegacyMediaConfig(configDir, io = {}) {
  const joinPath = io.join ?? join
  const exists = io.exists ?? existsSync
  const lang = io.lang === 'es' ? 'es' : 'pt'

  /** @type {{ mediaType: LegacyMediaType, relativePath: string, absolutePath: string, bytes: number }[]} */
  const items = []
  const counts = { covers: 0, music: 0, slides: 0 }
  let totalBytes = 0

  /** @type {Record<string, Set<string>>} */
  const extsByFolder = {
    capas: IMAGE_EXTS,
    imagens: IMAGE_EXTS,
    musicas: AUDIO_EXTS,
  }

  for (const [folder, mediaType] of Object.entries(FOLDER_TO_TYPE)) {
    const full = joinPath(configDir, folder)
    if (!exists(full)) continue
    const allowed = extsByFolder[folder] ?? IMAGE_EXTS
    for (const file of listMediaFilesUnder(full, allowed, io)) {
      // Capas/imagens: flat. Músicas: álbum/arquivo → pt|es/álbum/arquivo
      const relativePath =
        mediaType === 'music' ? `${lang}/${file.relativePath}` : file.relativePath
      items.push({
        mediaType: /** @type {LegacyMediaType} */ (mediaType),
        relativePath,
        absolutePath: file.absolutePath,
        bytes: file.bytes,
      })
      counts[mediaType] += 1
      totalBytes += file.bytes
    }
  }

  return { items, totalBytes, counts, lang }
}

/**
 * Planeja importação: arquivos que ainda não existem no workspace PIANO.
 * @param {{ mediaType: LegacyMediaType, relativePath: string, absolutePath: string, bytes: number }[]} items
 * @param {{
 *   resolveDest?: (mediaType: LegacyMediaType, relativePath: string) => string,
 *   exists?: (p: string) => boolean,
 * }} [opts]
 */
export function planLegacyMediaImport(items, opts = {}) {
  const exists = opts.exists ?? existsSync
  const resolveDest =
    opts.resolveDest ??
    ((mediaType, relativePath) =>
      join(resolveMediaDirectory(mediaType), relativePath))

  /** @type {typeof items} */
  const missing = []
  /** @type {typeof items} */
  const present = []

  for (const item of items) {
    const dest = resolveDest(item.mediaType, item.relativePath)
    if (exists(dest)) present.push(item)
    else missing.push(item)
  }

  return {
    missing,
    present,
    missingBytes: missing.reduce((sum, i) => sum + i.bytes, 0),
    presentBytes: present.reduce((sum, i) => sum + i.bytes, 0),
  }
}

/**
 * Copia um arquivo de mídia local para o workspace.
 * @param {LegacyMediaType} mediaType
 * @param {string} relativePath
 * @param {string} sourcePath
 * @returns {{ ok: boolean, skipped: boolean, error?: string }}
 */
export function copyLegacyMediaFile(mediaType, relativePath, sourcePath) {
  try {
    const destFolder = resolveMediaDirectory(mediaType)
    const dest = join(destFolder, relativePath)
    mkdirSync(dirname(dest), { recursive: true })
    if (existsSync(dest)) return { ok: true, skipped: true }
    if (!existsSync(sourcePath)) {
      return { ok: false, skipped: false, error: 'source-missing' }
    }
    copyFileSync(sourcePath, dest)
    return { ok: true, skipped: false }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Detecta a pasta config do legado (Windows).
 * @param {{
 *   platform?: string,
 *   candidates?: string[],
 *   exists?: (p: string) => boolean,
 *   stat?: (p: string) => { isDirectory(): boolean },
 *   join?: (...a: string[]) => string,
 *   registryConfigProbe?: () => string | null,
 * }} [opts]
 */
export function detectLegacyMediaConfig(opts = {}) {
  const platform = opts.platform ?? process.platform
  const exists = opts.exists ?? existsSync
  const stat = opts.stat ?? statSync
  const joinPath = opts.join ?? join

  if (platform !== 'win32' && !opts.candidates) {
    return { found: false, configDir: null }
  }

  const fromRegistry = opts.registryConfigProbe?.() ?? null
  const candidates = [
    ...(fromRegistry ? [fromRegistry] : []),
    ...(opts.candidates ?? legacyMediaConfigCandidates()),
  ].filter(Boolean)

  for (const dir of candidates) {
    if (!dir || !exists(dir)) continue
    try {
      if (!stat(dir).isDirectory()) continue
    } catch {
      continue
    }
    if (!looksLikeLegacyMediaConfig(dir, exists, stat, joinPath)) continue
    return { found: true, configDir: dir }
  }

  return { found: false, configDir: null }
}

/**
 * Fluxo completo de análise (detect + idioma + scan + plan).
 * @param {object} [opts]
 */
export function analyzeLegacyMediaImport(opts = {}) {
  const detected = detectLegacyMediaConfig(opts)
  const lang =
    opts.lang ??
    detectLegacyLanguage({
      appDataLouvorJa: opts.appDataLouvorJa,
      exists: opts.exists ?? opts.io?.exists,
      join: opts.join ?? opts.io?.join,
    })

  if (!detected.found || !detected.configDir) {
    return {
      found: false,
      configDir: null,
      lang,
      scanned: 0,
      missing: 0,
      present: 0,
      totalBytes: 0,
      missingBytes: 0,
      counts: { covers: 0, music: 0, slides: 0 },
      itemsToImport: [],
    }
  }

  const scanned = scanLegacyMediaConfig(detected.configDir, {
    ...(opts.io ?? {}),
    lang,
  })
  const plan = planLegacyMediaImport(scanned.items, opts.planOpts ?? {})

  return {
    found: true,
    configDir: detected.configDir,
    lang: scanned.lang,
    scanned: scanned.items.length,
    missing: plan.missing.length,
    present: plan.present.length,
    totalBytes: scanned.totalBytes,
    missingBytes: plan.missingBytes,
    counts: scanned.counts,
    itemsToImport: plan.missing,
  }
}

/**
 * Executa a cópia dos itens faltantes com callback de progresso.
 * @param {{ mediaType: LegacyMediaType, relativePath: string, absolutePath: string, bytes: number }[]} items
 * @param {(progress: { current: number, total: number, relativePath: string, mediaType: LegacyMediaType }) => void} [onProgress]
 */
export function importLegacyMediaItems(items, onProgress) {
  let imported = 0
  let skipped = 0
  let failed = 0
  const total = items.length

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    onProgress?.({
      current: i + 1,
      total,
      relativePath: item.relativePath,
      mediaType: item.mediaType,
    })
    const result = copyLegacyMediaFile(
      item.mediaType,
      item.relativePath,
      item.absolutePath,
    )
    if (result.skipped) skipped += 1
    else if (result.ok) imported += 1
    else failed += 1
  }

  return { imported, skipped, failed, total }
}

/** Utilitário exportado para testes de path relativo. */
export function relativePosix(from, to) {
  return relative(from, to).replace(/\\/g, '/')
}

export { IMAGE_EXTS, AUDIO_EXTS }
