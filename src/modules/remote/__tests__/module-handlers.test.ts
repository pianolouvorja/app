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

describe('createModuleHandlers — namespace desconhecido', () => {
  it('execute/snapshot retornam false/null para namespace inexistente', async () => {
    const h = createModuleHandlers({ bible: makeBibleStore() })
    expect(await h.execute('random', 'random.startDraw')).toBe(false)
    expect(h.snapshot('random')).toBeNull()
  })
})
