/**
 * Vídeo local no browser: arquivo escolhido via <input type="file"> vira
 * blob URL e é registrado por ID do item da liturgia. Transitório —
 * não persiste (F5 perde, cenário web é apresentação ao vivo).
 */

const objectUrls = new Map<string, string>()

export function setLiturgyVideoFile(itemId: string, file: File): string {
  revokeLiturgyVideo(itemId)
  const url = URL.createObjectURL(file)
  objectUrls.set(itemId, url)
  return url
}

export function getLiturgyVideoObjectUrl(itemId: string): string | undefined {
  return objectUrls.get(itemId)
}

export function revokeLiturgyVideo(itemId: string): void {
  const url = objectUrls.get(itemId)
  if (url) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // já revogada
    }
    objectUrls.delete(itemId)
  }
}

export function revokeAllLiturgyVideos(): void {
  for (const id of [...objectUrls.keys()]) {
    revokeLiturgyVideo(id)
  }
}

/** Duração (s) do arquivo — lida de um <video> temporário. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const done = (value: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(value) ? value : 0)
    }
    video.onloadedmetadata = () => done(video.duration)
    video.onerror = () => done(0)
    video.src = url
    // timeout de segurança: 5s
    window.setTimeout(() => done(0), 5000)
  })
}

/** Duração (s) de arquivo de áUDIO — lida de um <audio> temporário. */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    const done = (value: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(value) ? value : 0)
    }
    audio.onloadedmetadata = () => done(audio.duration)
    audio.onerror = () => done(0)
    audio.src = url
    // timeout de segurança: 5s
    window.setTimeout(() => done(0), 5000)
  })
}
