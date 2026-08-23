/**
 * Lê a duração (ms) de um arquivo de mídia local via ffprobe.
 *
 * Retorna 0 se: ffprobe indisponível, arquivo inexistente ou formato sem
 * duração. Nunca lança — duração é best-effort.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export async function probeMediaDurationMs(path: string): Promise<number> {
  if (!path || !existsSync(path)) return 0
  return new Promise((resolve) => {
    const child = spawn('ffprobe', [
      '-v',
      'quiet',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      path,
    ])
    let out = ''
    child.stdout.on('data', (chunk) => {
      out += String(chunk)
    })
    child.on('error', () => resolve(0))
    child.on('close', () => {
      const seconds = Number.parseFloat(out.trim())
      resolve(Number.isFinite(seconds) && seconds > 0
        ? Math.round(seconds * 1000)
        : 0)
    })
  })
}
