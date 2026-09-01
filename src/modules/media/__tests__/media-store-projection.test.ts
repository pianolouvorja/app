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
const openProjectionModule = vi.fn().mockResolvedValue(true)

vi.mock('@shared/composables/useProjectionWindow', () => ({
  openProjectionModule: (...args: unknown[]) => openProjectionModule(...args),
  isProjectionModuleOpen: vi.fn(() => true),
  closeProjectionModule: (...args: unknown[]) => closeProjectionModule(...args),
}))

vi.mock('@modules/settings/services/palco-session', () => ({
  palcoSession: {
    slots: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../services/media-catalog', () => ({
  loadMediaTrack: vi.fn().mockResolvedValue({
    id: 2,
    name: 'Faixa 2',
    durationLabel: '03:00',
    audioUrl: '/musics/2.mp3',
    instrumentalUrl: null,
    coverUrl: null,
    coverPosition: null,
    albums: [],
    categories: [],
    lyrics: [
      {
        order: 0,
        lyric: 'Linha 2',
        showSlide: true,
        time: '00:00',
        instrumentalTime: '00:00',
        imageUrl: null,
        imagePosition: null,
        isCover: false,
      },
    ],
  }),
  resolveAlbumSubtitle: vi.fn(() => 'Álbum Teste'),
}))

vi.mock('../services/media-audio', () => ({
  attachMediaAudioListeners: vi.fn(),
  detachMediaAudioListeners: vi.fn(),
  fadeInMediaAudio: vi.fn().mockResolvedValue(true),
  fadeOutMediaAudio: vi.fn().mockResolvedValue(undefined),
  fadeVolumeMediaAudio: vi.fn().mockResolvedValue(undefined),
  formatMediaClock: vi.fn(() => '00:00'),
  getMediaAudioElement: vi.fn(() => ({
    volume: 1,
    paused: true,
    currentTime: 0,
    duration: 100,
    readyState: 4,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(true),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
  })),
  pauseMediaAudio: vi.fn(),
  playMediaAudio: vi.fn().mockResolvedValue(true),
  resolveMusicAudioUrl: vi.fn().mockResolvedValue({
    ok: true,
    url: 'https://example.com/audio2.mp3',
    source: 'remote',
  }),
  resolveSlideImageUrl: vi.fn().mockResolvedValue(null),
  stopAllMediaAudio: vi.fn(),
  switchMediaAudioElement: vi.fn(),
}))

describe('useMediaStore — controle de projeção e ocultação de conteúdo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    closeProjectionModule.mockClear()
    openProjectionModule.mockClear()
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

  it('playQueueItem mantém a fila e não fecha a janela de projeção', async () => {
    const store = useMediaStore()
    const queue = [
      { musicId: 1, albumId: 1, title: 'Faixa 1' },
      { musicId: 2, albumId: 1, title: 'Faixa 2' },
    ]
    store.queue = queue
    store.queueIndex = 0
    store.isProjecting = true
    store.session = {
      musicId: 1,
      albumId: 1,
      mode: 'audio',
      title: 'Faixa 1',
      subtitle: 'Álbum Teste',
      coverUrl: null,
      audioUrl: 'https://example.com/audio1.mp3',
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

    await store.playQueueItem(queue[1])

    expect(store.queue).toHaveLength(2)
    expect(store.queueIndex).toBe(1)
    expect(closeProjectionModule).not.toHaveBeenCalled()
    expect(openProjectionModule).not.toHaveBeenCalled()
    expect(store.isProjecting).toBe(true)
    expect(store.session?.musicId).toBe(2)
  })

  it('playQueue na primeira faixa chama startProjection (abre a janela)', async () => {
    const store = useMediaStore()
    const queue = [
      { musicId: 1, albumId: 1, title: 'Faixa 1' },
      { musicId: 2, albumId: 1, title: 'Faixa 2' },
    ]

    await store.playQueue(queue, 0)

    expect(openProjectionModule).toHaveBeenCalled()
    expect(store.isProjecting).toBe(true)
    expect(store.queue).toHaveLength(2)
    expect(store.session?.musicId).toBe(1)
  })
})
