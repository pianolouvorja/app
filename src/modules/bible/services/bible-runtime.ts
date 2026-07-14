import { emptySelection } from './scripture-format'
import type { BibleSelection } from '../types/bible'

export const BIBLE_RUNTIME_CHANNEL = 'louvorja-bible-runtime'
export const BIBLE_RUNTIME_STORAGE_KEY = 'louvorja-bible-runtime-state'

export type BibleProjectionRuntime = {
  active: boolean
  text: string
  reference: string
}

export const DEFAULT_BIBLE_RUNTIME: BibleProjectionRuntime = {
  active: false,
  text: '',
  reference: '',
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

export function selectionToRuntime(selection: BibleSelection): BibleProjectionRuntime {
  const text = selection.text.trim()
  const reference = selection.scripturalReference.trim()
  return {
    active: text.length > 0 && selection.verses.length > 0,
    text,
    reference,
  }
}

export function normalizeBibleRuntime(raw: unknown): BibleProjectionRuntime {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BIBLE_RUNTIME }
  }

  const source = raw as Record<string, unknown>
  const text = asString(source.text, '')
  const reference = asString(source.reference, '')

  return {
    active: source.active === true && text.length > 0,
    text,
    reference,
  }
}

export function readBibleRuntimeFromStorage(): BibleProjectionRuntime {
  try {
    const raw = localStorage.getItem(BIBLE_RUNTIME_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_BIBLE_RUNTIME }
    return normalizeBibleRuntime(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_BIBLE_RUNTIME }
  }
}

export function writeBibleRuntimeToStorage(state: BibleProjectionRuntime): void {
  try {
    localStorage.setItem(BIBLE_RUNTIME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage pode falhar em contextos restritos
  }
}

export function publishBibleRuntime(state: BibleProjectionRuntime): void {
  writeBibleRuntimeToStorage(state)

  try {
    const channel = new BroadcastChannel(BIBLE_RUNTIME_CHANNEL)
    channel.postMessage(state)
    channel.close()
  } catch {
    // BroadcastChannel pode não existir em ambientes antigos
  }
}

export function publishBibleSelection(selection: BibleSelection = emptySelection()): void {
  publishBibleRuntime(selectionToRuntime(selection))
}
