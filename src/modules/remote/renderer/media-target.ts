/**
 * Roteamento de controles de mídia do Controle Remoto.
 *
 * Vídeo/images/pdf/presentation da liturgia rodam na JANELA DE PROJEÇÃO,
 * que tem API própria (projection.remote*). Hinos rodam no player de áudio
 * do renderer. Este módulo decide para onde os comandos player.* vão.
 */

export type MediaTarget = 'projection' | 'player'

/** Retorna 'projection' se houver mídia ativa na projeção; senão 'player'. */
export async function resolveMediaTarget({
  projection,
  player,
}: {
  projection?: {
    getPlaybackState?: () => Promise<unknown | null>
  } | null
  player: unknown
}): Promise<MediaTarget> {
  if (!projection?.getPlaybackState) return 'player'
  try {
    const state = await projection.getPlaybackState()
    return state ? 'projection' : 'player'
  } catch {
    return 'player'
  }
}
