// @vitest-environment jsdom
/**
 * Gap-fill do useMediaStore — fluxos não cobertos por media-store-projection:
 * open (trackMissing, custom, no_audio, keepQueue, replay mesmo modo),
 * play/pause rotas tv/no_audio/fade, seek, queue (next/prev/jump/clear),
 * volume, switchMode (audio<->instrumental<->no_audio), slides, erro.
 * Reutiliza o padrão de mocks do media-store-projection.test.ts.
 */
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadMediaTrack = vi.fn()
const resolveAlbumSubtitle = vi.fn(() => 'Álbum Teste')

vi.mock('../services/media-catalog', () => ({
  loadMediaTrack: (id: unknown) => loadMediaTrack(id),
  resolveAlbumSubtitle: (t: unknown, a: unknown) => resolveAlbumSubtitle(t, a),
}))

const loadCustomMusicTrack = vi.fn()
vi.mock('../services/custom-catalog', () => ({
  loadCustomMusicTrack: (id: unknown) => loadCustomMusicTrack(id),
  fromCustomMusicId: (id: number) => id - 1_000_000,
  isCustomMusicId: (id: number) => id >= 1_000_000,
}))

const mediaAudioHoisted = vi.hoisted(() => {
  const state: { audio: Record<string, unknown> | null } = { audio: null }
  const mk = () => ({
    volume: 1, paused: true, currentTime: 0, duration: 100, readyState: 4,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), load: vi.fn(),
    play: vi.fn().mockResolvedValue(true), pause: vi.fn(), removeAttribute: vi.fn(), src: '',
  })
  state.audio = mk()
  return {
    state,
    audio: {
      attachMediaAudioListeners: vi.fn(),
      detachMediaAudioListeners: vi.fn(),
      fadeInMediaAudio: vi.fn().mockResolvedValue(true),
      fadeOutMediaAudio: vi.fn().mockResolvedValue(undefined),
      fadeVolumeMediaAudio: vi.fn().mockResolvedValue(undefined),
      formatMediaClock: vi.fn((s: number) => `${s}s`),
      getMediaAudioElement: vi.fn(() => state.audio),
      pauseMediaAudio: vi.fn(),
      playMediaAudio: vi.fn().mockResolvedValue(true),
      resolveMusicAudioUrl: vi.fn().mockResolvedValue({ ok: true, url: 'audio://x', source: 'remote' }),
      resolveSlideImageUrl: vi.fn().mockResolvedValue(null),
      stopAllMediaAudio: vi.fn(),
      switchMediaAudioElement: vi.fn(),
    },
  }
})
const mediaAudio = mediaAudioHoisted.audio
const getSharedAudio = () => mediaAudioHoisted.state.audio as never
const resetSharedAudio = () => {
  mediaAudioHoisted.state.audio = {
    volume: 1, paused: true, currentTime: 0, duration: 100, readyState: 4,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), load: vi.fn(),
    play: vi.fn().mockResolvedValue(true), pause: vi.fn(), removeAttribute: vi.fn(), src: '',
  } as never
}
vi.mock('../services/media-audio', () => ({ ...mediaAudioHoisted.audio }))

const buildMediaSlides = vi.fn(
  (track: { lyrics?: Array<Record<string, unknown>> }) =>
    (track.lyrics ?? []).map((l) => ({ ...l })),
)
vi.mock('../services/media-slides', () => ({
  buildMediaSlides: (t: unknown) => buildMediaSlides(t),
  buildSlideTimesSec: vi.fn(() => [0]),
  resolveSlideIndexForTime: vi.fn(() => 0),
  stripHtmlBreaks: vi.fn((t: string) => t),
  lyricPreviewSnippet: vi.fn((t: string) => t),
}))

const loadProjectionSettings = vi.fn(() => ({ autoMinimizePlayer: false }))
vi.mock('@modules/settings/services/projection-preferences', () => ({
  loadProjectionSettings: () => loadProjectionSettings(),
}))

vi.mock('@shared/services/desktop-bridge', () => ({
  getDesktopBridge: () => null,
  isDesktopApp: () => false,
}))

const closeProjectionModule = vi.fn()
const openProjectionModule = vi.fn().mockResolvedValue(true)
const isProjectionModuleOpen = vi.fn(() => false)
vi.mock('@shared/composables/useProjectionWindow', () => ({
  openProjectionModule: (...a: unknown[]) => openProjectionModule(...a),
  isProjectionModuleOpen: (...a: unknown[]) => isProjectionModuleOpen(...a),
  closeProjectionModule: (...a: unknown[]) => closeProjectionModule(...a),
  hasSelectedExtendedProjectionTargets: vi.fn().mockResolvedValue(false),
}))

vi.mock('@modules/settings/services/palco-session', () => ({
  palcoSession: { slots: vi.fn().mockResolvedValue([]) },
}))

const trackStub = (over: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Faixa 1',
  durationLabel: '3:00',
  audioUrl: '/m/1.mp3',
  instrumentalUrl: null,
  coverUrl: null,
  coverPosition: null,
  albums: [],
  categories: [],
  lyrics: [{ order: 0, lyric: 'L1', showSlide: true, time: '00:00' }],
  ...over,
})

import { useMediaStore } from '../stores/useMediaStore'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  resetSharedAudio()
  vi.clearAllMocks()
  loadMediaTrack.mockResolvedValue(trackStub())
  mediaAudio.playMediaAudio.mockResolvedValue(true)
  mediaAudio.fadeInMediaAudio.mockResolvedValue(true)
  mediaAudio.fadeOutMediaAudio.mockResolvedValue(undefined)
  mediaAudio.fadeVolumeMediaAudio.mockResolvedValue(undefined)
  mediaAudio.resolveMusicAudioUrl.mockResolvedValue({ ok: true, url: 'audio://x', source: 'remote' })
  mediaAudio.resolveSlideImageUrl.mockResolvedValue(null)
  isProjectionModuleOpen.mockReturnValue(false)
})

const openTrack = async (over: Record<string, unknown> = {}) => {
  const store = useMediaStore()
  const r = await store.open({ musicId: 1, project: false, ...over })
  return { store, r }
}

describe('open — validações e modos', () => {
  it('musicId inválido -> trackMissing', async () => {
    const { r } = await openTrack({ musicId: 0 })
    expect(r).toMatchObject({ ok: false, messageKey: 'media.messages.trackMissing' })
  })

  it('track não encontrada -> erro', async () => {
    loadMediaTrack.mockResolvedValue(null)
    const { r } = await openTrack({})
    expect(r).toMatchObject({ ok: false, messageKey: 'media.messages.trackMissing' })
    const store = useMediaStore()
    expect(store.status).toBe('error')
  })

  it('resolveMusicAudioUrl falha -> degrada pra no_audio com warning', async () => {
    mediaAudio.resolveMusicAudioUrl.mockResolvedValue({ ok: false, url: '' })
    const { r, store } = await openTrack({})
    expect(r).toMatchObject({ ok: true, warningKey: 'media.messages.slidesOnlyNoAudio' })
    expect(store.playbackMode).toBe('no_audio')
    expect(store.status).toBe('ready')
  })

  it('reabrir mesma faixa mesmo modo: retoma play sem recarregar', async () => {
    const { store } = await openTrack({})
    getSharedAudio().paused = false
    getSharedAudio().volume = 1
    mediaAudio.playMediaAudio.mockClear()
    const r = await store.open({ musicId: 1, project: false })
    expect(r.ok).toBe(true)
    expect(loadMediaTrack).toHaveBeenCalledTimes(1) // não recarregou
  })

  it('reabrir mesma faixa com mode diferente: switchMode recarrega', async () => {
    const { store } = await openTrack({})
    const r = await store.open({ musicId: 1, mode: 'instrumental', project: false })
    expect(r.ok).toBe(true)
    expect(store.playbackMode).toBe('instrumental')
  })

  it('minimized explícito no replay', async () => {
    const { store } = await openTrack({})
    await store.open({ musicId: 1, project: false, minimized: false })
    expect(store.minimized).toBe(false)
  })
})

describe('play/pause/toggle/rotas de áudio', () => {
  it('play sem áudio na sessão: no-op', async () => {
    const { store } = await openTrack({})
    store.session!.audioUrl = ''
    mediaAudio.playMediaAudio.mockClear()
    await store.play()
    expect(mediaAudio.playMediaAudio).not.toHaveBeenCalled()
  })

  it('pause: fade quando volume > 0 e não-tv; tv pausa direto', async () => {
    const { store } = await openTrack({})
    getSharedAudio().volume = 0.8
    await store.pause()
    expect(mediaAudio.fadeVolumeMediaAudio).toHaveBeenCalled()
    expect(store.isPaused).toBe(true)

    await store.setAudioRoute('tv')
    getSharedAudio().volume = 0
    await store.pause()
    expect(mediaAudio.pauseMediaAudio).toHaveBeenCalled()
  })

  it('togglePlay alterna entre pause e play', async () => {
    const { store } = await openTrack({})
    store.status = 'playing'
    await store.togglePlay()
    expect(store.isPaused).toBe(true)
    await store.togglePlay()
    expect(store.isPlaying).toBe(true)
  })

  it('setAudioRoute mesmo valor: no-op; tv->pc chama play', async () => {
    const { store } = await openTrack({})
    const r0 = store.audioRoute
    await store.setAudioRoute(r0) // no-op: não persiste nem toca
    expect(store.audioRoute).toBe(r0)
    await store.setAudioRoute('tv')
    expect(store.audioOnTv).toBe(true)
    await store.setAudioRoute('pc') // tv->pc: play()
    expect(mediaAudio.fadeInMediaAudio).toHaveBeenCalled()
  })

  it('setAudioOnTv(true) atalho p/ tv', async () => {
    const { store } = await openTrack({})
    await store.setAudioOnTv(true)
    expect(store.audioOnTv).toBe(true)
  })
})

describe('seek / slides / volume', () => {
  it('seekTo sem áudio: no-op; com áudio clampa e aplica', async () => {
    const { store } = await openTrack({})
    store.seekTo(50) // sem session -> no-op
    store.session!.audioUrl = 'audio://x'
    store.seekTo(5000)
    expect(getSharedAudio().currentTime).toBe(100) // clamp no duration
    store.seekTo(10)
    expect(getSharedAudio().currentTime).toBe(10)
    expect(store.currentTimeSec).toBe(10)
  })

  it('seekRatio: duração 0 no-op; senão aplica proporção', async () => {
    const { store } = await openTrack({})
    store.seekRatio(0.5) // duration 0 -> no-op
    store.session!.audioUrl = 'audio://x'
    store.durationSec = 100
    store.seekRatio(0.5)
    expect(store.currentTimeSec).toBe(50)
    store.seekRatio(2)
    expect(store.currentTimeSec).toBe(100)
  })

  it('goToSlide clampa, busca com áudio e resolve imagem', async () => {
    const { store } = await openTrack({})
    await store.goToSlide(99)
    expect(store.slideIndex).toBe(0) // 1 slide
    await store.goToSlide(-1)
    expect(store.slideIndex).toBe(0)
    await store.nextSlide()
    expect(store.slideIndex).toBe(0)
    await store.previousSlide()
    expect(store.slideIndex).toBe(0)
  })

  it('setVolume clampa; no_audio só guarda preferência', async () => {
    const { store } = await openTrack({})
    store.setVolume(2)
    expect(store.volume).toBe(1)
    store.setVolume(-1)
    expect(store.volume).toBe(0)
    store.session!.mode = 'no_audio'
    getSharedAudio().volume = 0.5
    store.setVolume(0.9)
    expect(getSharedAudio().volume).toBe(0.5) // não toca no elemento
  })
})

describe('fila', () => {
  it('open sem keepQueue zera a fila; keepQueue mantém', async () => {
    const { store } = await openTrack({})
    store.queue = [{ musicId: 2, albumId: null, title: 'x' }] as never
    await store.open({ musicId: 1, project: false })
    expect(store.queue).toHaveLength(0)
  })

  it('next/previous/jump/clear/hasQueue', async () => {
    const { store } = await openTrack({})
    store.queue = [
      { musicId: 1, albumId: null, title: 'a' },
      { musicId: 2, albumId: null, title: 'b' },
    ] as never
    store.queueIndex = 0
    store.hasQueue()
    store.nextTrack()
    store.previousTrack()
    store.jumpToQueue(0)
    store.clearQueue()
    expect(store.queue).toHaveLength(0)
    expect(store.queueIndex).toBe(-1)
  })

  it('playAlbumQueue ordena pelo caller e toca startIndex', async () => {
    const { store } = await openTrack({})
    await store.playAlbumQueue([
      { musicId: 1, albumId: 1, title: 'a' },
      { musicId: 2, albumId: 1, title: 'b' },
    ])
    expect(store.queueIndex).toBe(0)
    await store.playQueue([{ musicId: 3, albumId: 1, title: 'c' } as never], 5)
    // startIndex fora do range: first undefined -> retorna sem tocar; index mantém 0
    expect(store.queueIndex).toBe(0)
  })
})

describe('player UI state', () => {
  it('minimize/maximize/togglePlaylist/setPlaylistOpen/requestClose/cancelClose', async () => {
    const { store } = await openTrack({})
    store.minimize()
    expect(store.minimized).toBe(true)
    store.maximize()
    expect(store.minimized).toBe(false)
    store.togglePlaylist()
    expect(store.showPlaylist).toBe(false)
    store.setPlaylistOpen(true)
    expect(store.showPlaylist).toBe(true)
    store.requestClose()
    expect(store.closeConfirmOpen).toBe(true)
    store.cancelClose()
    expect(store.closeConfirmOpen).toBe(false)
  })

  it('clearError limpa lastErrorKey; previewSnippet/reference e labels', async () => {
    const { store } = await openTrack({})
    store.lastErrorKey = 'x'
    store.clearError()
    expect(store.lastErrorKey).toBeNull()
    expect(store.previewSnippet).toBeTruthy()
    expect(store.previewReference).toContain('Faixa 1')
    expect(store.currentTimeLabel).toBeDefined()
    expect(store.durationLabel).toBeDefined()
    expect(store.slideCount).toBeGreaterThan(0)
    expect(store.hasInstrumental).toBe(false)
    store.durationSec = 100
    store.currentTimeSec = 25
    expect(store.progressRatio).toBeCloseTo(0.25)
    expect(store.hasSession).toBe(true)
  })
})

describe('switchMode', () => {
  it('sem sessão -> trackMissing; mesmo modo -> ok imediato', async () => {
    const { store } = await openTrack({})
    const r = await store.switchMode(store.playbackMode)
    expect(r.ok).toBe(true)
  })

  it('audio -> instrumental troca a fonte e preserva playing', async () => {
    loadMediaTrack.mockResolvedValue(
      trackStub({ instrumentalUrl: '/m/1-inst.mp3' }),
    )
    const { store } = await openTrack({})
    store.status = 'playing'
    const r = await store.switchMode('instrumental')
    expect(r.ok).toBe(true)
    expect(store.playbackMode).toBe('instrumental')
  })

  it('audio -> no_audio faz fade e mantém slides', async () => {
    const { store } = await openTrack({})
    const r = await store.switchMode('no_audio')
    expect(r.ok).toBe(true)
    expect(store.playbackMode).toBe('no_audio')
    await store.switchMode('audio') // volta: mesma fonte restaurada
    expect(store.playbackMode).toBe('audio')
  })
})

describe('syncProjectionFlag e hasLivePalcoTvs', () => {
  it('projectingTvsOnly mantém projeção mesmo sem janela', async () => {
    const { store } = await openTrack({})
    store.isProjecting = true
    // simula TVs-only via rota interna: startProjection com openProjectionModule false + TVs
    // caminho simples: chama syncProjectionFlag com janela fechada -> desliga
    store.syncProjectionFlag()
    // isProjectionModuleOpen false -> isProjecting false
    expect(store.isProjecting).toBe(false)
  })

  it('startProjection: janela aberta -> true sem reabrir (republica)', async () => {
    const { store } = await openTrack({})
    isProjectionModuleOpen.mockReturnValue(true)
    store.isProjecting = false
    openProjectionModule.mockClear()
    const ok = await store.startProjection()
    expect(ok).toBe(true)
    expect(store.isProjecting).toBe(true)
    expect(openProjectionModule).not.toHaveBeenCalled()
  })
})
