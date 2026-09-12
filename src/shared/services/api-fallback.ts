/**
 * Fallback em cascata de APIs do ecossistema LouvorJA.
 *
 * Ordem (RF: app sempre com onde fazer requisicao):
 *   1. Primária: VITE_URL_DATABASE / VITE_URL_FILES (default: nossa API
 *      api.pianolouvorja.com.br)
 *   2. Fallbacks: VITE_API_FALLBACK_URLS (lista separada por vírgula;
 *      default: api.louvorja.com.br, api.louvorja.workers.dev)
 *
 * Tudo vem de env — nada de host hardcoded. Para adicionar uma redundância
 * da nossa API no futuro, basta incluir o host em VITE_API_FALLBACK_URLS
 * (ou em ApiConfig no APK), sem tocar em código.
 *
 * Mesma semantica do ApiConfig do APK (Flutter) — paridade entre clientes.
 */

/** Fallbacks default, em ordem de prioridade. A primária NÃO está aqui. */
const DEFAULT_FALLBACK_HOSTS = [
  'https://api.louvorja.com.br',
  'https://api.louvorja.workers.dev',
]

/**
 * Hosts de reserva: env VITE_API_FALLBACK_URLS (vírgula = separador),
 * caindo para os defaults se não definida. Espaço p/ redundância futura
 * da nossa API: é só acrescentar o host na lista.
 */
function fallbackHosts(): string[] {
  const env = import.meta.env.VITE_API_FALLBACK_URLS
  if (typeof env === 'string' && env.trim()) {
    return env
      .split(',')
      .map((h) => h.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  }
  return DEFAULT_FALLBACK_HOSTS
}

type ApiKind = 'database' | 'files'

const ENV_KEYS: Record<ApiKind, string> = {
  database: 'VITE_URL_DATABASE',
  files: 'VITE_URL_FILES',
}

const DEFAULT_PRIMARIES: Record<ApiKind, string> = {
  database: 'https://api.pianolouvorja.com.br/json_db',
  files: 'https://api.pianolouvorja.com.br/file',
}

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
  const primary = (typeof env === 'string' && env.trim()) || DEFAULT_PRIMARIES[kind]
  const primaryHost = baseToHost(primary)
  const path = kindToPath(kind)
  const candidates = [primary]
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
