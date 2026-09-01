/**
 * Tests — módulos v2 do Controle Remoto (bible/timer/countdown).
 *
 * O handler v2 (createModuleHandlers) recebe stores INJETADOS e devolve
 * { execute(action, msg), snapshot() } por namespace. Testes com mocks
 * que espelham a superfície real dos stores do desktop.
 */

import { describe, expect, it, vi } from 'vitest'

import { createModuleHandlers } from '../renderer/module-handlers'

function makeBibleStore() {
  return {
    selectedBookId: { value: 1 },
    selectedChapter: { value: 3 },
    selectedVerses: { value: [3, 4] },
    isProjecting: { value: false },
    versions: { value: [{ id: 1, abbreviation: 'ARA' }] },
    books: { value: [{ id: 1, name: 'Gênesis', chapters: 50 }] },
    projection: { value: {} },
    verses: { value: { '3': 'texto do versículo 3' } },
    selectVersion: vi.fn(),
    selectBook: vi.fn(),
    selectChapter: vi.fn(),
    selectVerse: vi.fn(),
    clearSelection: vi.fn(),
    openProjection: vi.fn().mockResolvedValue(true),
    toggleProjection: vi.fn(),
    clearProjectionWindow: vi.fn(),
  }
}

function makeTimerStore() {
  return {
    isRunning: { value: false },
    isPaused: { value: false },
    isProjecting: { value: false },
    runtime: { value: { status: 'idle', accumulatedMs: 0, savedTimesMs: [] } },
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    saveMark: vi.fn(),
    removeSavedMark: vi.fn(),
    clearSavedMarks: vi.fn(),
  }
}

function makeCountdownStore() {
  return {
    isRunning: { value: false },
    isPaused: { value: false },
    isProjecting: { value: false },
    runtime: {
      value: {
        status: 'idle',
        durationMs: 300000,
        accumulatedMs: 0,
        savedTimesMs: [],
        finished: false,
      },
    },
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    saveMark: vi.fn(),
    setDurationMs: vi.fn(),
  }
}

describe('createModuleHandlers — bible', () => {
  it('bible.open seleciona livro+capítulo, versículo e projeta', async () => {
    const bible = makeBibleStore()
    const h = createModuleHandlers({ bible })
    const ok = await h.execute('bible', 'bible.open', {
      versionId: 1,
      bookId: 1,
      chapter: 3,
      verse: 3,
    })
    expect(ok).toBe(true)
    expect(bible.selectBook).toHaveBeenCalledWith(1)
    expect(bible.selectChapter).toHaveBeenCalledWith(3)
    expect(bible.openProjection).toHaveBeenCalled()
  })

  it('bible.selectVerse destaca versículo sem reprojetar tudo', async () => {
    const bible = makeBibleStore()
    const h = createModuleHandlers({ bible })
    const ok = await h.execute('bible', 'bible.selectVerse', { verse: 7 })
    expect(ok).toBe(true)
    expect(bible.selectVerse).toHaveBeenCalledWith(7)
  })

  it('bible.open com bookId inválido retorna false', async () => {
    const bible = makeBibleStore()
    const h = createModuleHandlers({ bible })
    const ok = await h.execute('bible', 'bible.open', { bookId: 999 })
    expect(ok).toBe(false)
    expect(bible.openProjection).not.toHaveBeenCalled()
  })

  it('bible.close fecha a projeção', async () => {
    const bible = makeBibleStore()
    const h = createModuleHandlers({ bible })
    await h.execute('bible', 'bible.close')
    expect(bible.clearProjectionWindow).toHaveBeenCalled()
  })

  it('snapshot bible traz livro/capítulo/versículos/projeção', () => {
    const bible = makeBibleStore()
    const h = createModuleHandlers({ bible })
    const snap = h.snapshot('bible')
    expect(snap).toMatchObject({
      bookId: 1,
      chapter: 3,
      selectedVerses: [3, 4],
      isProjecting: false,
    })
  })
})

describe('createModuleHandlers — timer', () => {
  it('timer.start/pause/reset delegam ao store', async () => {
    const timer = makeTimerStore()
    const h = createModuleHandlers({ timer })
    expect(await h.execute('timer', 'timer.start')).toBe(true)
    expect(await h.execute('timer', 'timer.pause')).toBe(true)
    expect(await h.execute('timer', 'timer.reset')).toBe(true)
    expect(timer.start).toHaveBeenCalled()
    expect(timer.pause).toHaveBeenCalled()
    expect(timer.reset).toHaveBeenCalled()
  })

  it('timer.saveMark/removeMark/clearMarks', async () => {
    const timer = makeTimerStore()
    const h = createModuleHandlers({ timer })
    expect(await h.execute('timer', 'timer.saveMark')).toBe(true)
    expect(await h.execute('timer', 'timer.removeMark', { index: 1 })).toBe(true)
    expect(await h.execute('timer', 'timer.clearMarks')).toBe(true)
    expect(timer.removeSavedMark).toHaveBeenCalledWith(1)
  })

  it('timer.removeMark com index inválido retorna false', async () => {
    const timer = makeTimerStore()
    const h = createModuleHandlers({ timer })
    expect(await h.execute('timer', 'timer.removeMark', {})).toBe(false)
    expect(await h.execute('timer', 'timer.removeMark', { index: -1 })).toBe(
      false,
    )
  })

  it('snapshot timer traz status/marcas', () => {
    const timer = makeTimerStore()
    const h = createModuleHandlers({ timer })
    expect(h.snapshot('timer')).toMatchObject({
      status: 'idle',
      savedTimesMs: [],
    })
  })
})

describe('createModuleHandlers — countdown', () => {
  it('countdown.start/pause/reset delegam', async () => {
    const countdown = makeCountdownStore()
    const h = createModuleHandlers({ countdown })
    expect(await h.execute('countdown', 'countdown.start')).toBe(true)
    expect(await h.execute('countdown', 'countdown.pause')).toBe(true)
    expect(await h.execute('countdown', 'countdown.reset')).toBe(true)
    expect(countdown.start).toHaveBeenCalled()
  })

  it('countdown.setDuration valida ms positivo', async () => {
    const countdown = makeCountdownStore()
    const h = createModuleHandlers({ countdown })
    expect(
      await h.execute('countdown', 'countdown.setDuration', { durationMs: 60_000 }),
    ).toBe(true)
    expect(countdown.setDurationMs).toHaveBeenCalledWith(60_000)
    expect(
      await h.execute('countdown', 'countdown.setDuration', { durationMs: 0 }),
    ).toBe(false)
    expect(await h.execute('countdown', 'countdown.setDuration', {})).toBe(false)
  })

  it('snapshot countdown traz duração/status', () => {
    const countdown = makeCountdownStore()
    const h = createModuleHandlers({ countdown })
    expect(h.snapshot('countdown')).toMatchObject({
      durationMs: 300000,
      status: 'idle',
    })
  })
})

function makeClockStore() {
  return {
    config: { value: { style: 'digital', showSeconds: true, format24h: true } },
    isProjecting: { value: false },
    setStyle: vi.fn(),
    setShowSeconds: vi.fn(),
    setFormat24h: vi.fn(),
    toggleProjection: vi.fn(),
  }
}

function makeRandomStore() {
  return {
    session: { value: { mode: 'names' } },
    runtime: { value: { isDrawing: false, currentDisplay: null } },
    isProjecting: { value: false },
    available: { value: ['Ana', 'Beto'] },
    drawn: { value: ['Carol'] },
    setMode: vi.fn(),
    addName: vi.fn(),
    removeAvailable: vi.fn(),
    clearAvailable: vi.fn(),
    generateNumberRange: vi.fn(() => true),
    startDraw: vi.fn(),
    cancelDrawAnimation: vi.fn(),
    clearHistory: vi.fn(),
    resetAll: vi.fn(),
  }
}

describe('createModuleHandlers — clock', () => {
  it('clock.setConfig aplica style/showSeconds/format24h', async () => {
    const clock = makeClockStore()
    const h = createModuleHandlers({ clock })
    const ok = await h.execute('clock', 'clock.setConfig', {
      style: 'analog',
      showSeconds: false,
    })
    expect(ok).toBe(true)
    expect(clock.setStyle).toHaveBeenCalledWith('analog')
    expect(clock.setShowSeconds).toHaveBeenCalledWith(false)
    expect(clock.setFormat24h).not.toHaveBeenCalled()
  })

  it('clock.setConfig com style inválido retorna false', async () => {
    const clock = makeClockStore()
    const h = createModuleHandlers({ clock })
    expect(
      await h.execute('clock', 'clock.setConfig', { style: 'bizarro' }),
    ).toBe(false)
    expect(clock.setStyle).not.toHaveBeenCalled()
  })

  it('clock.toggleProjection delega', async () => {
    const clock = makeClockStore()
    const h = createModuleHandlers({ clock })
    expect(await h.execute('clock', 'clock.toggleProjection')).toBe(true)
    expect(clock.toggleProjection).toHaveBeenCalled()
  })

  it('snapshot clock traz config e projeção', () => {
    const clock = makeClockStore()
    const h = createModuleHandlers({ clock })
    expect(h.snapshot('clock')).toMatchObject({
      style: 'digital',
      showSeconds: true,
      format24h: true,
      isProjecting: false,
    })
  })
})

describe('createModuleHandlers — random', () => {
  it('random.setMode valida modo', async () => {
    const random = makeRandomStore()
    const h = createModuleHandlers({ random })
    expect(await h.execute('random', 'random.setMode', { mode: 'numbers' })).toBe(true)
    expect(random.setMode).toHaveBeenCalledWith('numbers')
    expect(await h.execute('random', 'random.setMode', { mode: 'x' })).toBe(false)
  })

  it('random.startDraw/cancel/clearHistory/resetAll delegam', async () => {
    const random = makeRandomStore()
    const h = createModuleHandlers({ random })
    expect(await h.execute('random', 'random.startDraw')).toBe(true)
    expect(await h.execute('random', 'random.cancelDraw')).toBe(true)
    expect(await h.execute('random', 'random.clearHistory')).toBe(true)
    expect(await h.execute('random', 'random.resetAll')).toBe(true)
    expect(random.startDraw).toHaveBeenCalled()
    expect(random.cancelDrawAnimation).toHaveBeenCalled()
  })

  it('random.addName valida string não vazia', async () => {
    const random = makeRandomStore()
    const h = createModuleHandlers({ random })
    expect(await h.execute('random', 'random.addName', { name: ' Ana ' })).toBe(true)
    expect(random.addName).toHaveBeenCalledWith('Ana')
    expect(await h.execute('random', 'random.addName', { name: '  ' })).toBe(false)
    expect(await h.execute('random', 'random.addName', {})).toBe(false)
  })

  it('random.removeAvailable valida index', async () => {
    const random = makeRandomStore()
    const h = createModuleHandlers({ random })
    expect(await h.execute('random', 'random.removeAvailable', { index: 1 })).toBe(true)
    expect(await h.execute('random', 'random.removeAvailable', { index: -1 })).toBe(false)
  })

  it('random.generateNumberRange delega', async () => {
    const random = makeRandomStore()
    const h = createModuleHandlers({ random })
    expect(await h.execute('random', 'random.generateNumberRange')).toBe(true)
    expect(random.generateNumberRange).toHaveBeenCalled()
  })

  it('snapshot random traz modo/drawn/isDrawing', () => {
    const random = makeRandomStore()
    const h = createModuleHandlers({ random })
    expect(h.snapshot('random')).toMatchObject({
      mode: 'names',
      drawnCount: 1,
      availableCount: 2,
      isDrawing: false,
    })
  })
})

describe('createModuleHandlers — media (fase 3)', () => {
  it('media.open chama openMusicPlayer com musicId+modo+projecao', async () => {
    const openMusicPlayer = vi.fn().mockResolvedValue({ ok: true })
    const h = createModuleHandlers({ media: { openMusicPlayer } })
    const ok = await h.execute('media', 'media.open', {
      musicId: 378,
      mode: 'instrumental',
    })
    expect(ok).toBe(true)
    expect(openMusicPlayer).toHaveBeenCalledWith({
      musicId: 378,
      mode: 'instrumental',
      albumId: null,
    })
  })

  it('media.open com musicId invalido retorna false', async () => {
    const openMusicPlayer = vi.fn().mockResolvedValue({ ok: true })
    const h = createModuleHandlers({ media: { openMusicPlayer } })
    expect(await h.execute('media', 'media.open', {})).toBe(false)
    expect(await h.execute('media', 'media.open', { musicId: 0 })).toBe(false)
    expect(openMusicPlayer).not.toHaveBeenCalled()
  })

  it('media.open com resultado !ok retorna false', async () => {
    const openMusicPlayer = vi
      .fn()
      .mockResolvedValue({ ok: false, messageKey: 'x' })
    const h = createModuleHandlers({ media: { openMusicPlayer } })
    expect(
      await h.execute('media', 'media.open', { musicId: 5, mode: 'audio' }),
    ).toBe(false)
  })

  it('media.open com modo invalido retorna false', async () => {
    const h = createModuleHandlers({
      media: { openMusicPlayer: vi.fn() },
    })
    expect(
      await h.execute('media', 'media.open', { musicId: 5, mode: 'x' }),
    ).toBe(false)
  })

  it('snapshot media retorna null (estado vive no player do bridge)', () => {
    const h = createModuleHandlers({ media: { openMusicPlayer: vi.fn() } })
    expect(h.snapshot('media')).toBeNull()
  })
})

describe('createModuleHandlers — namespace desconhecido', () => {
  it('execute/snapshot retornam false/null para namespace inexistente', async () => {
    const h = createModuleHandlers({ bible: makeBibleStore() })
    expect(await h.execute('random', 'random.startDraw')).toBe(false)
    expect(h.snapshot('random')).toBeNull()
  })
})
