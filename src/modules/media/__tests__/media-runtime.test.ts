import { describe, expect, it } from 'vitest'

import { normalizeMediaRuntime } from '../services/media-runtime'
import { DEFAULT_MEDIA_PROJECTION } from '../types/media'

describe('normalizeMediaRuntime — tela de retorno', () => {
  it('preenche nextLyric e ratios', () => {
    const runtime = normalizeMediaRuntime({
      ...DEFAULT_MEDIA_PROJECTION,
      active: true,
      lyric: 'Agora',
      nextLyric: 'Depois',
      nextIsCover: false,
      progressRatio: 0.4,
      slideProgressRatio: 0.75,
    })
    expect(runtime.nextLyric).toBe('Depois')
    expect(runtime.nextIsCover).toBe(false)
    expect(runtime.progressRatio).toBeCloseTo(0.4)
    expect(runtime.slideProgressRatio).toBeCloseTo(0.75)
  })

  it('clampa ratios e cai no default se o payload for lixo', () => {
    expect(normalizeMediaRuntime(null)).toEqual(DEFAULT_MEDIA_PROJECTION)
    const runtime = normalizeMediaRuntime({
      nextLyric: 10,
      nextIsCover: 'yes',
      progressRatio: 4,
      slideProgressRatio: -1,
    })
    expect(runtime.nextLyric).toBe('')
    expect(runtime.nextIsCover).toBe(false)
    expect(runtime.progressRatio).toBe(1)
    expect(runtime.slideProgressRatio).toBe(0)
  })
})
