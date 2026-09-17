import { describe, expect, it, vi } from 'vitest'

import { normalizeLiturgyState, saveLiturgyState } from '../services/liturgy-preferences'

vi.mock('@shared/services/user-preferences', () => ({
  getUserPreference: vi.fn(),
  setUserPreference: vi.fn(),
}))

vi.mock('@shared/services/browser-storage', () => ({
  getBrowserItem: vi.fn(),
  setBrowserItem: vi.fn(),
}))

vi.mock('@shared/constants/storage-keys', () => ({
  USER_PREFERENCE_KEYS: {
    LITURGY_STATE: 'liturgy_state',
    LITURGY_CHECKS_CLEARED: 'liturgy_checks_cleared',
  },
}))

describe('liturgy-preferences - mutation kill', () => {
  describe('normalizeLiturgyState', () => {
    it('returns empty state for null/undefined', () => {
      const result = normalizeLiturgyState(null)
      expect(result.weekdays.sunday).toEqual([])
      expect(result.dayNotes.sunday).toBe('')
      expect(result.customLiturgies).toEqual([])
      expect(result.deletionLocks).toEqual({})
    })

    it('returns empty state for non-object', () => {
      const result = normalizeLiturgyState('string')
      expect(result.weekdays.sunday).toEqual([])
    })

    it('normalizes weekdays', () => {
      const result = normalizeLiturgyState({
        weekdays: {
          sunday: [{ type: 'music', name: 'Dom' }],
          monday: [{ type: 'annotation', name: 'Seg' }],
          invalidDay: [{ type: 'music', name: 'Ignored' }],
        },
      })
      expect(result.weekdays.sunday).toHaveLength(1)
      expect(result.weekdays.sunday[0]!.name).toBe('Dom')
      expect(result.weekdays.monday).toHaveLength(1)
      expect(result.weekdays.tuesday).toEqual([])
    })

    it('normalizes dayNotes with string values', () => {
      const result = normalizeLiturgyState({
        dayNotes: { sunday: 'Nota', monday: '123', tuesday: '' },
      })
      expect(result.dayNotes.sunday).toBe('Nota')
      expect(result.dayNotes.monday).toBe('123')
      expect(result.dayNotes.tuesday).toBe('')
    })

    it('normalizes daySessionTimes', () => {
      const result = normalizeLiturgyState({
        daySessionTimes: {
          sunday: { startTime: '08:00', endTime: '12:00' },
          monday: { startTime: '09:00' },
        },
      })
      expect(result.daySessionTimes.sunday.startTime).toBe('08:00')
      expect(result.daySessionTimes.sunday.endTime).toBe('12:00')
      expect(result.daySessionTimes.monday.startTime).toBe('09:00')
      expect(result.daySessionTimes.monday.endTime).toBeNull()
    })

    it('normalizes customLiturgies', () => {
      const result = normalizeLiturgyState({
        customLiturgies: [
          { name: 'Valid', items: [{ type: 'music', name: 'M' }] },
          null,
          { name: '' },
          { name: 'Also Valid', startTime: '10:00', endTime: '11:00' },
        ],
      })
      expect(result.customLiturgies).toHaveLength(2)
      expect(result.customLiturgies[0]!.name).toBe('Valid')
      expect(result.customLiturgies[1]!.name).toBe('Also Valid')
      expect(result.customLiturgies[1]!.startTime).toBe('10:00')
    })

    it('normalizes deletionLocks', () => {
      const result = normalizeLiturgyState({
        deletionLocks: {
          key1: true,
          key2: false,
          key3: 'true',
          '': true,
          key4: true,
        },
      })
      expect(result.deletionLocks).toEqual({ key1: true, key4: true })
    })

    it('normalizes full state', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M' }] },
        dayNotes: { sunday: 'Nota' },
        daySessionTimes: { sunday: { startTime: '09:00' } },
        customLiturgies: [{ name: 'Custom', items: [] }],
        deletionLocks: { lock1: true },
      })
      expect(result.weekdays.sunday).toHaveLength(1)
      expect(result.dayNotes.sunday).toBe('Nota')
      expect(result.daySessionTimes.sunday.startTime).toBe('09:00')
      expect(result.customLiturgies).toHaveLength(1)
      expect(result.deletionLocks).toEqual({ lock1: true })
    })

    it('trims item name', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: '  Música  ' }] },
      })
      expect(result.weekdays.sunday[0]!.name).toBe('Música')
    })

    it('does NOT trim item subtitle (current behavior)', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', subtitle: '  Sub  ' }] },
      })
      expect(result.weekdays.sunday[0]!.subtitle).toBe('  Sub  ')
    })

    it('sets category durationMs to 0', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'category', name: 'Cat' }] },
      })
      expect(result.weekdays.sunday[0]!.durationMs).toBe(0)
    })

    it('sets music durationMs to 0 when not provided', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M' }] },
      })
      expect(result.weekdays.sunday[0]!.durationMs).toBe(0)
    })

    it('clamps music durationMs when provided', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', durationMs: 180000 }] },
      })
      expect(result.weekdays.sunday[0]!.durationMs).toBe(180000)
    })

    it('sets annotation durationMs to 0 (DEFAULT_MOMENT_DURATION_MS = 0)', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'annotation', name: 'A' }] },
      })
      expect(result.weekdays.sunday[0]!.durationMs).toBe(0)
    })

    it('clamps video/file durationMs', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'video', name: 'V', durationMs: 5000 }] },
      })
      expect(result.weekdays.sunday[0]!.durationMs).toBe(5000)
    })

    it('sets categoryId for non-category', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', categoryId: 'cat-1' }] },
      })
      expect(result.weekdays.sunday[0]!.categoryId).toBe('cat-1')
    })

    it('ignores categoryId for category (set to null)', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'category', name: 'C', categoryId: 'ignored' }] },
      })
      expect(result.weekdays.sunday[0]!.categoryId).toBeNull()
    })

    it('filters filePaths array', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', filePaths: ['/a.mp3', '', '  ', '/b.mp3'] }] },
      })
      expect(result.weekdays.sunday[0]!.filePaths).toEqual(['/a.mp3', '/b.mp3'])
    })

    it('falls back to filePath when filePaths not array', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', filePath: '/single.mp3' }] },
      })
      expect(result.weekdays.sunday[0]!.filePaths).toEqual(['/single.mp3'])
    })

    it('handles musicMode instrumental', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', musicMode: 'instrumental' }] },
      })
      expect(result.weekdays.sunday[0]!.musicMode).toBe('instrumental')
    })

    it('defaults musicMode to audio', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M' }] },
      })
      expect(result.weekdays.sunday[0]!.musicMode).toBe('audio')
    })

    it('handles verse fields', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', verseBookId: 1, verseChapter: 2, verseNumbers: '3-5' }] },
      })
      expect(result.weekdays.sunday[0]!.verseBookId).toBe(1)
      expect(result.weekdays.sunday[0]!.verseChapter).toBe(2)
      expect(result.weekdays.sunday[0]!.verseNumbers).toBe('3-5')
    })

    it('sets category startTime/endTime', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'category', name: 'C', startTime: '09:00', endTime: '10:00' }] },
      })
      expect(result.weekdays.sunday[0]!.startTime).toBe('09:00')
      expect(result.weekdays.sunday[0]!.endTime).toBe('10:00')
    })

    it('sets music startTime/endTime to null', () => {
      const result = normalizeLiturgyState({
        weekdays: { sunday: [{ type: 'music', name: 'M', startTime: '09:00', endTime: '10:00' }] },
      })
      expect(result.weekdays.sunday[0]!.startTime).toBeNull()
      expect(result.weekdays.sunday[0]!.endTime).toBeNull()
    })
  })

  describe('saveLiturgyState', () => {
    it('saves state to user preferences', async () => {
      const { setUserPreference } = await import('@shared/services/user-preferences')
      vi.mocked(setUserPreference).mockResolvedValue(undefined)

      await saveLiturgyState({ weekdays: {}, dayNotes: {}, daySessionTimes: {}, customLiturgies: [], deletionLocks: {} })
      expect(vi.mocked(setUserPreference)).toHaveBeenCalled()
    })
  })
})