import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, statSync } from 'node:fs'

/** rwxrwsr-x — grupo pode escrever; setgid mantém o grupo em novos arquivos. */
export const MACOS_SHARED_DIR_MODE = 0o2775

/**
 * Garante pasta compartilhada em /Users/Shared e tenta permissões de grupo (staff).
 * /Users/Shared é gravável por usuários locais sem elevação (cenário típico de DMG).
 *
 * @param {string} targetRoot
 */
export function ensureMacSharedFolderPermissions(targetRoot) {
  if (process.platform !== 'darwin') return

  try {
    mkdirSync(targetRoot, { recursive: true })
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      console.warn('[userData] não foi possível criar pasta compartilhada macOS:', error)
    }
  }

  try {
    const { mode } = statSync(targetRoot)
    const current = mode & 0o7777
    if (current !== MACOS_SHARED_DIR_MODE) {
      chmodSync(targetRoot, MACOS_SHARED_DIR_MODE)
    }
  } catch (error) {
    console.warn(
      '[userData] chmod da pasta compartilhada macOS ignorado (sem permissão ou pasta inexistente):',
      error?.message ?? error,
    )
  }

  // staff = grupo padrão de usuários locais no macOS
  const chown = spawnSync('chown', ['-R', ':staff', targetRoot], {
    encoding: 'utf8',
  })
  if (chown.status !== 0 && chown.status != null) {
    console.warn(
      '[userData] chown :staff ignorado:',
      chown.stderr?.trim() || chown.stdout?.trim() || `exit ${chown.status}`,
    )
  }
}
