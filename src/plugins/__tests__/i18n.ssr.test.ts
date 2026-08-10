// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock user-preferences
vi.mock('@shared/services/user-preferences', () => ({
  getUserPreference: vi.fn(),
  setUserPreference: vi.fn(),
}))

import { getUserPreference } from '@shared/services/user-preferences'
import { detectInitialLocale, localeToApiPrefix } from '@plugins/i18n'

describe('detectInitialLocale (SSR/no-window)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('funciona sem window definido (retorna fallback pt-BR)', () => {
    vi.mocked(getUserPreference).mockReturnValue(null)
    expect(detectInitialLocale()).toBe('pt-BR')
  })

  it('retorna en quando preferencia existe mesmo sem window', () => {
    vi.mocked(getUserPreference).mockReturnValue('en')
    expect(detectInitialLocale()).toBe('en')
  })
})

describe('localeToApiPrefix (SSR)', () => {
  it('funciona sem window definido', () => {
    expect(localeToApiPrefix('es-AR')).toBe('es')
  })
})
