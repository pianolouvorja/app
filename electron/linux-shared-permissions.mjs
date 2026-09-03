import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * rwxrwxrwt — sticky + escrita para todos os usuários locais.
 * No Ubuntu/Debian o usuário comum muitas vezes NÃO está no grupo `users`,
 * então 2775 root:users continua inacessível após pedir senha.
 */
export const LINUX_SHARED_DIR_MODE = 0o1777

const WRITE_PROBE = '.write-probe'

/**
 * @param {string} targetRoot
 * @returns {boolean}
 */
export function canWriteLinuxSharedFolder(targetRoot) {
  try {
    mkdirSync(targetRoot, { recursive: true })
    const probe = path.join(targetRoot, WRITE_PROBE)
    writeFileSync(probe, 'ok', 'utf8')
    try {
      unlinkSync(probe)
    } catch {
      /* ignore */
    }
    return true
  } catch {
    return false
  }
}

/**
 * Aplica modo compartilhado e ACL padrão (novos arquivos graváveis por todos).
 * Funciona sem root se o processo for dono da pasta.
 *
 * @param {string} targetRoot
 */
export function applyLinuxSharedFolderMode(targetRoot) {
  try {
    chmodSync(targetRoot, LINUX_SHARED_DIR_MODE)
  } catch (error) {
    console.warn(
      '[userData] chmod da pasta compartilhada Linux ignorado:',
      error?.message ?? error,
    )
  }

  const acl = spawnSync(
    'setfacl',
    ['-m', 'u::rwx,g::rwx,o::rwx', '-m', 'd:u::rwx,d:g::rwx,d:o::rwx', targetRoot],
    { encoding: 'utf8' },
  )
  if (acl.error?.code !== 'ENOENT' && acl.status !== 0 && acl.status != null) {
    console.warn(
      '[userData] setfacl ignorado:',
      acl.stderr?.trim() || acl.stdout?.trim() || `exit ${acl.status}`,
    )
  }
}

/**
 * Garante que a pasta compartilhada exista e tente aplicar permissões abertas.
 *
 * @param {string} targetRoot
 */
export function ensureLinuxSharedFolderPermissions(targetRoot) {
  if (process.platform !== 'linux') return

  try {
    mkdirSync(targetRoot, { recursive: true })
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      console.warn('[userData] não foi possível criar pasta compartilhada Linux:', error)
    }
  }

  try {
    const { mode } = statSync(targetRoot)
    const current = mode & 0o7777
    if (current !== LINUX_SHARED_DIR_MODE) {
      applyLinuxSharedFolderMode(targetRoot)
    }
  } catch (error) {
    console.warn(
      '[userData] permissões da pasta compartilhada Linux ignoradas:',
      error?.message ?? error,
    )
  }
}

/**
 * Monta o script root para criar/corrigir a pasta (caminho já validado).
 * @param {string} targetRoot
 * @returns {string}
 */
export function buildLinuxSharedFolderElevationScript(targetRoot) {
  return [
    `install -d -m 1777 '${targetRoot}'`,
    `chmod 1777 '${targetRoot}'`,
    `if command -v setfacl >/dev/null 2>&1; then`,
    `  setfacl -m u::rwx,g::rwx,o::rwx '${targetRoot}'`,
    `  setfacl -d -m u::rwx,g::rwx,o::rwx '${targetRoot}'`,
    `fi`,
  ].join('\n')
}

/**
 * Cria ou corrige /var/lib/LouvorJA-PIANO via Polkit (pkexec).
 *
 * @param {string} targetRoot
 * @returns {boolean} true se a pasta ficou gravável após a elevação
 */
export function createLinuxSharedFolderWithElevation(targetRoot) {
  if (process.platform !== 'linux') return false

  if (!/^\/var\/lib\/[A-Za-z0-9._-]+$/.test(targetRoot)) {
    console.warn('[userData] recusa elevação para caminho inesperado:', targetRoot)
    return false
  }

  const script = buildLinuxSharedFolderElevationScript(targetRoot)

  // Preserva variáveis da sessão gráfica para o agente Polkit aparecer.
  const env = { ...process.env }
  const result = spawnSync('pkexec', ['/bin/sh', '-c', script], {
    encoding: 'utf8',
    env,
  })

  if (result.error?.code === 'ENOENT') {
    console.warn('[userData] pkexec não encontrado; não foi possível pedir senha de administrador')
    return false
  }

  if (result.status !== 0) {
    console.warn(
      '[userData] criação elevada da pasta compartilhada cancelada ou falhou:',
      result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`,
    )
    return false
  }

  applyLinuxSharedFolderMode(targetRoot)
  return canWriteLinuxSharedFolder(targetRoot)
}

/**
 * Garante pasta compartilhada no Linux: tenta sem elevação; se falhar, pede root via pkexec
 * (inclusive para corrigir pasta antiga com permissões 2775 inacessíveis).
 *
 * @param {string} targetRoot
 * @returns {boolean} true se a pasta estiver gravável
 */
export function ensureLinuxSharedFolderAvailable(targetRoot) {
  if (process.platform !== 'linux') return false

  ensureLinuxSharedFolderPermissions(targetRoot)
  if (canWriteLinuxSharedFolder(targetRoot)) return true

  return createLinuxSharedFolderWithElevation(targetRoot)
}
