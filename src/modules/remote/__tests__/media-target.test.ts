/**
 * Tests — roteamento de controles de mídia do Controle Remoto.
 *
 * Quando há vídeo/images/pdf/projeção ATIVA, player.* deve ir para a
 * PROJEÇÃO (projection.remote*); senão para o player de áudio.
 */

import { describe, expect, it, vi } from 'vitest'

import { resolveMediaTarget } from '../renderer/media-target'

describe('resolveMediaTarget', () => {
  it('retorna projection quando playback state existe', async () => {
    const projection = {
      getPlaybackState: vi.fn().mockResolvedValue({
        paused: false,
        currentTime: 5,
        duration: 100,
        volume: 0.8,
      }),
      remotePlay: vi.fn(),
      remotePause: vi.fn(),
    }
    const target = await resolveMediaTarget({ projection, player: null })
    expect(target).toBe('projection')
    expect(projection.getPlaybackState).toHaveBeenCalled()
  })

  it('retorna player quando não há projeção ativa', async () => {
    const projection = {
      getPlaybackState: vi.fn().mockResolvedValue(null),
    }
    const target = await resolveMediaTarget({ projection, player: {} })
    expect(target).toBe('player')
  })

  it('retorna player quando bridge/projection ausentes (web)', async () => {
    const target = await resolveMediaTarget({ projection: undefined, player: {} })
    expect(target).toBe('player')
  })
})
