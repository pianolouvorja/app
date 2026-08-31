import { describe, expect, it } from 'vitest'

import { revealItemScrollTop } from '../services/media-aside-scroll'

describe('media aside auto-follow', () => {
  it('centraliza o item no scroll do aside, sem depender do documento', () => {
    expect(
      revealItemScrollTop({
        scrollTop: 200,
        containerTop: 100,
        containerHeight: 400,
        itemTop: 350,
        itemHeight: 40,
      }),
    ).toBe(270)
  })

  it('não gera scroll negativo para o primeiro item', () => {
    expect(
      revealItemScrollTop({
        scrollTop: 0,
        containerTop: 100,
        containerHeight: 400,
        itemTop: 110,
        itemHeight: 40,
      }),
    ).toBe(0)
  })
})
