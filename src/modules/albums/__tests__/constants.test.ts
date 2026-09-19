// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * Cobertura de constants .ts puros — visibilidade de coletâneas, navegação
 * e seções de settings. São dados estruturais: valida shape e helpers.
 */

import { VISIBILITY_KEY } from '../constants'
import {
  SETTINGS_SECTIONS,
} from '@modules/settings/constants/sections'

describe('albums/constants — visibilidade Minhas Coletâneas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sem preferência: default true; false persistido; qualquer outro valor = visível', async () => {
    const { getShowCustomCollections, setShowCustomCollections } = await import(
      '../constants'
    )
    expect(getShowCustomCollections()).toBe(true) // default
    setShowCustomCollections(false)
    expect(localStorage.getItem(VISIBILITY_KEY)).toBe('false')
    expect(getShowCustomCollections()).toBe(false)
    setShowCustomCollections(true)
    expect(getShowCustomCollections()).toBe(true)
    localStorage.setItem(VISIBILITY_KEY, 'lixo')
    expect(getShowCustomCollections()).toBe(true) // só 'false' esconde
  })
})

describe('settings/constants/sections', () => {
  it('seções têm id/routeName/labelKey únicos', () => {
    const ids = SETTINGS_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const section of SETTINGS_SECTIONS) {
      expect(section.routeName).toBeTruthy()
      expect(section.labelKey).toBeTruthy()
    }
    expect(ids).toContain('appearance')
  })
})
