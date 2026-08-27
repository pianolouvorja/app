// Duração de mídia via ffprobe (main process — nunca no renderer).
import { spawn } from 'node:child_process'

/** Retorna duração em ms, ou 0 se ffprobe falhar/arquivo inexistente. */
export async function probeMediaDurationMsMain(path) {
  if (!path) return 0
  return await new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      path,
    ])
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => { out += d })
    proc.stderr.on('data', (d) => { err += d })
    proc.on('error', () => resolve(0))
    proc.on('close', (code) => {
      if (code !== 0) {
        if (err) console.warn('[media-probe] ffprobe:', err.trim())
        resolve(0)
        return
      }
      const seconds = Number.parseFloat(out.trim())
      resolve(Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0)
    })
  })
}
