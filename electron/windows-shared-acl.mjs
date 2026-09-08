import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

/** SID do grupo Users — funciona em qualquer idioma do Windows. */
const USERS_SID = '*S-1-5-32-545'

/**
 * Garante ACL de leitura/escrita para todos os usuários na pasta compartilhada.
 * O proprietário da pasta pode conceder isso sem elevação; o instalador também
 * aplica a mesma regra com privilégios de administrador.
 *
 * @param {string} targetRoot
 */
export function ensureWindowsSharedFolderAcl(targetRoot) {
  if (process.platform !== 'win32') return

  mkdirSync(targetRoot, { recursive: true })

  const icacls = path.win32.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'icacls.exe')
  const result = spawnSync(
    icacls,
    [targetRoot, '/grant', `${USERS_SID}:(OI)(CI)M`, '/T', '/C'],
    { windowsHide: true, encoding: 'utf8' },
  )

  if (result.status !== 0) {
    console.warn(
      '[userData] icacls não aplicou ACL compartilhada:',
      result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`,
    )
  }
}
