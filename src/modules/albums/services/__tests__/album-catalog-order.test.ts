import { describe, expect, it, vi } from 'vitest'

// Sort replicado de album-catalog.ts loadAlbumCategories() — validar a ordem da Central.
const CATEGORY_ORDER: Record<string, number> = {
  Hinários: 1,
  hymnals: 1,
  'CDs Oficiais/Ano': 2,
  Infantis: 3,
  Doxologia: 4,
  Adoradores: 10,
  Cantores: 11,
  'Celebra SP': 12,
  Diversas: 13,
}

type Cat = { id: string | number; name: string }

function sortCategories(result: Cat[]): Cat[] {
  return [...result].sort((a, b) => {
    const orderA = CATEGORY_ORDER[String(a.id)] ?? CATEGORY_ORDER[a.name] ?? 50
    const orderB = CATEGORY_ORDER[String(b.id)] ?? CATEGORY_ORDER[b.name] ?? 50
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

describe('Central de Mídia — ordem das categorias', () => {
  it('ordena igual à API do túnel (7 categorias, ordem que a API manda)', () => {
    // Ordem CRUA como a API retorna (Infantis/Doxologia no fim)
    const apiOrder: Cat[] = [
      { id: 33, name: 'CDs Oficiais/Ano' },
      { id: 5, name: 'Adoradores' },
      { id: 6, name: 'Cantores' },
      { id: 3, name: 'Celebra SP' },
      { id: 20, name: 'Diversas' },
      { id: 98, name: 'Infantis' },
      { id: 99, name: 'Doxologia' },
    ]
    const sorted = sortCategories(apiOrder).map((c) => c.name)
    expect(sorted).toEqual([
      'CDs Oficiais/Ano',
      'Infantis',
      'Doxologia',
      'Adoradores',
      'Cantores',
      'Celebra SP',
      'Diversas',
    ])
  })

  it('hinários (id hymnals) ficam primeiro', () => {
    const apiOrder: Cat[] = [
      { id: 98, name: 'Infantis' },
      { id: 'hymnals', name: 'Hinários' },
    ]
    const sorted = sortCategories(apiOrder).map((c) => c.name)
    expect(sorted[0]).toBe('Hinários')
  })

  it('categorias fora do mapa vão pro fim, alfabético', () => {
    const apiOrder: Cat[] = [
      { id: 50, name: 'Zzz' },
      { id: 98, name: 'Infantis' },
      { id: 51, name: 'Aaa' },
    ]
    const sorted = sortCategories(apiOrder).map((c) => c.name)
    expect(sorted).toEqual(['Infantis', 'Aaa', 'Zzz'])
  })
})
