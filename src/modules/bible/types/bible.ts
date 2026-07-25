/** Livro bíblico (registro do catálogo). */
export interface BibleBook {
  id: number
  name: string
  abbreviation: string
  chapters: number
  bookNumber: number
  languageId: string
}

/** Versão/tradução disponível. */
export interface BibleVersion {
  id: number
  abbreviation: string
  name: string
  languageId: string
}

/** Versículos de um capítulo: número → texto. */
export type BibleChapterVerses = Record<string, string>

export type BibleTestament = 'ot' | 'nt'

/** Tom visual do tile do livro (Stitch). */
export type BibleBookTone =
  | 'law'
  | 'history'
  | 'prophets'
  | 'gospels'
  | 'letters'
  | 'neutral'

/** Seleção ativa para leitura e projeção. */
export interface BibleSelection {
  versionId: number | null
  bookId: number | null
  versionAbbreviation: string
  bookName: string
  chapter: number
  verses: number[]
  scripturalReference: string
  text: string
}

/** Payload bruto do workspace (`pt_bible_book`). */
export interface CatalogBibleBookRow {
  id_bible_book: number
  name: string
  abbreviation: string
  chapters: number
  book_number: number
  id_language: string
}

/** Payload bruto do workspace (`pt_bible_version`). */
export interface CatalogBibleVersionRow {
  id_bible_version: number
  abbreviation: string
  name: string
  id_language: string
}
