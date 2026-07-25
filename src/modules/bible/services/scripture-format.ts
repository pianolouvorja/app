import type { BibleChapterVerses, BibleSelection } from '../types/bible'

/** Agrupa números em intervalos legíveis (ex.: 1-3,5). */
export function formatVerseIntervals(verses: number[]): string {
  if (verses.length === 0) return ''

  const sorted = [...verses].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    if (current === end + 1) {
      end = current
      continue
    }
    parts.push(start === end ? String(start) : `${start}-${end}`)
    start = current
    end = current
  }

  parts.push(start === end ? String(start) : `${start}-${end}`)
  return parts.join(',')
}

/** Monta a referência bíblica exibida/projetada. */
export function formatScripturalReference(selection: {
  bookName: string
  chapter: number
  verses: number[]
  versionAbbreviation?: string
}): string {
  if (!selection.bookName || !selection.chapter) return ''

  const versePart =
    selection.verses.length > 0 ? `:${formatVerseIntervals(selection.verses)}` : ''
  const versionPart = selection.versionAbbreviation
    ? ` (${selection.versionAbbreviation})`
    : ''

  return `${selection.bookName} ${selection.chapter}${versePart}${versionPart}`
}

/** Concatena o texto dos versículos selecionados. */
export function buildProjectionText(
  verses: BibleChapterVerses,
  selected: number[],
): string {
  return selected
    .map((num) => verses[String(num)])
    .filter((text): text is string => Boolean(text))
    .join(' ')
}

/**
 * Interpreta busca por números/intervalos (`1`, `1-3`, `1,3-5`).
 * Retorna apenas versículos existentes no capítulo.
 */
export function parseVerseQuery(
  query: string,
  verses: BibleChapterVerses,
): number[] {
  const selected = new Set<number>()
  const parts = query.split(',')

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-')
      const start = Number(startStr?.trim())
      const end = Number(endStr?.trim())
      if (Number.isNaN(start) || Number.isNaN(end)) continue

      const from = Math.min(start, end)
      const to = Math.max(start, end)
      for (let i = from; i <= to; i += 1) {
        if (verses[String(i)]) selected.add(i)
      }
      continue
    }

    const num = Number(trimmed)
    if (!Number.isNaN(num) && verses[String(num)]) {
      selected.add(num)
    }
  }

  return Array.from(selected).sort((a, b) => a - b)
}

export function emptySelection(): BibleSelection {
  return {
    versionId: null,
    bookId: null,
    versionAbbreviation: '',
    bookName: '',
    chapter: 1,
    verses: [],
    scripturalReference: '',
    text: '',
  }
}
