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

const CELLULOID_CANDIDATES = [
  '/usr/bin/celluloid',
  '/usr/local/bin/celluloid',
  '/usr/bin/gnome-mpv',
]

const SMPLAYER_CANDIDATES = [
  '/usr/bin/smplayer',
  '/usr/local/bin/smplayer',
  'C:\\Program Files\\SMPlayer\\smplayer.exe',
]

const TOTEM_CANDIDATES = ['/usr/bin/totem', '/usr/local/bin/totem']

/** Catálogo de players conhecidos, para detecção na UI de Configurações. */
export const KNOWN_PLAYERS = [
  { id: 'vlc', label: 'VLC', candidates: VLC_CANDIDATES },
  { id: 'mpv', label: 'mpv', candidates: MPV_CANDIDATES },
  { id: 'celluloid', label: 'Celluloid', candidates: CELLULOID_CANDIDATES },
  { id: 'smplayer', label: 'SMPlayer', candidates: SMPLAYER_CANDIDATES },
  { id: 'totem', label: 'Totem (GNOME)', candidates: TOTEM_CANDIDATES },
]

/** Detecta um player externo específico instalado. */
export function findExternalPlayer(preference) {
  const entry = KNOWN_PLAYERS.find((p) => p.id === preference)
  const candidates = entry
    ? entry.candidates
    : preference === 'vlc'
      ? VLC_CANDIDATES
      : preference === 'mpv'
        ? MPV_CANDIDATES
        : []
  return candidates.find((p) => existsSync(p)) ?? null
}

/**
 * Lista os players conhecidos que estão instalados nesta máquina,
 * para exibir na UI apenas opções reais (além do "player do sistema").
 */
export function detectInstalledPlayers() {
  return KNOWN_PLAYERS.filter((p) => p.candidates.some((c) => existsSync(c))).map(
    ({ id, label }) => ({ id, label }),
  )
}

/** Preferência persistida ('associated' default). */
export function getExternalPlayerPreference() {
  try {
    const rec = readWorkspaceRecord('external-player')
    if (
      rec?.player === 'vlc' ||
      rec?.player === 'mpv' ||
      rec?.player === 'celluloid' ||
      rec?.player === 'smplayer' ||
      rec?.player === 'totem' ||
      (typeof rec?.player === 'string' && rec.player.startsWith('custom:'))
    ) {
      return rec.player
    }
  } catch {
    // default
  }
  return 'associated'
}

/** Player válido: known ids, custom:<path> ou associated. */
export function isValidPlayerPreference(player) {
  if (player === 'associated') return true
  if (typeof player !== 'string') return false
  if (['vlc', 'mpv', 'celluloid', 'smplayer', 'totem'].includes(player)) return true
  return player.startsWith('custom:') && player.length > 'custom:'.length
}

export function setExternalPlayerPreference(player) {
  if (!isValidPlayerPreference(player)) return false
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

  if (preference === 'associated') {
    // associated: abre com o player padrão do SO
    const result = await shell.openPath(absolute)
    return result
      ? { ok: false, player: 'associated', error: result }
      : { ok: true, player: 'associated' }
  }

  // custom:<path> — binário escolhido pelo usuário no seletor de arquivos.
  if (preference.startsWith('custom:')) {
    const bin = preference.slice('custom:'.length)
    if (!existsSync(bin)) {
      return { ok: false, player: 'custom', error: 'player-not-found' }
    }
    execAsync(`"${bin}" "${absolute}"`).catch(() => {
      /* o player morre com o app aberto — ignora */
    })
    return { ok: true, player: 'custom' }
  }

  // Player conhecido (VLC sem OSD p/ experiência limpa; --started-from-file
  // evita instância dupla).
  const bin = findExternalPlayer(preference)
  if (!bin) {
    return { ok: false, player: preference, error: 'player-not-found' }
  }
  const args = preference === 'vlc' ? ['--no-osd', '--started-from-file', absolute] : [absolute]
  execAsync(`"${bin}" ${args.map((a) => `"${a}"`).join(' ')}`).catch(() => {
    /* o player morre com o app aberto — ignora */
  })
  return { ok: true, player: preference }
}
