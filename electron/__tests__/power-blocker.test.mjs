import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock electron powerSaveBlocker — stateful (reflete o estado real)
const { mockStart, mockStop, mockIsStarted, _resetMockState } = vi.hoisted(() => {
  let activeId = null
  return {
    mockStart: vi.fn(() => { activeId = 1; return 1 }),
    mockStop: vi.fn(() => { activeId = null; return true }),
    mockIsStarted: vi.fn((id) => id !== null && id === activeId),
    _resetMockState: () => { activeId = null },
  }
})

vi.mock('electron', () => ({
  powerSaveBlocker: {
    start: mockStart,
    stop: mockStop,
    isStarted: mockIsStarted,
  },
}))

import { enablePowerBlocker, disablePowerBlocker, isPowerBlockerActive, _resetPowerBlocker } from '../power-blocker.mjs'

describe('power-blocker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetMockState()
    _resetPowerBlocker()
  })

  describe('enablePowerBlocker', () => {
    it('chama powerSaveBlocker.start com prevent-display-sleep', () => {
      enablePowerBlocker()
      expect(mockStart).toHaveBeenCalledWith('prevent-display-sleep')
    })

    it('não chama start se já estiver ativo', () => {
      enablePowerBlocker()
      enablePowerBlocker()
      expect(mockStart).toHaveBeenCalledTimes(1)
    })

    it('retorna true quando ativado com sucesso', () => {
      expect(enablePowerBlocker()).toBe(true)
    })
  })

  describe('disablePowerBlocker', () => {
    it('chama powerSaveBlocker.stop quando ativo', () => {
      enablePowerBlocker()
      disablePowerBlocker()
      expect(mockStop).toHaveBeenCalledWith(1)
    })

    it('não chama stop se não estiver ativo', () => {
      disablePowerBlocker()
      expect(mockStop).not.toHaveBeenCalled()
    })
  })

  describe('isPowerBlockerActive', () => {
    it('retorna false antes de habilitar', () => {
      expect(isPowerBlockerActive()).toBe(false)
    })

    it('retorna true depois de habilitar', () => {
      enablePowerBlocker()
      expect(isPowerBlockerActive()).toBe(true)
    })

    it('retorna false depois de desabilitar', () => {
      enablePowerBlocker()
      disablePowerBlocker()
      expect(isPowerBlockerActive()).toBe(false)
    })
  })
})
