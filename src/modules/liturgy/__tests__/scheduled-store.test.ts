import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useScheduledStore } from '../stores/useScheduledStore'

const prefs: Record<string, unknown> = {}
vi.mock('@shared/services/browser-storage', () => ({
  getBrowserItem: <T,>(key: string, fallback: T) => (prefs[key] as T) ?? fallback,
  setBrowserItem: (key: string, value: unknown) => { prefs[key] = value },
}))

const catsXml =
  '<DATAPACKET><ROWDATA><ROW ID="c1" NOME="Provai e Vede"/></ROWDATA></DATAPACKET>'
const itemsXml =
  '<DATAPACKET><ROWDATA>' +
  '<ROW ID="i1" CATEGORIA="c1" DATA="12/10/2026" NOME="Sermão" ARQUIVO="C:\\sermao.pptx" ARQUIVO_INFO=""/>' +
  '<ROW ID="i2" CATEGORIA="c1" DATA="2026-10-19" NOME="Provai 2" ARQUIVO="videos\\clipe.mp4" ARQUIVO_INFO="I"/>' +
  '</ROWDATA></DATAPACKET>'

describe('useScheduledStore', () => {
  beforeEach(() => {
    Object.keys(prefs).forEach((k) => delete prefs[k])
    setActivePinia(createPinia())
  })

  it('importa categorias e itens, merge por id', () => {
    const store = useScheduledStore()
    const changed = store.importFromDelphi(catsXml, itemsXml)
    expect(changed).toBe(2)
    expect(store.categories).toHaveLength(1)
    expect(store.categories[0]!.name).toBe('Provai e Vede')
    expect(store.items).toHaveLength(2)
    expect(store.items[0]!.date).toBe('2026-10-12')
    expect(store.items[1]!.isRelativePath).toBe(true)

    // itemsOn por data
    expect(store.itemsOn('2026-10-12')).toHaveLength(1)
    expect(store.itemsOn('2026-10-19')).toHaveLength(1)
    expect(store.itemsOn('2026-10-20')).toHaveLength(0)

    // merge substitui
    store.importFromDelphi('', '<DATAPACKET><ROWDATA>' +
      '<ROW ID="i1" CATEGORIA="c1" DATA="12/10/2026" NOME="Atualizado"/>' +
      '</ROWDATA></DATAPACKET>')
    expect(store.items).toHaveLength(2)
    expect(store.items.find((i) => i.id === 'i1')!.name).toBe('Atualizado')
  })

  it('DATA inválida é pulada', () => {
    const store = useScheduledStore()
    const changed = store.importFromDelphi(
      '',
      '<DATAPACKET><ROWDATA><ROW ID="x" DATA="não-data" NOME="sem data"/></ROWDATA></DATAPACKET>',
    )
    expect(changed).toBe(0)
  })

  it('persiste via user preferences', () => {
    const store = useScheduledStore()
    store.importFromDelphi(catsXml, itemsXml)
    const saved = prefs['user_data'] as
      | Record<string, { categories: unknown[]; items: unknown[] }>
      | undefined
    expect(saved).toBeTruthy()
    const state = saved!['scheduled.state']!
    expect(state.items).toHaveLength(2)
  })
  it('datas TDateTime float (serial Delphi) também parseiam', () => {
    const store = useScheduledStore()
    const changed = store.importFromDelphi('', '<DATAPACKET><ROWDATA>' +
      '<ROW ID="f1" CATEGORIA="" DATA="46023" NOME="float date"/>' +
      '</ROWDATA></DATAPACKET>')
    expect(changed).toBe(1)
    expect(store.items[0]!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('volume: 5000 itens sem quebrar', () => {
    const store = useScheduledStore()
    const rows = Array.from({ length: 5000 }, (_, i) =>
      '<ROW ID="v' + i + '" CATEGORIA="c1" DATA="12/10/2026" NOME="Item ' + i + '"/>',
    ).join('')
    const changed = store.importFromDelphi(
      '<DATAPACKET><ROWDATA><ROW ID="c1" NOME="Volume"/></ROWDATA></DATAPACKET>',
      '<DATAPACKET><ROWDATA>' + rows + '</ROWDATA></DATAPACKET>',
    )
    expect(changed).toBe(5000)
    expect(store.itemsOn('2026-10-12')).toHaveLength(5000)
  })
})
