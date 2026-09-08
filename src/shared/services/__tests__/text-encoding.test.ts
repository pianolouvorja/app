import { describe, expect, it } from 'vitest'

import { decodeTextFileBytes } from '../text-encoding'

describe('decodeTextFileBytes', () => {
  it('UTF-8 válido decodifica direto', () => {
    const bytes = new TextEncoder().encode('MIGUEL SÁ')
    expect(decodeTextFileBytes(bytes)).toBe('MIGUEL SÁ')
  })

  it('ANSI (windows-1252) preserva acentos', () => {
    // "MIGUEL SÁ" em cp1252: … S \xC1
    const bytes = Uint8Array.from([
      0x4d, 0x49, 0x47, 0x55, 0x45, 0x4c, 0x20, 0x53, 0xc1,
    ])
    expect(decodeTextFileBytes(bytes)).toBe('MIGUEL SÁ')
  })

  it('não produz caractere de substituição no Á de cp1252', () => {
    const bytes = Uint8Array.from([0x53, 0xc1])
    expect(decodeTextFileBytes(bytes)).toBe('SÁ')
    expect(decodeTextFileBytes(bytes)).not.toContain('\uFFFD')
  })
})
