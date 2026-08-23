/**
 * Stub renderer — delega pro main process via IPC.
 * Evita bundlar node:child_process no browser.
 */
export async function probeMediaDurationMs(path: string): Promise<number> {
  // @ts-expect-error Electron bridge injected at runtime
  if (typeof window === 'undefined' || !window.louvorja?.media?.probeDuration) {
    console.warn('[media-probe] electronAPI.media.probeDuration não disponível — duração 0')
    return 0
  }
  return window.louvorja.media.probeDuration(path)
}
