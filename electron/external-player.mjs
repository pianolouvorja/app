import { exec } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
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
  '/var/lib/flatpak/exports/bin/org.videolan.VLC',
  '/Applications/VLC.app/Contents/MacOS/VLC',
]

const MPV_CANDIDATES = [
  '/usr/bin/mpv',
  '/usr/local/bin/mpv',
  '/snap/bin/mpv',
  'C:\\Program Files\\mpv\\mpv.exe',
  'C:\\Program Files\\mpv.net\\mpvnet.exe',
]

const CELLULOID_CANDIDATES = [
  '/usr/bin/celluloid',
  '/usr/local/bin/celluloid',
  '/usr/bin/gnome-mpv',
  '/snap/bin/celluloid',
]

const SMPLAYER_CANDIDATES = [
  '/usr/bin/smplayer',
  '/usr/local/bin/smplayer',
  'C:\\Program Files\\SMPlayer\\smplayer.exe',
]

const TOTEM_CANDIDATES = ['/usr/bin/totem', '/usr/local/bin/totem']

const HARUNA_CANDIDATES = ['/usr/bin/haruna', '/usr/local/bin/haruna']

const CLAPPER_CANDIDATES = ['/usr/bin/clapper', '/usr/local/bin/clapper']

const IINA_CANDIDATES = ['/Applications/IINA.app/Contents/MacOS/IINA']

const MPC_CANDIDATES = [
  'C:\\Program Files\\MPC-HC\\mpc-hc64.exe',
  'C:\\Program Files\\MPC-HC\\mpc-hc.exe',
  'C:\\Program Files\\MPC-HC x64\\mpc-hc64.exe',
  'C:\\Program Files (x86)\\MPC-HC\\mpc-hc.exe',
  'C:\\Program Files\\clsid2\\mpc-hc\\mpc-hc64.exe',
  'C:\\Program Files\\Media Player Classic\\mplayerc.exe',
  'C:\\Program Files (x86)\\Media Player Classic\\mplayerc.exe',
  'C:\\Program Files\\Gabest\\Media Player Classic\\mplayerc.exe',
  'C:\\Program Files (x86)\\Gabest\\Media Player Classic\\mplayerc.exe',
  'C:\\Program Files\\MPC-BE\\mpc-be64.exe',
  'C:\\Program Files\\MPC-BE x64\\mpc-be64.exe',
  'C:\\Program Files (x86)\\MPC-BE\\mpc-be.exe',
  'C:\\Program Files (x86)\\K-Lite Codec Pack\\MPC-HC64\\mpc-hc64.exe',
  'C:\\Program Files (x86)\\K-Lite Codec Pack\\MPC-HC\\mpc-hc.exe',
  'C:\\Program Files\\K-Lite Codec Pack\\MPC-HC64\\mpc-hc64.exe',
  'C:\\Program Files\\K-Lite Codec Pack\\MPC-HC\\mpc-hc64.exe',
  'C:\\Program Files\\Combined Community Codec Pack 64\\MPC\\mpc-hc64.exe',
  'C:\\Program Files (x86)\\Combined Community Codec Pack\\MPC\\mpc-hc.exe',
  'C:\\Program Files (x86)\\Combined Community Codec Pack\\MPC\\mplayerc.exe',
]

const MPC_EXE_NAMES = [
  'mpc-hc64.exe',
  'mpc-hc.exe',
  'mpc-be64.exe',
  'mpc-be.exe',
  'mplayerc.exe',
  'mpc-qt.exe',
]
const MPC_BINS = ['mpc-hc64', 'mpc-hc', 'mpc-be64', 'mpc-be', 'mplayerc', 'mpc-qt']
const MPC_REG_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mpc-hc64.exe',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mpc-hc.exe',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mpc-be64.exe',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mpc-be.exe',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mplayerc.exe',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mpc-hc.exe',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mplayerc.exe',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mpc-hc64.exe',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\mplayerc.exe',
]

/** Catálogo de players conhecidos, para detecção na UI de Configurações. */
export const KNOWN_PLAYERS = [
  { id: 'vlc', label: 'VLC', bin: 'vlc', candidates: VLC_CANDIDATES },
  { id: 'mpv', label: 'mpv', bin: 'mpv', candidates: MPV_CANDIDATES },
  { id: 'celluloid', label: 'Celluloid', bin: 'celluloid', candidates: CELLULOID_CANDIDATES },
  { id: 'smplayer', label: 'SMPlayer', bin: 'smplayer', candidates: SMPLAYER_CANDIDATES },
  { id: 'totem', label: 'Totem (GNOME)', bin: 'totem', candidates: TOTEM_CANDIDATES },
  { id: 'haruna', label: 'Haruna', bin: 'haruna', candidates: HARUNA_CANDIDATES },
  { id: 'clapper', label: 'Clapper', bin: 'clapper', candidates: CLAPPER_CANDIDATES },
  { id: 'iina', label: 'IINA', bin: 'iina', candidates: IINA_CANDIDATES },
  {
    id: 'mpc',
    label: 'Media Player Classic',
    bin: 'mpc-hc64',
    bins: MPC_BINS,
    candidates: MPC_CANDIDATES,
    exeNames: MPC_EXE_NAMES,
  },
]

async function resolveOnPath(command) {
  if (!command) return null
  const cmd =
    process.platform === 'win32' ? `where "${command}"` : `command -v "${command}"`
  try {
    const { stdout } = await execAsync(cmd, { timeout: 2500 })
    return stdout.trim().split(/\r?\n/).find(Boolean) ?? null
  } catch {
    return null
  }
}

function isMpcRelatedDir(name) {
  const lower = name.toLowerCase()
  return (
    lower.includes('mpc') ||
    lower.includes('media player classic') ||
    lower.includes('mplayerc') ||
    lower.includes('k-lite') ||
    lower.includes('klite') ||
    lower.includes('codec') ||
    lower === 'programs' ||
    lower === 'gabest'
  )
}

function scanDirsForExes(roots, exeNames, maxDepth = 4) {
  const wanted = new Set(exeNames.map((name) => name.toLowerCase()))
  const stack = roots.filter(Boolean).map((root) => ({ dir: root, depth: 0 }))
  const seen = new Set()

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || current.depth > maxDepth || seen.has(current.dir)) continue
    seen.add(current.dir)
    if (!existsSync(current.dir)) continue

    let entries
    try {
      entries = readdirSync(current.dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current.dir, entry.name)
      if (entry.isFile() && wanted.has(entry.name.toLowerCase())) return full
      if (entry.isDirectory() && current.depth < maxDepth && isMpcRelatedDir(entry.name)) {
        stack.push({ dir: full, depth: current.depth + 1 })
      }
    }
  }
  return null
}

function parseRegDefaultValue(stdout) {
  const match = String(stdout).match(/REG_\w+\s+(.+)/)
  const value = match?.[1]?.trim().replace(/^"|"$/g, '')
  if (!value || !existsSync(value)) return null
  return value
}

async function findMpcViaRegistry() {
  for (const key of MPC_REG_KEYS) {
    try {
      const { stdout } = await execAsync(`reg query "${key}" /ve`, { timeout: 2500 })
      const value = parseRegDefaultValue(stdout)
      if (value) return value
    } catch {
      /* chave ausente */
    }
  }

  try {
    const { stdout } = await execAsync(
      'reg query "HKCU\\SOFTWARE\\MPC-HC\\MPC-HC" /v ExePath',
      { timeout: 2500 },
    )
    const value = parseRegDefaultValue(stdout)
    if (value) return value
  } catch {
    /* chave ausente */
  }

  try {
    const { stdout } = await execAsync(
      'reg query "HKLM\\SOFTWARE\\MPC-HC\\MPC-HC" /v ExePath',
      { timeout: 2500 },
    )
    const value = parseRegDefaultValue(stdout)
    if (value) return value
  } catch {
    /* chave ausente */
  }

  return null
}

function collectStartMenuLinks() {
  const roots = [
    path.join(process.env.ProgramData || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ]
  const links = []
  const stack = roots.filter((root) => root && existsSync(root)).map((dir) => ({ dir, depth: 0 }))
  const seen = new Set()

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || current.depth > 5 || seen.has(current.dir)) continue
    seen.add(current.dir)

    let entries
    try {
      entries = readdirSync(current.dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current.dir, entry.name)
      const lower = entry.name.toLowerCase()
      if (entry.isDirectory() && current.depth < 5) {
        stack.push({ dir: full, depth: current.depth + 1 })
        continue
      }
      if (
        entry.isFile() &&
        lower.endsWith('.lnk') &&
        (lower.includes('mpc') ||
          lower.includes('media player classic') ||
          lower.includes('mplayerc'))
      ) {
        links.push(full)
      }
    }
  }
  return links
}

async function resolveWindowsShortcut(linkPath) {
  const escaped = linkPath.replace(/'/g, "''")
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).CreateShortcut('${escaped}').TargetPath"`,
      { timeout: 4000 },
    )
    const target = stdout.trim().replace(/^"|"$/g, '')
    return target && existsSync(target) ? target : null
  } catch {
    return null
  }
}

function scanMpcInstallFolders() {
  const localPrograms = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Programs')
    : ''
  const userProfile = process.env.USERPROFILE || ''
  return scanDirsForExes(
    [
      process.env.ProgramFiles,
      process.env['ProgramFiles(x86)'],
      localPrograms,
      process.env.LOCALAPPDATA,
      userProfile ? path.join(userProfile, 'scoop', 'apps') : '',
      'C:\\ProgramData\\chocolatey\\bin',
      'C:\\ProgramData\\chocolatey\\lib',
    ],
    MPC_EXE_NAMES,
  )
}

async function resolveMpcBinary() {
  if (process.platform !== 'win32') return null

  const known = MPC_CANDIDATES.find((candidate) => existsSync(candidate))
  if (known) return known

  const userPrograms = process.env.LOCALAPPDATA
    ? [
        path.join(process.env.LOCALAPPDATA, 'Programs', 'MPC-HC', 'mpc-hc64.exe'),
        path.join(process.env.LOCALAPPDATA, 'Programs', 'MPC-HC', 'mpc-hc.exe'),
        path.join(process.env.LOCALAPPDATA, 'Programs', 'MPC-BE', 'mpc-be64.exe'),
        path.join(process.env.LOCALAPPDATA, 'Programs', 'Media Player Classic', 'mplayerc.exe'),
      ].find((candidate) => existsSync(candidate))
    : null
  if (userPrograms) return userPrograms

  const scanned = scanMpcInstallFolders()
  if (scanned) return scanned

  const fromReg = await findMpcViaRegistry()
  if (fromReg) return fromReg

  for (const link of collectStartMenuLinks()) {
    const target = await resolveWindowsShortcut(link)
    if (target && MPC_EXE_NAMES.some((name) => target.toLowerCase().endsWith(name))) {
      return target
    }
  }

  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-StartApps | Where-Object { $_.Name -match \'Media Player Classic|MPC-HC|MPC-BE|mplayerc\' } | Select-Object -ExpandProperty AppID"',
      { timeout: 8000 },
    )
    for (const id of stdout.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
      if (id.toLowerCase().endsWith('.exe') && existsSync(id)) return id
    }
  } catch {
    /* Get-StartApps indisponível */
  }

  return null
}

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
  const found = candidates.find((p) => existsSync(p)) ?? null
  if (found) return found
  if (preference === 'mpc' && process.platform === 'win32') {
    return scanMpcInstallFolders()
  }
  return null
}

/**
 * Lista os players conhecidos que estão instalados nesta máquina
 * (disco + PATH), para a UI oferecer só opções reais.
 */
export async function detectInstalledPlayers() {
  const found = []
  for (const player of KNOWN_PLAYERS) {
    const onDisk = player.candidates.some((candidate) => existsSync(candidate))
    if (onDisk) {
      found.push({ id: player.id, label: player.label })
      continue
    }
    const bins = player.bins ?? (player.bin ? [player.bin] : [])
    let resolved = null
    for (const bin of bins) {
      resolved = await resolveOnPath(bin)
      if (resolved) break
    }
    if (!resolved && player.id === 'mpc') {
      resolved = await resolveMpcBinary()
    }
    if (resolved) found.push({ id: player.id, label: player.label })
  }
  return found
}

/** Player válido: associated (Piano), known ids ou custom:<path>. */
export function isValidPlayerPreference(player) {
  if (player === 'associated') return true
  if (typeof player !== 'string') return false
  if (KNOWN_PLAYERS.some((entry) => entry.id === player)) return true
  return player.startsWith('custom:') && player.length > 'custom:'.length
}

function readPlayerRecord() {
  try {
    return readWorkspaceRecord('external-player') ?? {}
  } catch {
    return {}
  }
}

function normalizeCustomPlayers(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const item of list) {
    const bin = String(item ?? '').trim()
    if (!bin || seen.has(bin)) continue
    seen.add(bin)
    out.push(bin)
  }
  return out
}

/** Preferência persistida. Sem escolha do usuário = Player do sistema Piano. */
export function getExternalPlayerPreference() {
  const rec = readPlayerRecord()
  if (isValidPlayerPreference(rec?.player)) return rec.player
  return 'associated'
}

/** Players escolhidos em “Escolher outro player…” — independentes da seleção atual. */
export function getCustomExternalPlayers() {
  return normalizeCustomPlayers(readPlayerRecord().customPlayers)
}

export function setExternalPlayerPreference(player) {
  if (!isValidPlayerPreference(player)) return false
  const customPlayers = normalizeCustomPlayers(readPlayerRecord().customPlayers)
  if (player.startsWith('custom:')) {
    const bin = player.slice('custom:'.length).trim()
    if (bin && !customPlayers.includes(bin)) customPlayers.push(bin)
  }
  return writeWorkspaceRecord('external-player', { player, customPlayers })
}

export function removeCustomExternalPlayer(binPath) {
  const rec = readPlayerRecord()
  const bin = String(binPath ?? '').trim()
  const customPlayers = normalizeCustomPlayers(rec.customPlayers).filter((item) => item !== bin)
  let player = isValidPlayerPreference(rec?.player) ? rec.player : 'associated'
  if (player === `custom:${bin}`) player = 'associated'
  writeWorkspaceRecord('external-player', { player, customPlayers })
  return { player, customPlayers }
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
  const known = KNOWN_PLAYERS.find((p) => p.id === preference)
  let bin = findExternalPlayer(preference)
  if (!bin && known) {
    const bins = known.bins ?? (known.bin ? [known.bin] : [])
    for (const name of bins) {
      bin = await resolveOnPath(name)
      if (bin) break
    }
  }
  if (!bin && preference === 'mpc') bin = await resolveMpcBinary()
  if (!bin) {
    return { ok: false, player: preference, error: 'player-not-found' }
  }
  const args = preference === 'vlc' ? ['--no-osd', '--started-from-file', absolute] : [absolute]
  execAsync(`"${bin}" ${args.map((a) => `"${a}"`).join(' ')}`).catch(() => {
    /* o player morre com o app aberto — ignora */
  })
  return { ok: true, player: preference }
}
