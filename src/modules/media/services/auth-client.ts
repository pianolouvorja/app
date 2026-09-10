/**
 * Auth client para coletâneas custom — login simples e-mail + senha
 * contra POST /v1/custom/auth/{register,login,logout}.
 *
 * Sessão persiste no localStorage (chave louvorja.custom.auth).
 * O token é enviado como Authorization: Bearer em todas as chamadas
 * de escrita (create/update/delete) via authHeaders().
 */

export type AuthUser = {
  id_user: number
  email: string
  displayName: string
}

export type AuthSession = {
  token: string
  user: AuthUser
}

const SESSION_KEY = 'louvorja.custom.auth'

function authBaseUrl(): string {
  const base = import.meta.env.VITE_PALCO_API_URL
  if (base) return `${base.replace(/\/$/, '')}/v1/custom/auth`
  return '/v1/custom/auth'
}

export function getAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.token || !parsed?.user?.id_user) return null
    return parsed
  } catch {
    return null
  }
}

function saveSession(session: AuthSession | null): void {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

/** Headers de auth p/ chamadas autenticadas. */
export function authHeaders(): Record<string, string> {
  const session = getAuthSession()
  if (!session) return {}
  return { authorization: `Bearer ${session.token}` }
}

async function authRequest(
  path: 'register' | 'login',
  body: Record<string, string>,
): Promise<AuthSession | null> {
  try {
    const response = await fetch(`${authBaseUrl()}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) return null
    const json = (await response.json()) as AuthSession
    if (!json?.token || !json?.user) return null
    saveSession(json)
    return json
  } catch {
    return null
  }
}

export function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthSession | null> {
  return authRequest('register', { email, password, displayName })
}

export function login(
  email: string,
  password: string,
): Promise<AuthSession | null> {
  return authRequest('login', { email, password })
}

/** Logout: invalida a sessão na API (best-effort) e limpa local. */
export async function logout(): Promise<void> {
  const session = getAuthSession()
  if (session) {
    try {
      await fetch(`${authBaseUrl()}/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${session.token}` },
      })
    } catch {
      // best-effort — limpa local de qualquer forma
    }
  }
  saveSession(null)
}

export { clearAuthSession as clearSession }

function clearAuthSession(): void {
  saveSession(null)
}
