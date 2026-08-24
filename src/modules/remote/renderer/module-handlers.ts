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

interface BibleStoreLike {
  selectedBookId: { value: number | null }
  selectedChapter: { value: number }
  selectedVerses: { value: number[] }
  isProjecting: { value: boolean }
  books: { value: Array<{ id: number; chapters: number }> }
  selectVersion?(versionId: number): unknown
  selectBook(bookId: number): unknown
  selectChapter(chapter: number): unknown
  selectVerse(verseNumber: number, event?: unknown): unknown
  clearSelection(): unknown
  openProjection(): Promise<boolean>
  clearProjectionWindow(): unknown
}

interface TimerStoreLike {
  isProjecting: { value: boolean }
  runtime: {
    value: { status: string; accumulatedMs: number; savedTimesMs?: number[] }
  }
  start(): unknown
  pause(): unknown
  reset(): unknown
  saveMark(): unknown
  removeSavedMark(index: number): unknown
  clearSavedMarks(): unknown
}

interface CountdownStoreLike {
  isProjecting: { value: boolean }
  runtime: {
    value: {
      status: string
      durationMs: number
      accumulatedMs: number
      savedTimesMs?: number[]
      finished: boolean
    }
  }
  start(): unknown
  pause(): unknown
  reset(): unknown
  saveMark(): unknown
  setDurationMs(durationMs: number): unknown
}

export interface ModuleHandlerDeps {
  bible?: BibleStoreLike
  timer?: TimerStoreLike
  countdown?: CountdownStoreLike
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

export function createModuleHandlers(deps: ModuleHandlerDeps): ModuleHandlers {
  return {
    async execute(namespace, action, msg) {
      try {
        if (namespace === 'bible' && deps.bible) {
          return executeBible(deps.bible, action, msg)
        }
        if (namespace === 'timer' && deps.timer) {
          return executeTimer(deps.timer, action, msg)
        }
        if (namespace === 'countdown' && deps.countdown) {
          return executeCountdown(deps.countdown, action, msg)
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
      return null
    },
  }
}
