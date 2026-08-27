import { describe, expect, it } from 'vitest'

import {
  EXECUTABLE_ITEM_TYPES,
  INTERNAL_FILE_TYPES,
  LITURGY_ITEM_TYPES,
  LITURGY_ITEM_TYPE_META,
  LITURGY_TYPE_GROUPS,
  getTypeDotColor,
} from '../types/liturgy'
import { getItemTypeIcon } from '../services/liturgy-item-helpers'

describe('liturgy item type: audio', () => {
  it('audio é um tipo válido de item', () => {
    expect(LITURGY_ITEM_TYPES).toContain('audio')
  })

  it('audio está no grupo internal (Mídias Internas), ao lado do vídeo', () => {
    const internal = LITURGY_TYPE_GROUPS.find((g) => g.id === 'internal')
    expect(internal).toBeDefined()
    const values = internal!.types.map((chip) => chip.value)
    expect(values).toContain('audio')
    // ao lado do vídeo = imediatamente antes
    expect(values.indexOf('audio')).toBe(values.indexOf('video') - 1)
  })

  it('audio NÃO está no grupo external', () => {
    const external = LITURGY_TYPE_GROUPS.find((g) => g.id === 'external')
    expect(external!.types.map((c) => c.value)).not.toContain('audio')
  })

  it('audio tem dot de cor (magenta) resolvido por getTypeDotColor', () => {
    expect(getTypeDotColor('audio')).toBe('#D500F9')
  })

  it('audio tem meta com ícone headphones', () => {
    const meta = LITURGY_ITEM_TYPE_META.find((m) => m.value === 'audio')
    expect(meta).toMatchObject({ icon: 'ti-headphones' })
    expect(getItemTypeIcon('audio')).toBe('ti-headphones')
  })

  it('audio é executável e usa arquivo local (INTERNAL_FILE_TYPES)', () => {
    expect(EXECUTABLE_ITEM_TYPES).toContain('audio')
    expect(INTERNAL_FILE_TYPES).toContain('audio')
  })
})
