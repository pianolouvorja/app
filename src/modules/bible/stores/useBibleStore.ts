import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  closeProjectionModule,
  isProjectionModuleOpen,
  openProjectionModule,
} from '@shared/composables/useProjectionWindow'
import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'

import {
  loadBibleBooks,
  loadBibleVersions,
  loadChapterVerses,
  pickDefaultVersionId,
  resolveTestament,
} from '../services/bible-catalog'
import { publishBibleSelection } from '../services/bible-runtime'
import {
  buildProjectionText,
  emptySelection,
  formatScripturalReference,
  parseVerseQuery,
} from '../services/scripture-format'
import type {
  BibleBook,
  BibleChapterVerses,
  BibleSelection,
  BibleTestament,
  BibleVersion,
} from '../types/bible'

export const useBibleStore = defineStore('bible', () => {
  const books = ref<BibleBook[]>([])
  const versions = ref<BibleVersion[]>([])
  const verses = ref<BibleChapterVerses>({})

  const selectedVersionId = ref<number | null>(null)
  const selectedBookId = ref<number | null>(null)
  const selectedChapter = ref(1)
  const selectedVerses = ref<number[]>([])
  const lastVerseAnchor = ref(1)

  const testamentFilter = ref<BibleTestament>('ot')
  const showNavPanel = ref(true)
  const bookSearchQuery = ref('')
  const chapterSearchQuery = ref('')
  const verseSearchQuery = ref('')
  const globalSearchQuery = ref('')

  const isLoadingMeta = ref(false)
  const isLoadingVerses = ref(false)
  const lastErrorKey = ref<string | null>(null)
  const isProjecting = ref(false)

  const projection = ref<BibleSelection>(emptySelection())

  let projectionWatchTimer: ReturnType<typeof setInterval> | null = null

  function stopProjectionWatch() {
    if (!projectionWatchTimer) return
    clearInterval(projectionWatchTimer)
    projectionWatchTimer = null
  }

  function startProjectionWatch() {
    stopProjectionWatch()
    projectionWatchTimer = setInterval(() => {
      if (!isProjectionModuleOpen('bible')) {
        isProjecting.value = false
        stopProjectionWatch()
      }
    }, 400)
  }

  function publishProjectionState(selection: BibleSelection = projection.value) {
    publishBibleSelection(selection)
  }

  const selectedBook = computed(() =>
    books.value.find((book) => book.id === selectedBookId.value) ?? null,
  )

  const selectedVersion = computed(() =>
    versions.value.find((version) => version.id === selectedVersionId.value) ??
    null,
  )

  const filteredBooks = computed(() => {
    const query = bookSearchQuery.value.trim().toLowerCase()
    return books.value.filter((book) => {
      if (resolveTestament(book.bookNumber) !== testamentFilter.value) return false
      if (!query) return true
      return (
        book.name.toLowerCase().includes(query) ||
        book.abbreviation.toLowerCase().includes(query)
      )
    })
  })

  const chapterNumbers = computed(() => {
    const total = selectedBook.value?.chapters ?? 0
    const query = chapterSearchQuery.value.trim()
    const list = Array.from({ length: total }, (_, index) => index + 1)
    if (!query) return list
    return list.filter((chapter) => String(chapter).startsWith(query))
  })

  const locationLabel = computed(() => {
    if (!selectedBook.value) return ''
    return formatScripturalReference({
      bookName: selectedBook.value.name,
      chapter: selectedChapter.value,
      verses: selectedVerses.value,
    })
  })

  const chapterTitle = computed(() => {
    if (!selectedBook.value) return ''
    return `${selectedBook.value.name} ${selectedChapter.value}`
  })

  const verseEntries = computed(() => {
    const globalQuery = globalSearchQuery.value.trim().toLowerCase()
    const verseQuery = verseSearchQuery.value.trim().toLowerCase()

    function matchesQuery(
      entry: { number: number; text: string },
      query: string,
    ): boolean {
      if (!query) return true
      return (
        String(entry.number).includes(query) ||
        entry.text.toLowerCase().includes(query)
      )
    }

    return Object.keys(verses.value)
      .map(Number)
      .filter((num) => !Number.isNaN(num))
      .sort((a, b) => a - b)
      .map((number) => ({
        number,
        text: verses.value[String(number)] ?? '',
      }))
      .filter(
        (entry) => matchesQuery(entry, globalQuery) && matchesQuery(entry, verseQuery),
      )
  })

  function clearError() {
    lastErrorKey.value = null
  }

  function setError(key: string) {
    lastErrorKey.value = key
  }

  function syncProjection() {
    const book = selectedBook.value
    const version = selectedVersion.value
    if (!book || !version || selectedVerses.value.length === 0) {
      projection.value = emptySelection()
      if (isProjecting.value) publishProjectionState(projection.value)
      return
    }

    const selection: BibleSelection = {
      versionId: version.id,
      bookId: book.id,
      versionAbbreviation: version.abbreviation,
      bookName: book.name,
      chapter: selectedChapter.value,
      verses: [...selectedVerses.value],
      scripturalReference: formatScripturalReference({
        bookName: book.name,
        chapter: selectedChapter.value,
        verses: selectedVerses.value,
        versionAbbreviation: version.abbreviation,
      }),
      text: buildProjectionText(verses.value, selectedVerses.value),
    }

    projection.value = selection
    if (isProjecting.value) publishProjectionState(selection)
  }

  async function openProjection() {
    syncProjection()
    if (projection.value.verses.length === 0 || !projection.value.text) {
      return false
    }

    publishProjectionState(projection.value)
    const opened = await openProjectionModule('bible')
    isProjecting.value = opened
    if (opened) startProjectionWatch()
    else stopProjectionWatch()
    return opened
  }

  function clearProjectionWindow() {
    closeProjectionModule()
    isProjecting.value = false
    stopProjectionWatch()
    publishProjectionState(emptySelection())
  }

  async function toggleProjection() {
    if (isProjecting.value && isProjectionModuleOpen('bible')) {
      clearProjectionWindow()
      return false
    }
    return openProjection()
  }

  async function refreshChapter() {
    if (selectedVersionId.value == null || selectedBookId.value == null) {
      verses.value = {}
      return
    }

    isLoadingVerses.value = true
    try {
      verses.value = await loadChapterVerses(
        selectedVersionId.value,
        selectedBookId.value,
        selectedChapter.value,
      )
    } catch (error) {
      console.error('[bible] falha ao carregar capítulo', error)
      setError('bible.errors.loadChapterFailed')
      verses.value = {}
    } finally {
      isLoadingVerses.value = false
    }
  }

  async function bootstrap() {
    isLoadingMeta.value = true
    clearError()

    try {
      const [loadedBooks, loadedVersions] = await Promise.all([
        loadBibleBooks(),
        loadBibleVersions(),
      ])

      books.value = loadedBooks
      versions.value = loadedVersions

      if (loadedBooks.length === 0 || loadedVersions.length === 0) {
        setError('bible.errors.loadCatalogFailed')
        return
      }

      const saved = getUserPreference<number>(
        USER_PREFERENCE_KEYS.bibleSelectedVersion,
        null,
      )
      const versionId = pickDefaultVersionId(loadedVersions, saved)
      selectedVersionId.value = versionId

      const firstBook = loadedBooks[0]
      selectedBookId.value = firstBook.id
      testamentFilter.value = resolveTestament(firstBook.bookNumber)
      selectedChapter.value = 1
      selectedVerses.value = []
      lastVerseAnchor.value = 1

      isProjecting.value = isProjectionModuleOpen('bible')
      if (isProjecting.value) startProjectionWatch()

      await refreshChapter()
    } catch (error) {
      console.error('[bible] falha ao iniciar módulo', error)
      setError('bible.errors.loadCatalogFailed')
      books.value = []
      versions.value = []
    } finally {
      isLoadingMeta.value = false
    }
  }

  async function selectVersion(versionId: number) {
    if (selectedVersionId.value === versionId) return
    selectedVersionId.value = versionId
    setUserPreference(USER_PREFERENCE_KEYS.bibleSelectedVersion, versionId)
    selectedVerses.value = []
    lastVerseAnchor.value = 1
    syncProjection()
    await refreshChapter()
  }

  async function selectBook(bookId: number) {
    const book = books.value.find((item) => item.id === bookId)
    if (!book) return

    selectedBookId.value = bookId
    testamentFilter.value = resolveTestament(book.bookNumber)
    selectedVerses.value = []
    lastVerseAnchor.value = 1

    if (selectedChapter.value > book.chapters) {
      selectedChapter.value = book.chapters
    } else if (selectedChapter.value < 1) {
      selectedChapter.value = 1
    }

    syncProjection()
    await refreshChapter()
  }

  async function selectChapter(chapter: number) {
    if (chapter < 1) return
    const max = selectedBook.value?.chapters ?? chapter
    const next = Math.min(chapter, max)
    if (selectedChapter.value === next) return

    selectedChapter.value = next
    selectedVerses.value = []
    lastVerseAnchor.value = 1
    syncProjection()
    await refreshChapter()
  }

  function selectVerse(verseNumber: number, event?: MouseEvent) {
    if (!verses.value[String(verseNumber)]) return

    if (event?.ctrlKey || event?.metaKey) {
      const index = selectedVerses.value.indexOf(verseNumber)
      if (index === -1) {
        selectedVerses.value = [...selectedVerses.value, verseNumber].sort(
          (a, b) => a - b,
        )
      } else {
        selectedVerses.value = selectedVerses.value.filter(
          (verse) => verse !== verseNumber,
        )
      }
    } else if (event?.shiftKey) {
      const start = Math.min(verseNumber, lastVerseAnchor.value)
      const end = Math.max(verseNumber, lastVerseAnchor.value)
      const range: number[] = []
      for (let i = start; i <= end; i += 1) {
        if (verses.value[String(i)]) range.push(i)
      }
      selectedVerses.value = range
    } else {
      selectedVerses.value = [verseNumber]
    }

    lastVerseAnchor.value = verseNumber
    syncProjection()
  }

  function applyVerseSearch() {
    const parsed = parseVerseQuery(verseSearchQuery.value, verses.value)
    if (parsed.length === 0) return

    selectedVerses.value = parsed
    lastVerseAnchor.value = parsed[parsed.length - 1]
    verseSearchQuery.value = ''
    syncProjection()
  }

  function clearSelection() {
    selectedVerses.value = []
    syncProjection()
  }

  function setTestamentFilter(testament: BibleTestament) {
    testamentFilter.value = testament
  }

  function toggleNavPanel() {
    showNavPanel.value = !showNavPanel.value
  }

  async function goToAdjacentVerse(direction: -1 | 1) {
    if (selectedVerses.value.length === 0) return

    const current =
      direction < 0
        ? Math.min(...selectedVerses.value)
        : Math.max(...selectedVerses.value)
    const next = current + direction

    if (verses.value[String(next)]) {
      selectVerse(next)
      return
    }

    const book = selectedBook.value
    if (!book) return

    if (direction > 0) {
      if (selectedChapter.value < book.chapters) {
        await selectChapter(selectedChapter.value + 1)
        const first = Math.min(
          ...Object.keys(verses.value).map(Number).filter((n) => !Number.isNaN(n)),
        )
        if (Number.isFinite(first)) selectVerse(first)
        return
      }

      const index = books.value.findIndex((item) => item.id === book.id)
      const nextBook = books.value[index + 1] ?? books.value[0]
      if (!nextBook) return
      await selectBook(nextBook.id)
      await selectChapter(1)
      const first = Math.min(
        ...Object.keys(verses.value).map(Number).filter((n) => !Number.isNaN(n)),
      )
      if (Number.isFinite(first)) selectVerse(first)
      return
    }

    if (selectedChapter.value > 1) {
      await selectChapter(selectedChapter.value - 1)
      const last = Math.max(
        ...Object.keys(verses.value).map(Number).filter((n) => !Number.isNaN(n)),
      )
      if (Number.isFinite(last)) selectVerse(last)
      return
    }

    const index = books.value.findIndex((item) => item.id === book.id)
    const prevBook =
      index > 0 ? books.value[index - 1] : books.value[books.value.length - 1]
    if (!prevBook) return
    await selectBook(prevBook.id)
    await selectChapter(prevBook.chapters)
    const last = Math.max(
      ...Object.keys(verses.value).map(Number).filter((n) => !Number.isNaN(n)),
    )
    if (Number.isFinite(last)) selectVerse(last)
  }

  return {
    books,
    versions,
    verses,
    selectedVersionId,
    selectedBookId,
    selectedChapter,
    selectedVerses,
    testamentFilter,
    showNavPanel,
    bookSearchQuery,
    chapterSearchQuery,
    verseSearchQuery,
    globalSearchQuery,
    isLoadingMeta,
    isLoadingVerses,
    lastErrorKey,
    isProjecting,
    projection,
    selectedBook,
    selectedVersion,
    filteredBooks,
    chapterNumbers,
    locationLabel,
    chapterTitle,
    verseEntries,
    clearError,
    bootstrap,
    selectVersion,
    selectBook,
    selectChapter,
    selectVerse,
    applyVerseSearch,
    clearSelection,
    setTestamentFilter,
    toggleNavPanel,
    goToAdjacentVerse,
    syncProjection,
    openProjection,
    toggleProjection,
    clearProjectionWindow,
  }
})
