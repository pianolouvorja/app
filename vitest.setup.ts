// vitest.setup.ts — roda ANTES de qualquer teste/import
// Só define localStorage/sessionStorage se NÃO existirem (testes que usam
// vi.stubGlobal('localStorage') falham com "Cannot redefine" se definirmos sempre).
const makeStorageMock = () => {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  }
}

const g = globalThis as Record<string, unknown>
if (typeof g.localStorage === 'undefined') {
  Object.defineProperty(global, 'localStorage', { value: makeStorageMock(), writable: true, configurable: true })
}
if (typeof g.sessionStorage === 'undefined') {
  Object.defineProperty(global, 'sessionStorage', { value: makeStorageMock(), writable: true, configurable: true })
}
