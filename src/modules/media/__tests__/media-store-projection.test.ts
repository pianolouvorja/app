// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMediaStore } from '../stores/useMediaStore'
import { readMediaRuntimeFromStorage } from '../services/media-runtime'

vi.mock('@shared/services/desktop-bridge', () => ({
  getDesktopBridge: () => null,
  isDesktopApp: () => false,
}))

const closeProjectionModule = vi.fn()

vi.mock('@shared/composables/useProjectionWindow', () => ({
  openProjectionModule: vi.fn().mockResolvedValue(true),
  isProjectionModuleOpen: vi.fn(() => true),
  closeProjectionModule: (...args: unknown[]) => closeProjectionModule(...args),
}))

vi.mock('@modules/settings/services/palco-session', () => ({
  palcoSession: {
    slots: vi.fn().mockResolvedValue([]),
  },
}))

describe('useMediaStore — controle de projeção e ocultação de conteúdo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    closeProjectionModule.mockClear()
  })

  it('clearProjection define isProjecting como falso e publica runtime inativo sem fechar a janela', () => {
    const store = useMediaStore()
    store.session = {
      musicId: 10,
      albumId: 1,
      mode: 'audio',
      title: 'Hino Teste',
      subtitle: 'Álbum Teste',
      coverUrl: null,
      audioUrl: 'https://example.com/audio.mp3',
      hasInstrumental: false,
      slides: [
        {
          order: 0,
          lyric: 'Linha 1\nLinha 2',
          showSlide: true,
          time: '00:00',
          instrumentalTime: '00:00',
          imageUrl: 'https://example.com/slide1.jpg',
          imagePosition: null,
          isCover: false,
        },
      ],
      slideTimesSec: [0],
    }
    store.isProjecting = true

    store.clearProjection()

    expect(store.isProjecting).toBe(false)
    const runtime = readMediaRuntimeFromStorage()
    expect(runtime.active).toBe(false)
    expect(runtime.imageUrl).toBe('https://example.com/slide1.jpg')
    expect(runtime.title).toBe('Hino Teste')
  })

  it('close fecha a janela cabeada quando o player encerra com projeção ativa', () => {
    const store = useMediaStore()
    store.session = {
      musicId: 10,
      albumId: 1,
      mode: 'audio',
      title: 'Hino Teste',
      subtitle: 'Álbum Teste',
      coverUrl: null,
      audioUrl: 'https://example.com/audio.mp3',
      hasInstrumental: false,
      slides: [
        {
          order: 0,
          lyric: 'Linha 1',
          showSlide: true,
          time: '00:00',
          instrumentalTime: '00:00',
          imageUrl: null,
          imagePosition: null,
          isCover: false,
        },
      ],
      slideTimesSec: [0],
    }
    store.isProjecting = true

    store.close()

    expect(closeProjectionModule).toHaveBeenCalledTimes(1)
    expect(store.isProjecting).toBe(false)
    expect(store.session).toBeNull()
  })
})
