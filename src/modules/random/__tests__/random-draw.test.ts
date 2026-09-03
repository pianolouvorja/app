import { describe, expect, it } from 'vitest'

import { mergeUniqueNames, parseNameListFromText } from '../services/random-draw'

describe('parseNameListFromText', () => {
  it('preserva acentos e normaliza NFC', () => {
    const names = parseNameListFromText('Miguel Sá\nJosé\n')
    expect(names).toEqual(['Miguel Sá', 'José'])
  })

  it('une NFD e NFC como o mesmo nome', () => {
    const nfc = 'José'
    const nfd = 'José'.normalize('NFD')
    expect(nfc).not.toBe(nfd)
    const names = parseNameListFromText(`${nfc}\n${nfd}\n`)
    expect(names).toEqual(['José'])
  })
})

describe('mergeUniqueNames', () => {
  it('não duplica o mesmo nome em NFD/NFC', () => {
    const { next, addedCount } = mergeUniqueNames(
      ['José'.normalize('NFC')],
      ['José'.normalize('NFD')],
    )
    expect(addedCount).toBe(0)
    expect(next).toEqual(['José'])
  })
})
