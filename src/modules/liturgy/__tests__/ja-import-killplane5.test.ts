import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseJaLiturgy } from '../services/liturgy-ja-import'

/**
 * Kill plane 5 liturgy-ja-import:
 * #81 padStart do dia (fake time com dia < 10)
 * #141/#142/#144 BOM literal no source: arquivo iniciando com \ufeff.
 *   ATENÇÃO: a string de teste usa '\uFEFF' escape — o source usa literal.
 */

const MUSIC = 'tipo=musica\nitem=H\nmusica=1\n'

function jaWith(sections: string, geral = '1=item1'): string {
  return `[Geral]\n${geral}\n${sections}`
}

afterEach(() => {
  vi.useRealTimers()
})

describe('#81 padStart — dia < 10', () => {
  it('checked com data de dia 5 marca done (dd com zero à esquerda)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 5, 12, 0, 0)) // 05/09/2026
    const ja = `[Geral]\n1=item1;item2\n[item1]\n${MUSIC}checked=05/09/2026\n[item2]\n${MUSIC}checked=5/09/2026\n`
    const r = parseJaLiturgy(ja)
    expect(r.sunday?.[0]?.done).toBe(true) // '05/09/2026' == dd/mm/yyyy com pad
    expect(r.sunday?.[1]?.done).toBe(false) // sem pad não é igual
  })
})

describe('#141/#142/#144 — BOM literal', () => {
  it('arquivo com BOM real (\uFEFF) parseia igual', () => {
    const ja = '\uFEFF' + jaWith(`[item1]\n${MUSIC}`)
    const r = parseJaLiturgy(ja)
    expect(r.sunday?.[0]?.name).toBe('H')
  })
})
