// vitest.setup.ts — roda ANTES de qualquer teste/import
const mockStorage = new Map<string, string>()
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, v),
    removeItem: (k: string) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  },
  writable: true,
})
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, v),
    removeItem: (k: string) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  },
  writable: true,
})