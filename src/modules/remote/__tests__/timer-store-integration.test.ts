/**
 * Integration: handler v2 mexe no MESMO store pinia que o snapshot lê.
 * Reproduz o bug reportado: ack ok:true mas estado permanece idle.
 */
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { createModuleHandlers } from '../renderer/module-handlers'
import { useTimerStore } from '../../timer/stores/useTimerStore'

// electron bridge mock (getDesktopBridge etc.)
vi.mock('@shared/services/desktop-bridge', () => ({
  getDesktopBridge: () => null,
}))
vi.mock('@shared/services/projection-modules', () => ({
  openProjectionModule: vi.fn().mockResolvedValue(true),
  closeProjectionModule: vi.fn(),
  isProjectionModuleOpen: vi.fn(() => false),
}))

describe('timer handler → store real', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('start via handler muda o runtime que o snapshot lê', async () => {
    const store = useTimerStore()
    const h = createModuleHandlers({ timer: store as never })
    expect(h.snapshot('timer')).toMatchObject({ status: 'idle' })
    expect(await h.execute('timer', 'timer.start', {})).toBe(true)
    expect(h.snapshot('timer')).toMatchObject({ status: 'running' })
  })
})
