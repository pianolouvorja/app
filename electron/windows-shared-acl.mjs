import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/** SID do grupo Users — funciona em qualquer idioma do Windows. */
const USERS_SID = '*S-1-5-32-545'

/** Marca que a ACL da pasta já foi aplicada neste boot anterior. */
export const WINDOWS_ACL_FLAG = '.acl-users-modify'

/** icacls não pode travar o boot — o instalador já aplica /T uma vez. */
const ICACLS_TIMEOUT_MS = 4_000

/**
 * Garante ACL de leitura/escrita para todos os usuários na pasta compartilhada.
 *
 * Sem `/T`: (OI)(CI) já herda para arquivos novos. Percorrer Media/ com
 * milhares de hinos no boot deixava o Windows ~15s sem janela (antes de
 * whenReady). O instalador NSIS aplica `/T` na instalação.
 *
 * @param {string} targetRoot
 */
export function ensureWindowsSharedFolderAcl(targetRoot) {
  if (process.platform !== 'win32') return

  mkdirSync(targetRoot, { recursive: true })

  const flagPath = path.win32.join(targetRoot, WINDOWS_ACL_FLAG)
  if (existsSync(flagPath)) return

  const icacls = path.win32.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'icacls.exe')
  const result = spawnSync(
    icacls,
    [targetRoot, '/grant', `${USERS_SID}:(OI)(CI)M`, '/C'],
    { windowsHide: true, encoding: 'utf8', timeout: ICACLS_TIMEOUT_MS },
  )

  if (result.status !== 0) {
    console.warn(
      '[userData] icacls não aplicou ACL compartilhada:',
      result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`,
    )
    return
  }

  try {
    writeFileSync(flagPath, '1\n', 'utf8')
  } catch (error) {
    console.warn('[userData] não gravou marca de ACL', error)
  }
}
