/**
 * Fallback em cascata de APIs do ecossistema LouvorJA.
 *
 * TUDO vem de ambiente — zero hardcoded, zero default:
 *   1. Primária: VITE_URL_DATABASE / VITE_URL_FILES
 *   2. Fallbacks: VITE_API_FALLBACK_URLS (hosts separados por vírgula)
 *
 * Env vazia/ausente = lista sem aquela entrada (sem primária, sem
 * fallback). A referência dos valores mora no .env.example e no .env
 * de cada build/deploy — mudou URL, muda env, não código.
 *
 * Mesma semantica do ApiConfig do APK (Flutter) — paridade entre clientes.
 */

/** Fallbacks: vêm EXCLUSIVAMENTE da env VITE_API_FALLBACK_URLS.
 * Sem hardcoded, sem default — env vazia/ausente = sem fallback.
 * A referência das URLs mora no .env.example (e no .env de cada build). */
function fallbackHosts(): string[] {
  const env = import.meta.env.VITE_API_FALLBACK_URLS
  if (typeof env !== 'string' || !env.trim()) return []
  return env
    .split(',')
    .map((h) => h.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

type ApiKind = 'database' | 'files'

const ENV_KEYS: Record<ApiKind, string> = {
  database: 'VITE_URL_DATABASE',
  files: 'VITE_URL_FILES',
}

// Primária: EXCLUSIVAMENTE da env (VITE_URL_DATABASE/VITE_URL_FILES).
// Sem hardcoded, sem default — env vazia = sem base primária.

/** Extrai o host (origem) de uma base tipo https://host/json_db */
function baseToHost(base: string): string {
  try {
    return new URL(base).origin
  } catch {
    return base
  }
}

function kindToPath(kind: ApiKind): string {
  return kind === 'database' ? '/json_db' : '/file'
}

/**
 * Lista de bases candidatas em ordem: primária + fallbacks (sem duplicar).
 */
export function apiCandidateBases(kind: ApiKind): string[] {
  const env = import.meta.env[ENV_KEYS[kind]]
  const primary = typeof env === 'string' && env.trim() ? env.trim() : ''
  const primaryHost = baseToHost(primary)
  const path = kindToPath(kind)
  const candidates: string[] = []
  if (primary) candidates.push(primary)
  for (const host of fallbackHosts()) {
    if (host !== primaryHost) candidates.push(`${host}${path}`)
  }
  return candidates
}

/**
 * Fetch com cascata de APIs: tenta a primária; em erro de rede/5xx, tenta os
 * fallbacks na ordem. 429 respeita retry com backoff na MESMA base antes de
 * migrar (rate limit é por host — trocar de host não ajuda).
 */
export async function fetchWithApiFallback<T = unknown>(
  kind: ApiKind,
  file: string,
  options: { retries?: number; delayMs?: number } = {},
): Promise<{ data: T; base: string }> {
  const { retries = 5, delayMs = 1000 } = options
  const bases = apiCandidateBases(kind)
  const path = file.startsWith('/') ? file : `/${file}`
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const token = import.meta.env.VITE_API_TOKEN
  const headers = token ? { 'Api-Token': token } : undefined

  let lastError: unknown = null
  for (const base of bases) {
    try {
      const data: T = await fetchWithRetry(base, path, date, headers, retries, delayMs)
      return { data, base }
    } catch (error) {
      lastError = error
      continue
    }
  }
  throw lastError ?? new Error('api-fallback-exhausted')
}

async function fetchWithRetry<T>(
  base: string,
  path: string,
  date: string,
  headers: Record<string, string> | undefined,
  retries: number,
  delayMs: number,
): Promise<T> {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${base}${path}?${date}`, { headers })
      if (response.status === 429 && attempt < retries) {
        await delay(delayMs * Math.pow(1.5, attempt))
        continue
      }
      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await delay(delayMs * Math.pow(1.5, attempt))
          continue
        }
        throw new Error(`api-exhausted: ${response.status}`)
      }
      return (await response.json()) as T
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < retries && (message.includes('Failed to fetch') || message.includes('NetworkError'))) {
        await delay(delayMs * Math.pow(1.5, attempt))
        continue
      }
      throw error
    }
  }
}
