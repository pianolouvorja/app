import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export const SORTEIO_DEFAULT_AUDIO_FILE = 'sorteio-default-piano.mp3'
export const SORTEIO_EFFECT_AUDIO_FILE = 'sorteio-efeito.mp3'

/** Áudios empacotados com a instalação (extraResources). */
export const SORTEIO_BUNDLED_AUDIO_FILES = [
  SORTEIO_DEFAULT_AUDIO_FILE,
  SORTEIO_EFFECT_AUDIO_FILE,
]

/** Relativo à pasta Media (posix). */
export const SORTEIO_AUDIO_REL_DIR = 'modulos/sorteios'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'])
const PROTECTED_AUDIO_FILES = new Set(SORTEIO_BUNDLED_AUDIO_FILES)

/**
 * Pasta de áudios do sorteio empacotada (extraResources) ou `resources/` no dev.
 * @returns {string}
 */
export function resolveBundledSorteioAudioDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'midia', 'modulos', 'sorteios')
  }

  return path.join(app.getAppPath(), 'resources', 'midia', 'modulos', 'sorteios')
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function resolveBundledSorteioAudio(fileName) {
  return path.join(resolveBundledSorteioAudioDir(), fileName)
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
 * Copia um áudio empacotado para Media/modulos/sorteios se ainda não existir.
 * @param {string} destDir
 * @param {string} fileName
 */
function ensureBundledAudioFile(destDir, fileName) {
  const dest = path.join(destDir, fileName)
  if (existsSync(dest)) return dest

  const src = resolveBundledSorteioAudio(fileName)
  if (existsSync(src)) {
    try {
      copyFileSync(src, dest)
    } catch (error) {
      console.warn(`[sorteio-audio] falha ao copiar ${fileName}`, error)
    }
  } else {
    console.warn('[sorteio-audio] áudio empacotado não encontrado:', src)
  }
  return dest
}

/**
 * Garante `Media/modulos/sorteios` e copia os MP3s padrão/efeito se ainda não existirem.
 * @param {string} mediaRoot
 * @returns {string} caminho absoluto do áudio padrão no workspace
 */
export function ensureSorteioDefaultAudio(mediaRoot) {
  const destDir = path.join(mediaRoot, 'modulos', 'sorteios')
  ensureDir(destDir)

  for (const fileName of SORTEIO_BUNDLED_AUDIO_FILES) {
    ensureBundledAudioFile(destDir, fileName)
  }

  return path.join(destDir, SORTEIO_DEFAULT_AUDIO_FILE)
}

/**
 * @param {string} fileName
 * @returns {string}
 */
function sanitizeAudioFileName(fileName) {
  const base = path.basename(String(fileName || '')).replace(/[^\w.\- ()[\]]+/g, '_')
  const ext = path.extname(base).toLowerCase()
  const stem = path.basename(base, ext).trim() || 'audio-custom'
  if (!AUDIO_EXTENSIONS.has(ext)) {
    return `${stem}.mp3`
  }
  return `${stem}${ext}`
}

/**
 * @param {string} destDir
 * @param {string} fileName
 * @returns {string}
 */
function uniqueAudioFileName(destDir, fileName) {
  const ext = path.extname(fileName)
  const stem = path.basename(fileName, ext)
  let candidate = fileName
  let index = 2
  while (existsSync(path.join(destDir, candidate))) {
    candidate = `${stem}-${index}${ext}`
    index += 1
  }
  return candidate
}

/**
 * Copia um arquivo de áudio escolhido pelo usuário para Media/modulos/sorteios.
 * Sempre adiciona (não sobrescreve arquivo existente).
 * @param {string} mediaRoot
 * @param {string} sourcePath
 * @returns {{ ok: true, fileName: string, relativePath: string } | { ok: false, reason: string }}
 */
export function importSorteioCustomAudio(mediaRoot, sourcePath) {
  const src = String(sourcePath || '').trim()
  if (!src || !existsSync(src)) {
    return { ok: false, reason: 'missing-source' }
  }

  const ext = path.extname(src).toLowerCase()
  if (!AUDIO_EXTENSIONS.has(ext)) {
    return { ok: false, reason: 'unsupported-type' }
  }

  ensureSorteioDefaultAudio(mediaRoot)
  const destDir = path.join(mediaRoot, 'modulos', 'sorteios')
  const fileName = uniqueAudioFileName(destDir, sanitizeAudioFileName(path.basename(src)))
  const dest = path.join(destDir, fileName)

  try {
    copyFileSync(src, dest)
  } catch (error) {
    console.error('[sorteio-audio] falha ao importar áudio', error)
    return { ok: false, reason: 'copy-failed' }
  }

  return {
    ok: true,
    fileName,
    relativePath: `${SORTEIO_AUDIO_REL_DIR}/${fileName}`,
  }
}

/**
 * Remove um áudio personalizado de Media/modulos/sorteios.
 * Não apaga os áudios empacotados do sistema.
 * @param {string} mediaRoot
 * @param {string} fileName
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function deleteSorteioCustomAudio(mediaRoot, fileName) {
  const safeName = path.basename(String(fileName || '').trim())
  if (
    !safeName ||
    safeName !== String(fileName || '').trim() ||
    safeName.includes('..') ||
    PROTECTED_AUDIO_FILES.has(safeName)
  ) {
    return { ok: false, reason: 'protected' }
  }

  const target = path.join(mediaRoot, 'modulos', 'sorteios', safeName)
  if (!existsSync(target)) {
    return { ok: true }
  }

  try {
    unlinkSync(target)
    return { ok: true }
  } catch (error) {
    console.error('[sorteio-audio] falha ao excluir áudio', error)
    return { ok: false, reason: 'delete-failed' }
  }
}
