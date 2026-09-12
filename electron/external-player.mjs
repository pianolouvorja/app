import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { shell } from 'electron'
import { readWorkspaceRecord, writeWorkspaceRecord } from './workspace.mjs'

const execAsync = promisify(exec)

/**
 * Player externo de mídia (app#177) — reproduz arquivo de áudio/vídeo no
 * player associado do SO (ou VLC/mpv se detectado) em vez do player interno.
 *
 * Escopo de produto: o player externo atende o MONITOR DO OPERADOR
 * (pré-escuta/pré-visualização). A projeção multi-tela continua interna —
 * o pipeline de janelas de projeção depende de renderizar dentro do app.
 */

const VLC_CANDIDATES = [
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
  '/usr/bin/vlc',
  '/usr/local/bin/vlc',
  '/snap/bin/vlc',
  '/Applications/VLC.app/Contents/MacOS/VLC',
]

const MPV_CANDIDATES = ['/usr/bin/mpv', '/usr/local/bin/mpv', 'C:\\Program Files\\mpv\\mpv.exe']

/** Detecta um player externo específico instalado. */
export function findExternalPlayer(preference) {
  const candidates =
    preference === 'vlc' ? VLC_CANDIDATES : preference === 'mpv' ? MPV_CANDIDATES : []
  return candidates.find((p) => existsSync(p)) ?? null
}

/** Preferência persistida ('associated' default). */
export function getExternalPlayerPreference() {
  try {
    const rec = readWorkspaceRecord('external-player')
    if (rec?.player === 'vlc' || rec?.player === 'mpv') return rec.player
  } catch {
    // default
  }
  return 'associated'
}

export function setExternalPlayerPreference(player) {
  if (!['associated', 'vlc', 'mpv'].includes(player)) return false
  return writeWorkspaceRecord('external-player', { player })
}

/**
 * Reproduz o arquivo local no player externo escolhido.
 * @param {string} filePath caminho local absoluto do arquivo de mídia
 * @returns {Promise<{ok: boolean, player: string, error?: string}>}
 */
export async function playInExternalPlayer(filePath) {
  const absolute = path.resolve(String(filePath ?? '').trim())
  if (!absolute || !existsSync(absolute)) {
    return { ok: false, player: 'none', error: 'file-missing' }
  }

  const preference = getExternalPlayerPreference()

  // VLC: sem OSD para experiência limpa; --started-from-file evita instância dupla
  if (preference === 'vlc' || preference === 'mpv') {
    const bin = findExternalPlayer(preference)
    if (!bin) {
      return { ok: false, player: preference, error: 'player-not-found' }
    }
    const args =
      preference === 'vlc'
        ? ['--no-osd', '--started-from-file', absolute]
        : [absolute]
    execAsync(`"${bin}" ${args.map((a) => `"${a}"`).join(' ')}`).catch(() => {
      /* o player morre com o app aberto — ignora */
    })
    return { ok: true, player: preference }
  }

  // associated: abre com o player padrão do SO
  const result = await shell.openPath(absolute)
  return result
    ? { ok: false, player: 'associated', error: result }
    : { ok: true, player: 'associated' }
}
