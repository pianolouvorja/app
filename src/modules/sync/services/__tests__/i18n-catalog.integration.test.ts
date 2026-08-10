// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Teste de integracao: valida o fluxo completo de
 * deteccao de idioma -> prefixo da API -> chamada de catalogo.
 *
 * Cobre a ponte entre i18n.ts (localeToApiPrefix) e
 * library-catalog.ts (loadLibraryCategories).
 */

// Mock workspace-api
vi.mock('@shared/services/workspace-api', () => ({
  readCatalogRecord: vi.fn(),
  writeCatalogRecord: vi.fn(),
  resolveDatabaseUrl: vi.fn(() => 'https://api.test'),
}))

// Mock desktop-bridge
vi.mock('@shared/services/desktop-bridge', () => ({
  getDesktopBridge: vi.fn(() => null),
  isDesktopApp: vi.fn(() => false),
}))

// Mock media-paths
vi.mock('../media-paths', () => ({
  resolveRemoteFileUrl: vi.fn((url: string) => `https://api.test/${url}`),
  toRelativeMediaPath: vi.fn((url: string) => url),
}))

// Mock @plugins/i18n para evitar side-effects
vi.mock('@plugins/i18n', () => ({
  localeToApiPrefix: (locale: string) => {
    const prefix = locale.slice(0, 2).toLowerCase()
    if (prefix === 'en' || prefix === 'es') return prefix
    return 'pt'
  },
  default: {},
}))

import { readCatalogRecord } from '@shared/services/workspace-api'
import { loadLibraryCategories, getCurrentApiPrefix } from '../library-catalog'
import { localeToApiPrefix } from '@plugins/i18n'

describe('Integracao: i18n -> API catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('fluxo pt-BR: detecta pt -> busca pt_hymnal, pt_categories', async () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'pt-BR' }))

    const prefix = getCurrentApiPrefix()
    expect(prefix).toBe('pt')

    vi.mocked(readCatalogRecord).mockResolvedValue([])
    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('pt_hymnal')
    expect(calls).toContain('pt_categories')
  })

  it('fluxo en: detecta en -> busca en_hymnal, en_categories', async () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'en' }))

    const prefix = getCurrentApiPrefix()
    expect(prefix).toBe('en')

    vi.mocked(readCatalogRecord).mockResolvedValue([])
    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('en_hymnal')
    expect(calls).toContain('en_categories')
  })

  it('fluxo es: detecta es -> busca es_hymnal, es_categories', async () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'es' }))

    const prefix = getCurrentApiPrefix()
    expect(prefix).toBe('es')

    vi.mocked(readCatalogRecord).mockResolvedValue([])
    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('es_hymnal')
    expect(calls).toContain('es_categories')
  })

  it('fluxo fallback: sem language no localStorage -> busca pt_*', async () => {
    const prefix = getCurrentApiPrefix()
    expect(prefix).toBe('pt')

    vi.mocked(readCatalogRecord).mockResolvedValue([])
    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('pt_hymnal')
    expect(calls).toContain('pt_categories')
    expect(calls).not.toContain('en_hymnal')
    expect(calls).not.toContain('es_hymnal')
  })

  it('localeToApiPrefix + getCurrentApiPrefix sao consistentes', () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'en-US' }))

    const directPrefix = localeToApiPrefix('en-US')
    const catalogPrefix = getCurrentApiPrefix()

    expect(directPrefix).toBe('en')
    expect(catalogPrefix).toBe('en')
    expect(directPrefix).toBe(catalogPrefix)
  })

  it('troca de idioma reflete imediatamente no catalogo', async () => {
    // Primeiro com pt
    localStorage.setItem('user_data', JSON.stringify({ language: 'pt-BR' }))
    vi.mocked(readCatalogRecord).mockResolvedValue([])
    await loadLibraryCategories()
    let calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('pt_hymnal')

    // Troca para es
    vi.mocked(readCatalogRecord).mockClear()
    localStorage.setItem('user_data', JSON.stringify({ language: 'es' }))
    await loadLibraryCategories()
    calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('es_hymnal')
    expect(calls).not.toContain('pt_hymnal')
  })
})
