import { fetchRemoteCatalogJson } from '@shared/services/remote-catalog'
import { readCatalogRecord } from '@shared/services/workspace-api'

import { getCurrentApiPrefix } from '@modules/sync/services/library-catalog'

import type {
  BibleBook,
  BibleBookTone,
  BibleChapterVerses,
  BibleTestament,
  BibleVersion,
  CatalogBibleBookRow,
  CatalogBibleVersionRow,
} from '../types/bible'

/** Arquivos do catálogo bíblico por idioma: es_bible_book, pt_bible_book... */
function booksFile(): string {
  return `${getCurrentApiPrefix()}_bible_book`
}

function versionsFile(): string {
  return `${getCurrentApiPrefix()}_bible_version`
}

async function readOrFetchCatalog<T>(filename: string): Promise<T | null> {
  const local = await readCatalogRecord<T>(filename)
  if (local != null) return local

  try {
    return await fetchRemoteCatalogJson<T>(filename)
  } catch (error) {
    // 404 de catálogo por idioma é caminho esperado (nem todo idioma tem
    // bíblia traduzida na API) — silencioso; outros erros logam.
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('404')) {
      console.warn(`[bible] falha ao obter catálogo ${filename}`, error)
    }
    return null
  }
}

/** Lê o catálogo do idioma atual; se a API não tiver (404), cai no pt_. */
async function readOrFetchBibleCatalog<T>(filename: string): Promise<T | null> {
  const localized = await readOrFetchCatalog<T>(filename)
  if (localized != null) return localized

  // Fallback: nem todo idioma tem bíblia traduzida na API — PT é o cânone.
  if (!filename.startsWith('pt_')) {
    return readOrFetchCatalog<T>(filename.replace(/^[a-z]+_/, 'pt_'))
  }
  return null
}

function mapBook(row: CatalogBibleBookRow): BibleBook {
  return {
    id: Number(row.id_bible_book),
    name: String(row.name),
    abbreviation: String(row.abbreviation),
    chapters: Number(row.chapters) || 0,
    bookNumber: Number(row.book_number) || 0,
    languageId: String(row.id_language ?? 'pt'),
  }
}

function mapVersion(row: CatalogBibleVersionRow): BibleVersion {
  return {
    id: Number(row.id_bible_version),
    abbreviation: String(row.abbreviation),
    name: String(row.name),
    languageId: String(row.id_language ?? 'pt'),
  }
}

export function resolveTestament(bookNumber: number): BibleTestament {
  return bookNumber <= 39 ? 'ot' : 'nt'
}

/** Tom visual do tile conforme faixas canônicas (Stitch). */
export function resolveBookTone(bookNumber: number): BibleBookTone {
  if (bookNumber <= 5) return 'law'
  if (bookNumber <= 17) return 'history'
  if (bookNumber <= 39) return 'prophets'
  if (bookNumber <= 43) return 'gospels'
  if (bookNumber <= 66) return 'letters'
  return 'neutral'
}

export function chapterRecordKey(
  versionId: number,
  bookId: number,
  chapter: number,
): string {
  return `bible_${versionId}_${bookId}_${chapter}`
}

export async function loadBibleBooks(): Promise<BibleBook[]> {
  const rows = await readOrFetchBibleCatalog<CatalogBibleBookRow[]>(booksFile())
  if (!rows || !Array.isArray(rows)) return []
  return rows.map(mapBook)
}

export async function loadBibleVersions(): Promise<BibleVersion[]> {
  const rows = await readOrFetchBibleCatalog<CatalogBibleVersionRow[]>(versionsFile())
  if (!rows || !Array.isArray(rows)) return []
  return rows.map(mapVersion)
}

export async function loadChapterVerses(
  versionId: number,
  bookId: number,
  chapter: number,
): Promise<BibleChapterVerses> {
  const key = chapterRecordKey(versionId, bookId, chapter)
  const verses = await readOrFetchCatalog<BibleChapterVerses>(key)
  if (!verses || typeof verses !== 'object') return {}
  return verses
}

/** Preferência padrão: ARA, senão a primeira versão. */
export function pickDefaultVersionId(
  versions: BibleVersion[],
  savedId: number | null,
): number | null {
  if (versions.length === 0) return null

  if (savedId != null && versions.some((version) => version.id === savedId)) {
    return savedId
  }

  const ara = versions.find(
    (version) =>
      version.abbreviation.toUpperCase() === 'ARA' ||
      version.name.toUpperCase() === 'ARA',
  )
  return ara?.id ?? versions[0].id
}
