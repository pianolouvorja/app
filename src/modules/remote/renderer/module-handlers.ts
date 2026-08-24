/**
 * Handlers v2 do Controle Remoto — módulos bible/timer/countdown.
 *
 * Cada namespace recebe o STORE REAL do desktop (pinia) injetado e expõe:
 * - execute(action, msg): roteia o comando às ações do store
 * - snapshot(): estado mínimo serializável para o APK
 *
 * Spec: Obsidian "LouvorJA — Controle Remoto Total v2 Spec".
 * Comandos desconhecidos/inválidos → false (ack negativo, sem throw).
 */

export interface ModuleHandlers {
  execute(namespace: string, action: string, msg: Record<string, unknown>): Promise<boolean>
  snapshot(namespace: string): Record<string, unknown> | null
}

interface RefLike<T> {
  value: T
}

interface BibleStoreLike {
  selectedBookId: RefLike<number | null>
  selectedChapter: RefLike<number>
  selectedVerses: RefLike<number[]>
  isProjecting: RefLike<boolean>
  books: RefLike<Array<{ id: number; chapters: number }>>
  selectVersion?(versionId: number): unknown
  selectBook(bookId: number): unknown
  selectChapter(chapter: number): unknown
  selectVerse(verseNumber: number, event?: unknown): unknown
  clearSelection(): unknown
  openProjection(): Promise<boolean>
  clearProjectionWindow(): unknown
}

interface TimerStoreLike {
  isProjecting: RefLike<boolean>
  runtime: RefLike<{ status: string; accumulatedMs: number; savedTimesMs?: number[] }>
  start(): unknown
  pause(): unknown
  reset(): unknown
  saveMark(): unknown
  removeSavedMark(index: number): unknown
  clearSavedMarks(): unknown
}

interface CountdownStoreLike {
  isProjecting: RefLike<boolean>
  runtime: RefLike<{
    status: string
    durationMs: number
    accumulatedMs: number
    savedTimesMs?: number[]
    finished: boolean
  }>
  start(): unknown
  pause(): unknown
  reset(): unknown
  saveMark(): unknown
  setDurationMs(durationMs: number): unknown
}

interface ClockStoreLike {
  config: RefLike<{ style: string; showSeconds: boolean; format24h: boolean }>
  isProjecting: RefLike<boolean>
  setStyle(style: string): unknown
  setShowSeconds(showSeconds: boolean): unknown
  setFormat24h(format24h: boolean): unknown
  toggleProjection(): unknown
}

const CLOCK_STYLES = new Set(['digital', 'analog'])

interface RandomStoreLike {
  session: RefLike<{ mode: string }>
  runtime: RefLike<{ isDrawing: boolean; currentDisplay: string | null }>
  isProjecting: RefLike<boolean>
  available: RefLike<string[]>
  drawn: RefLike<string[]>
  setMode(mode: string): unknown
  addName(raw?: string): unknown
  removeAvailable(index: number): unknown
  clearAvailable(): unknown
  generateNumberRange(): boolean
  startDraw(): unknown
  cancelDrawAnimation(): unknown
  clearHistory(): unknown
  resetAll(): unknown
}

const RANDOM_MODES = new Set(['names', 'numbers'])

const MEDIA_MODES = new Set(['audio', 'instrumental', 'no_audio'])

type OpenMusicPlayer = (params: {
  musicId: number
  mode: string
  albumId: number | null
}) => Promise<{ ok: boolean; messageKey?: string } | { ok: boolean } | object>

interface MediaStoreLike {
  openMusicPlayer: OpenMusicPlayer
}

export interface ModuleHandlerDeps {
  media?: MediaStoreLike
  bible?: BibleStoreLike
  timer?: TimerStoreLike
  countdown?: CountdownStoreLike
  clock?: ClockStoreLike
  random?: RandomStoreLike
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

async function executeBible(
  bible: BibleStoreLike,
  action: string,
  msg: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'bible.open': {
      const bookId = msg.bookId
      if (!isNum(bookId)) return false
      const book = bible.books.value.find((b) => b.id === bookId)
      if (!book) return false
      const chapter = isNum(msg.chapter) ? msg.chapter : 1
      if (chapter < 1 || chapter > book.chapters) return false
      if (isNum(msg.versionId)) bible.selectVersion?.(msg.versionId)
      bible.selectBook(bookId)
      bible.selectChapter(chapter)
      // Versículo inicial opcional — destaca e projeta.
      if (isNum(msg.verse) && msg.verse >= 1) {
        bible.selectVerse(msg.verse)
      }
      return bible.openProjection()
    }
    case 'bible.selectVerse': {
      const verse = msg.verse
      if (!isNum(verse) || verse < 1) return false
      bible.selectVerse(verse)
      return true
    }
    case 'bible.clearSelection':
      bible.clearSelection()
      return true
    case 'bible.close':
      bible.clearProjectionWindow()
      return true
    default:
      return false
  }
}

function snapshotBible(bible: BibleStoreLike): Record<string, unknown> {
  return {
    bookId: bible.selectedBookId.value,
    chapter: bible.selectedChapter.value,
    selectedVerses: [...bible.selectedVerses.value],
    isProjecting: bible.isProjecting.value,
  }
}

async function executeTimer(
  timer: TimerStoreLike,
  action: string,
  msg: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'timer.start':
      timer.start()
      return true
    case 'timer.pause':
      timer.pause()
      return true
    case 'timer.reset':
      timer.reset()
      return true
    case 'timer.saveMark':
      timer.saveMark()
      return true
    case 'timer.removeMark': {
      const index = msg.index
      if (!isNum(index) || index < 0) return false
      timer.removeSavedMark(index)
      return true
    }
    case 'timer.clearMarks':
      timer.clearSavedMarks()
      return true
    default:
      return false
  }
}

function snapshotTimer(timer: TimerStoreLike): Record<string, unknown> {
  return {
    status: timer.runtime.value.status,
    accumulatedMs: timer.runtime.value.accumulatedMs,
    savedTimesMs: [...(timer.runtime.value.savedTimesMs ?? [])],
    isProjecting: timer.isProjecting.value,
  }
}

async function executeCountdown(
  countdown: CountdownStoreLike,
  action: string,
  msg: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'countdown.start':
      countdown.start()
      return true
    case 'countdown.pause':
      countdown.pause()
      return true
    case 'countdown.reset':
      countdown.reset()
      return true
    case 'countdown.saveMark':
      countdown.saveMark()
      return true
    case 'countdown.setDuration': {
      const durationMs = msg.durationMs
      if (!isNum(durationMs) || durationMs <= 0) return false
      countdown.setDurationMs(durationMs)
      return true
    }
    default:
      return false
  }
}

function snapshotCountdown(
  countdown: CountdownStoreLike,
): Record<string, unknown> {
  return {
    status: countdown.runtime.value.status,
    durationMs: countdown.runtime.value.durationMs,
    accumulatedMs: countdown.runtime.value.accumulatedMs,
    finished: countdown.runtime.value.finished,
    savedTimesMs: [...(countdown.runtime.value.savedTimesMs ?? [])],
    isProjecting: countdown.isProjecting.value,
  }
}

async function executeMedia(
  media: MediaStoreLike,
  action: string,
  msg: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'media.open': {
      const musicId = msg.musicId
      if (!isNum(musicId) || musicId <= 0) return false
      const mode = msg.mode
      if (mode !== undefined && (typeof mode !== 'string' || !MEDIA_MODES.has(mode))) {
        return false
      }
      const albumId = msg.albumId
      if (albumId !== undefined && !isNum(albumId)) return false
      const result = (await media.openMusicPlayer({
        musicId,
        mode: mode ?? 'audio',
        albumId: isNum(albumId) ? albumId : null,
      })) as { ok?: boolean } | object
      return (result as { ok?: boolean }).ok === true
    }
    default:
      return false
  }
}

async function executeClock(
  clock: ClockStoreLike,
  action: string,
  msg: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'clock.setConfig': {
      const { style, showSeconds, format24h } = msg
      let applied = false
      if (style !== undefined) {
        if (typeof style !== 'string' || !CLOCK_STYLES.has(style)) return false
        clock.setStyle(style)
        applied = true
      }
      if (showSeconds !== undefined) {
        if (typeof showSeconds !== 'boolean') return false
        clock.setShowSeconds(showSeconds)
        applied = true
      }
      if (format24h !== undefined) {
        if (typeof format24h !== 'boolean') return false
        clock.setFormat24h(format24h)
        applied = true
      }
      return applied
    }
    case 'clock.toggleProjection':
      clock.toggleProjection()
      return true
    default:
      return false
  }
}

function snapshotClock(clock: ClockStoreLike): Record<string, unknown> {
  return {
    style: clock.config.value.style,
    showSeconds: clock.config.value.showSeconds,
    format24h: clock.config.value.format24h,
    isProjecting: clock.isProjecting.value,
  }
}

async function executeRandom(
  random: RandomStoreLike,
  action: string,
  msg: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'random.setMode': {
      const mode = msg.mode
      if (typeof mode !== 'string' || !RANDOM_MODES.has(mode)) return false
      random.setMode(mode)
      return true
    }
    case 'random.addName': {
      const name = msg.name
      if (typeof name !== 'string' || name.trim().length === 0) return false
      random.addName(name.trim())
      return true
    }
    case 'random.removeAvailable': {
      const index = msg.index
      if (!isNum(index) || index < 0) return false
      random.removeAvailable(index)
      return true
    }
    case 'random.clearAvailable':
      random.clearAvailable()
      return true
    case 'random.generateNumberRange':
      random.generateNumberRange()
      return true
    case 'random.startDraw':
      random.startDraw()
      return true
    case 'random.cancelDraw':
      random.cancelDrawAnimation()
      return true
    case 'random.clearHistory':
      random.clearHistory()
      return true
    case 'random.resetAll':
      random.resetAll()
      return true
    default:
      return false
  }
}

function snapshotRandom(random: RandomStoreLike): Record<string, unknown> {
  return {
    mode: random.session.value.mode,
    drawnCount: random.drawn.value.length,
    availableCount: random.available.value.length,
    isDrawing: random.runtime.value.isDrawing,
    currentDisplay: random.runtime.value.currentDisplay,
    isProjecting: random.isProjecting.value,
  }
}

export function createModuleHandlers(deps: ModuleHandlerDeps): ModuleHandlers {
  return {
    async execute(namespace, action, msg) {
      try {
        if (namespace === 'media' && deps.media) {
          return executeMedia(deps.media, action, msg)
        }
        if (namespace === 'bible' && deps.bible) {
          return executeBible(deps.bible, action, msg)
        }
        if (namespace === 'timer' && deps.timer) {
          return executeTimer(deps.timer, action, msg)
        }
        if (namespace === 'countdown' && deps.countdown) {
          return executeCountdown(deps.countdown, action, msg)
        }
        if (namespace === 'clock' && deps.clock) {
          return executeClock(deps.clock, action, msg)
        }
        if (namespace === 'random' && deps.random) {
          return executeRandom(deps.random, action, msg)
        }
        return false
      } catch {
        return false
      }
    },
    snapshot(namespace) {
      if (namespace === 'bible' && deps.bible) return snapshotBible(deps.bible)
      if (namespace === 'timer' && deps.timer) return snapshotTimer(deps.timer)
      if (namespace === 'countdown' && deps.countdown) {
        return snapshotCountdown(deps.countdown)
      }
      if (namespace === 'clock' && deps.clock) return snapshotClock(deps.clock)
      if (namespace === 'random' && deps.random) {
        return snapshotRandom(deps.random)
      }
      return null
    },
  }
}
