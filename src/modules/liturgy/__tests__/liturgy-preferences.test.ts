import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  loadLiturgyState,
  normalizeLiturgyState,
  saveLiturgyState,
  todayWeekday,
} from '../services/liturgy-preferences'
import { LITURGY_WEEKDAYS } from '../types/liturgy'

// browser-storage mockado (ambiente node, sem localStorage) — mesmo padrão do scheduled-store.test
const localStore: Record<string, unknown> = {}
const sessionStore: Record<string, unknown> = {}

vi.mock('@shared/services/browser-storage', () => ({
  getBrowserItem: <T,>(key: string, fallback: T | null, kind: 'local' | 'session' = 'local') => {
    const store = kind === 'session' ? sessionStore : localStore
    return (key in store ? store[key] : fallback) as T | null
  },
  setBrowserItem: (key: string, value: unknown, kind: 'local' | 'session' = 'local') => {
    ;(kind === 'session' ? sessionStore : localStore)[key] = value
  },
}))

const prefs: Record<string, unknown> = {}
vi.mock('@shared/services/user-preferences', () => ({
  getUserPreference: (key: string, fallback: unknown = null) => (key in prefs ? prefs[key] : fallback),
  setUserPreference: (key: string, value: unknown) => {
    prefs[key] = value
  },
}))

import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'

const KEY = USER_PREFERENCE_KEYS.liturgyState
const CHECKS_KEY = 'liturgy_checks_cleared'

function seedState(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    weekdays: {
      sunday: [
        {
          id: 'i1',
          type: 'music',
          name: 'Hino 1',
          done: true,
          durationMs: 90_000,
          musicId: '42',
          musicMode: 'instrumental',
        },
        { type: 'category', name: 'Abertura', startTime: '9:05', endTime: '10:00:00' },
        { type: 'annotation', name: 'Nota', filePaths: [' /a.mp3 ', '', 7] },
        { type: 'prayer', name: 'Oração', filePath: '/v.mp4', verseBookId: '2', verseChapter: 3, verseNumbers: '1,2' },
        { type: 'weird-type', name: 'inválido' },
        { type: 'music', name: '   ' },
        null,
        42,
      ],
    },
    dayNotes: { monday: 42, tuesday: 'nota terça' },
    daySessionTimes: { sunday: { startTime: '07:00', endTime: null } },
    customLiturgies: [
      { name: 'Casamento', items: [{ type: 'prayer', name: 'Oração', done: true }], startTime: '18:00', endTime: '20:00' },
      { name: '  ' },
      'nope',
      null,
    ],
    deletionLocks: { a: true, b: false, '': true, c: 'true' },
    ...extra,
  }
}

describe('liturgy-preferences', () => {
  beforeEach(() => {
    for (const k of Object.keys(localStore)) delete localStore[k]
    for (const k of Object.keys(sessionStore)) delete sessionStore[k]
    for (const k of Object.keys(prefs)) delete prefs[k]
  })

  describe('normalizeLiturgyState', () => {
    it('retorna estado vazio para null/nao-objeto', () => {
      for (const raw of [null, undefined, 42, 'x', []]) {
        const state = normalizeLiturgyState(raw)
        for (const day of LITURGY_WEEKDAYS) expect(state.weekdays[day]).toEqual([])
        expect(Object.values(state.dayNotes)).toHaveLength(LITURGY_WEEKDAYS.length)
        expect(Object.keys(state.daySessionTimes)).toHaveLength(LITURGY_WEEKDAYS.length)
        expect(state.customLiturgies).toEqual([])
        expect(state.deletionLocks).toEqual({})
      }
    })

    it('normaliza item completo: music com durationMs stringificada', () => {
      const state = normalizeLiturgyState({ weekdays: { sunday: [{ type: 'music', name: 'X', durationMs: '120500' }] } })
      const item = state.weekdays.sunday[0]!
      expect(item.durationMs).toBe(121_000)
      expect(item.musicId).toBeNull()
      expect(item.musicMode).toBe('audio')
    })

    it('music: durationMs invalida/negativa cai em 0; id gerado quando ausente', () => {
      const [a, b] = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'A', durationMs: -5 }, { type: 'music', name: 'B', durationMs: 'abc' }] },
      }).weekdays.sunday
      expect(a!.durationMs).toBe(0)
      expect(b!.durationMs).toBe(0)
      expect(b!.id).toBeTruthy()
    })

    it('category: durationMs sempre 0, startTime/endTime normalizados (com segundos), demais campos', () => {
      const state = normalizeLiturgyState(seedState())
      const [music, category, annotation, prayer, ...rest] = state.weekdays.sunday!
      expect(music!.durationMs).toBe(90_000)
      expect(music!.musicId).toBe(42)
      expect(music!.musicMode).toBe('instrumental')
      expect(music!.done).toBe(true)
      expect(music!.accentColor).toBeTruthy()
      expect(category!.durationMs).toBe(0)
      expect(category!.categoryId).toBeNull()
      expect(category!.startTime).toBe('09:05')
      expect(category!.endTime).toBe('10:00')
      // filePaths: filtra vazios e não-string; fallback de filePath único
      expect(annotation!.filePaths).toEqual(['/a.mp3'])
      expect(prayer!.filePaths).toEqual(['/v.mp4'])
      expect(prayer!.verseBookId).toBe(2)
      expect(prayer!.verseChapter).toBe(3)
      expect(rest.filter((i) => i != null)).toHaveLength(0)
    })

    it('complementaryTitle e notes com trim viram undefined quando vazios', () => {
      const item = normalizeLiturgyState({ weekdays: { sunday: [{ type: 'prayer', name: 'P', complementaryTitle: '  ', notes: '  ' }] } }).weekdays.sunday[0]!
      expect(item.complementaryTitle).toBeUndefined()
      expect(item.notes).toBeUndefined()
    })

    it('weekdays aceita alias liturgies e ignora não-objeto', () => {
      const state = normalizeLiturgyState({ liturgies: { sunday: [{ type: 'prayer', name: 'P' }] } })
      expect(state.weekdays.sunday).toHaveLength(1)
      expect(normalizeLiturgyState({ weekdays: 'nope' }).weekdays.sunday).toEqual([])
    })

    it('dayNotes coage não-string para ""', () => {
      const state = normalizeLiturgyState(seedState())
      expect(state.dayNotes.monday).toBe('')
      expect(state.dayNotes.tuesday).toBe('nota terça')
    })

    it('daySessionTimes ignora não-objeto e normaliza horários', () => {
      expect(normalizeLiturgyState({ daySessionTimes: 'x' }).daySessionTimes.sunday).toEqual({ startTime: null, endTime: null })
      const st = normalizeLiturgyState(seedState()).daySessionTimes.sunday
      expect(st).toEqual({ startTime: '07:00', endTime: null })
    })

    it('customLiturgies: descarta sem nome/não-objeto, id gerado, items normalizados', () => {
      const state = normalizeLiturgyState(seedState())
      expect(state.customLiturgies).toHaveLength(1)
      const custom = state.customLiturgies[0]!
      expect(custom.name).toBe('Casamento')
      expect(custom.id).toBeTruthy()
      expect(custom.items).toHaveLength(1)
      expect(custom.startTime).toBe('18:00')
      expect(custom.endTime).toBe('20:00')
      expect(normalizeLiturgyState({ customLiturgies: 'x' }).customLiturgies).toEqual([])
    })

    it('deletionLocks: só chave truthy com valor === true', () => {
      const locks = normalizeLiturgyState(seedState()).deletionLocks
      expect(locks).toEqual({ a: true })
    })
  })

  describe('save/load', () => {
    it('save persiste e load devolve o mesmo estado', () => {
      const state = normalizeLiturgyState(seedState())
      saveLiturgyState(state)
      expect(prefs[KEY]).toBeDefined()
      const loaded = loadLiturgyState()
      expect(loaded.weekdays.sunday).toHaveLength(4)
    })

    it('load limpa done flags na 1ª leitura da sessão e marca CHECKS_CLEARED', () => {
      saveLiturgyState(normalizeLiturgyState(seedState()))
      delete sessionStore[CHECKS_KEY]
      const loaded = loadLiturgyState()
      expect(loaded.weekdays.sunday!.every((i) => !i.done)).toBe(true)
      expect(loaded.customLiturgies.every((c) => c.items.every((i) => !i.done))).toBe(true)
      expect(sessionStore[CHECKS_KEY]).toBe(true)
    })

    it('load com flag de sessão ativa preserva done flags', () => {
      saveLiturgyState(normalizeLiturgyState(seedState()))
      sessionStore[CHECKS_KEY] = true
      const loaded = loadLiturgyState()
      expect(loaded.weekdays.sunday!.some((i) => i.done)).toBe(true)
    })

    it('load sem nada persistido retorna estado vazio e grava flag', () => {
      const loaded = loadLiturgyState()
      expect(loaded.weekdays.sunday).toEqual([])
      expect(sessionStore[CHECKS_KEY]).toBe(true)
    })
  })

  describe('todayWeekday', () => {
    it('retorna um dia válido da semana', () => {
      expect(LITURGY_WEEKDAYS).toContain(todayWeekday())
    })

    it('usa fallback sunday quando getDay() retorna índice inválido', () => {
      const RealDate = Date
      class FakeDate extends RealDate {
        getDay(): number {
          return 99 as unknown as number
        }
      }
      vi.stubGlobal('Date', FakeDate)
      try {
        expect(todayWeekday()).toBe('sunday')
      } finally {
        vi.unstubAllGlobals()
        void RealDate
      }
    })
  })
})
