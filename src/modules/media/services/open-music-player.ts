import { useMediaStore } from '../stores/useMediaStore'
import type { MediaOpenResult, MediaPlaybackMode } from '../types/media'

export type OpenMusicPlayerParams = {
  musicId: number
  mode: MediaPlaybackMode
  albumId?: number | null
  /** Quando omitido, projeta apenas em `no_audio` (contrato Álbuns). */
  project?: boolean
}

/**
 * Abre o player de mídia no mesmo contrato dos Álbuns:
 * cantado / playback / sem áudio (+ projeção quando aplicável).
 */
export async function openMusicPlayer(
  params: OpenMusicPlayerParams,
): Promise<MediaOpenResult> {
  const musicId = Number(params.musicId)
  if (!Number.isFinite(musicId) || musicId <= 0) {
    return { ok: false, messageKey: 'media.messages.trackMissing' }
  }

  const mode = params.mode
  const shouldProject = params.project ?? mode === 'no_audio'
  const mediaStore = useMediaStore()

  const result = await mediaStore.open({
    musicId,
    mode,
    albumId: params.albumId ?? null,
    minimized: false,
    project: shouldProject,
  })

  if (!result.ok) return result

  mediaStore.maximize()

  if (shouldProject && !mediaStore.isProjecting) {
    await mediaStore.startProjection()
  }

  return result
}
