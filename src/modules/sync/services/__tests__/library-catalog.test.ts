// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Mock @plugins/i18n para evitar side-effects do createI18n nos testes
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

describe('getCurrentApiPrefix', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('retorna pt quando user_data tem language pt-BR', () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'pt-BR' }))
    expect(getCurrentApiPrefix()).toBe('pt')
  })

  it('retorna en quando user_data tem language en', () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'en' }))
    expect(getCurrentApiPrefix()).toBe('en')
  })

  it('retorna es quando user_data tem language es', () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'es' }))
    expect(getCurrentApiPrefix()).toBe('es')
  })

  it('retorna pt quando user_data nao tem language', () => {
    localStorage.setItem('user_data', JSON.stringify({ theme: 'dark' }))
    expect(getCurrentApiPrefix()).toBe('pt')
  })

  it('retorna pt quando user_data nao existe', () => {
    expect(getCurrentApiPrefix()).toBe('pt')
  })

  it('aceita customLocale override', () => {
    expect(getCurrentApiPrefix('en-US')).toBe('en')
  })

  it('aceita customLocale override es', () => {
    expect(getCurrentApiPrefix('es-AR')).toBe('es')
  })
})

describe('loadLibraryCategories - filtragem por idioma', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('busca pt_hymnal e pt_categories quando idioma e pt-BR', async () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'pt-BR' }))
    vi.mocked(readCatalogRecord).mockResolvedValue([])

    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('pt_hymnal')
    expect(calls).toContain('pt_hymnal_1996')
    expect(calls).toContain('pt_categories')
  })

  it('busca en_hymnal e en_categories quando idioma e en', async () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'en' }))
    vi.mocked(readCatalogRecord).mockResolvedValue([])

    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('en_hymnal')
    expect(calls).toContain('en_hymnal_1996')
    expect(calls).toContain('en_categories')
  })

  it('busca es_hymnal e es_categories quando idioma e es', async () => {
    localStorage.setItem('user_data', JSON.stringify({ language: 'es' }))
    vi.mocked(readCatalogRecord).mockResolvedValue([])

    await loadLibraryCategories()

    const calls = vi.mocked(readCatalogRecord).mock.calls.map((c) => c[0])
    expect(calls).toContain('es_hymnal')
    expect(calls).toContain('es_hymnal_1996')
    expect(calls).toContain('es_categories')
  })

  it('retorna lista vazia quando nenhum hymnal nem categoria existem', async () => {
    vi.mocked(readCatalogRecord).mockResolvedValue(null)

    const result = await loadLibraryCategories()
    expect(result).toEqual([])
  })

  it('monta categoria de hinarios quando pt_hymnal tem dados', async () => {
    const mockHymnal = [{ id: 1, title: 'Hino 1' }]
    vi.mocked(readCatalogRecord).mockImplementation(async (key: string) => {
      if (key === 'pt_hymnal') return mockHymnal
      if (key === 'pt_hymnal_1996') return null
      if (key === 'pt_categories') return null
      if (key === 'downloaded_albums') return []
      return null
    })

    const result = await loadLibraryCategories()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('hymnals')
    expect(result[0].albums[0].id).toBe('hymnal')
    expect(result[0].albums[0].songCount).toBe(1)
  })

  it('exclui albums com IDs na lista de exclusao (712, 629)', async () => {
    const mockCategories = [
      {
        id_category: 'cat1',
        name: 'Categorias',
        albums: [
          { id_album: 712, name: 'Excluido 712', url_image: null },
          { id_album: 100, name: 'Album Valido', url_image: null },
          { id_album: 629, name: 'Excluido 629', url_image: null },
        ],
      },
    ]
    vi.mocked(readCatalogRecord).mockImplementation(async (key: string) => {
      if (key === 'pt_categories') return mockCategories
      if (key === 'downloaded_albums') return []
      return null
    })

    const result = await loadLibraryCategories()
    const cat = result.find((c) => c.id === 'cat1')
    expect(cat).toBeDefined()
    expect(cat!.albums).toHaveLength(1)
    expect(cat!.albums[0].name).toBe('Album Valido')
  })

  it('marca albums como downloaded quando estao na lista de downloaded', async () => {
    const mockCategories = [
      {
        id_category: 'cat1',
        name: 'Categorias',
        albums: [
          { id_album: 100, name: 'Album Baixado', url_image: null },
          { id_album: 200, name: 'Album Nao Baixado', url_image: null },
        ],
      },
    ]
    vi.mocked(readCatalogRecord).mockImplementation(async (key: string) => {
      if (key === 'pt_categories') return mockCategories
      if (key === 'downloaded_albums') return [100]
      return null
    })

    const result = await loadLibraryCategories()
    const cat = result.find((c) => c.id === 'cat1')
    const downloaded = cat!.albums.find((a) => a.name === 'Album Baixado')
    const notDownloaded = cat!.albums.find((a) => a.name === 'Album Nao Baixado')
    expect(downloaded!.status).toBe('downloaded')
    expect(notDownloaded!.status).toBe('idle')
  })
})
