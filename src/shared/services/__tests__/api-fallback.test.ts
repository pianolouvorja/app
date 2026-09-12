import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiCandidateBases, fetchWithApiFallback } from '../api-fallback'

// mock de import.meta.env — os módulos leem direto de import.meta.env
const envMock = { env: {} as Record<string, string> }

vi.mock('import.meta.env', () => envMock)

// stub de import.meta.env via Object.defineProperty (vitest não deixa escrever direto)
function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete (import.meta.env as Record<string, unknown>)[key]
  } else {
    ;(import.meta.env as Record<string, unknown>)[key] = value
  }
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  setEnv('VITE_URL_DATABASE', undefined)
  setEnv('VITE_URL_FILES', undefined)
  setEnv('VITE_API_TOKEN', undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiCandidateBases', () => {
  it('default sem env: primária pianolouvorja + fallbacks louvorja/workers', () => {
    const bases = apiCandidateBases('database')
    expect(bases).toEqual([
      'https://api.pianolouvorja.com.br/json_db',
      'https://api.louvorja.com.br/json_db',
      'https://api.louvorja.workers.dev/json_db',
    ])
  })

  it('env apontando pra primária não duplica host no fallback', () => {
    setEnv('VITE_URL_FILES', 'https://api.pianolouvorja.com.br/file')
    const bases = apiCandidateBases('files')
    expect(bases[0]).toBe('https://api.pianolouvorja.com.br/file')
    expect(bases.filter((b) => b.includes('pianolouvorja'))).toHaveLength(1)
  })

  it('env apontando pra API dos caras: primária ela, fallbacks fixos sem duplicar', () => {
    setEnv('VITE_URL_DATABASE', 'https://api.louvorja.com.br/json_db')
    const bases = apiCandidateBases('database')
    expect(bases[0]).toBe('https://api.louvorja.com.br/json_db')
    expect(bases).not.toContain('https://api.louvorja.com.br/json_db' + 'x')
    // sem duplicar a primária nos fallbacks
    expect(bases.filter((b) => b === 'https://api.louvorja.com.br/json_db')).toHaveLength(1)
    expect(bases).toContain('https://api.louvorja.workers.dev/json_db')
  })

  it('env de dev local (127.0.0.1) mantém fallbacks de produção', () => {
    setEnv('VITE_URL_DATABASE', 'http://127.0.0.1:3100/json_db')
    const bases = apiCandidateBases('database')
    expect(bases[0]).toBe('http://127.0.0.1:3100/json_db')
    expect(bases).toHaveLength(3)
  })
})

describe('fetchWithApiFallback', () => {
  it('primária ok: nem tenta fallback', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
    const { data, base } = await fetchWithApiFallback('database', 'pt_categories')
    expect(data).toEqual({ ok: 1 })
    expect(base).toContain('pianolouvorja')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('primária fora (rede) → cai pra api.louvorja.com.br', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 2 }), { status: 200 }))
    const { data, base } = await fetchWithApiFallback('database', 'pt_categories', {
      retries: 0,
    })
    expect(data).toEqual({ ok: 2 })
    expect(base).toContain('api.louvorja.com.br')
  })

  it('primária e fallback 1 fora → workers.dev atende', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 3 }), { status: 200 }))
    const { data, base } = await fetchWithApiFallback('database', 'pt_musics', {
      retries: 0,
    })
    expect(data).toEqual({ ok: 3 })
    expect(base).toContain('workers.dev')
  })

  it('todas caídas: propaga o último erro', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(
      fetchWithApiFallback('database', 'pt_categories', { retries: 0 }),
    ).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('404 definitivo na primária também migra de host (catálogo pode divergir)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 9 }), { status: 200 }))
    const { data, base } = await fetchWithApiFallback('database', 'pt_categories', {
      retries: 0,
    })
    expect(data).toEqual({ ok: 9 })
    expect(base).toContain('api.louvorja.com.br')
  })
})
