import { chmodSync, mkdirSync, statSync } from 'node:fs'

/** rwxrwsr-x — grupo pode escrever; setgid mantém o grupo em novos arquivos. */
export const LINUX_SHARED_DIR_MODE = 0o2775

/**
 * Garante que a pasta compartilhada exista e tente aplicar permissões de grupo.
 * Pacotes deb/rpm criam /var/lib/LouvorJA-PIANO no after-install; aqui cobrimos
 * AppImage e reparos quando o processo tiver permissão (ex.: dono da pasta).
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
      chmodSync(targetRoot, LINUX_SHARED_DIR_MODE)
    }
  } catch (error) {
    console.warn(
      '[userData] chmod da pasta compartilhada Linux ignorado (sem permissão ou pasta inexistente):',
      error?.message ?? error,
    )
  }
}
