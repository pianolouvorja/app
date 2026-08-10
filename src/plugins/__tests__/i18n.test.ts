// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock user-preferences BEFORE importing i18n
vi.mock('@shared/services/user-preferences', () => ({
  getUserPreference: vi.fn(),
  setUserPreference: vi.fn(),
}))

import { getUserPreference } from '@shared/services/user-preferences'
import {
  detectInitialLocale,
  localeToApiPrefix,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from '@plugins/i18n'

describe('SUPPORTED_LOCALES', () => {
  it('contem pt-BR, en e es', () => {
    expect(SUPPORTED_LOCALES).toEqual(['pt-BR', 'en', 'es'])
  })
})

describe('DEFAULT_LOCALE', () => {
  it('e pt-BR', () => {
    expect(DEFAULT_LOCALE).toBe('pt-BR')
  })
})

describe('detectInitialLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna pt-BR quando nao ha preferencia salva (null)', () => {
    vi.mocked(getUserPreference).mockReturnValue(null)
    expect(detectInitialLocale()).toBe('pt-BR')
  })

  it('retorna en quando preferencia salva e "en"', () => {
    vi.mocked(getUserPreference).mockReturnValue('en')
    expect(detectInitialLocale()).toBe('en')
  })

  it('retorna es quando preferencia salva e "es"', () => {
    vi.mocked(getUserPreference).mockReturnValue('es')
    expect(detectInitialLocale()).toBe('es')
  })

  it('retorna pt-BR quando preferencia salva e "pt-BR"', () => {
    vi.mocked(getUserPreference).mockReturnValue('pt-BR')
    expect(detectInitialLocale()).toBe('pt-BR')
  })

  it('retorna pt-BR (fallback) quando preferencia e idioma nao suportado', () => {
    vi.mocked(getUserPreference).mockReturnValue('fr-FR')
    expect(detectInitialLocale()).toBe('pt-BR')
  })

  it('retorna pt-BR (fallback) quando preferencia e string vazia', () => {
    vi.mocked(getUserPreference).mockReturnValue('')
    expect(detectInitialLocale()).toBe('pt-BR')
  })
})

describe('localeToApiPrefix', () => {
  it('converte pt-BR -> pt', () => {
    expect(localeToApiPrefix('pt-BR')).toBe('pt')
  })

  it('converte en -> en', () => {
    expect(localeToApiPrefix('en')).toBe('en')
  })

  it('converte en-US -> en', () => {
    expect(localeToApiPrefix('en-US')).toBe('en')
  })

  it('converte es -> es', () => {
    expect(localeToApiPrefix('es')).toBe('es')
  })

  it('converte es-ES -> es', () => {
    expect(localeToApiPrefix('es-ES')).toBe('es')
  })

  it('converte pt-PT -> pt', () => {
    expect(localeToApiPrefix('pt-PT')).toBe('pt')
  })

  it('retorna pt para idioma nao suportado (fr-FR)', () => {
    expect(localeToApiPrefix('fr-FR')).toBe('pt')
  })

  it('retorna pt para string vazia', () => {
    expect(localeToApiPrefix('')).toBe('pt')
  })

  it('e case-insensitive (PT-BR -> pt)', () => {
    expect(localeToApiPrefix('PT-BR')).toBe('pt')
  })

  it('e case-insensitive (EN -> en)', () => {
    expect(localeToApiPrefix('EN')).toBe('en')
  })
})
