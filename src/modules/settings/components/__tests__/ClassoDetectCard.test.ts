// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ClassoDetectCard from '../../components/ClassoDetectCard.vue'

const mockT = vi.fn((key: string, params?: Record<string, unknown>) => {
  if (params && 'count' in params) return `${key}:${params.count}:${params.mb}`
  return key
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: mockT }),
}))

type DetectResult = {
  found: boolean
  root: string | null
  media: { albums: { name: string }[]; totalBytes: number }
  dataFiles: unknown
}

const detectMock = vi.fn<() => Promise<DetectResult>>()

function mountCard() {
  return mount(ClassoDetectCard, {
    global: {
      mocks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        louvorja: (window as any).louvorja,
      },
    },
  })
}

function setBridge(detect: () => Promise<DetectResult> | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).louvorja = {
    isElectron: true,
    classo: { detect: detect ?? detectMock },
  }
}

describe('ClassoDetectCard', () => {
  it('botão visível no desktop com bridge classo', async () => {
    setBridge(() => Promise.resolve({ found: false, root: null, media: { albums: [], totalBytes: 0 }, dataFiles: null }))
    const wrapper = mountCard()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="classo-detect-button"]').exists()).toBe(true)
  })

  it('sem desktop: mostra desktopOnly, sem botão', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).louvorja = undefined
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="classo-detect-button"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('settings.classo.desktopOnly')
  })

  it('detecção encontrada: mostra root, contagem de álbuns e MB', async () => {
    setBridge(() =>
      Promise.resolve({
        found: true,
        root: 'C:\\LouvorJA',
        media: {
          albums: [{ name: 'A' }, { name: 'B' }],
          totalBytes: 300 * 1024 * 1024,
        },
        dataFiles: { liturgiaJa: 'C:\\LouvorJA\\liturgia.ja' },
      }),
    )
    const wrapper = mountCard()
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="classo-detect-button"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-test="classo-found"]').exists()).toBe(true)
    })
    expect(wrapper.text()).toContain('C:\\LouvorJA')
    expect(wrapper.text()).toContain('settings.classo.albumsFound:2:300')
    expect(wrapper.text()).toContain('settings.classo.liturgyFound')
  })

  it('não encontrado: mostra erro e não mostra bloco found', async () => {
    setBridge(() =>
      Promise.resolve({ found: false, root: null, media: { albums: [], totalBytes: 0 }, dataFiles: null }),
    )
    const wrapper = mountCard()
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="classo-detect-button"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-test="classo-error"]').exists()).toBe(true)
    })
    expect(wrapper.find('[data-test="classo-found"]').exists()).toBe(false)
  })

  it('erro na detecção: exibe mensagem de erro', async () => {
    setBridge(() => Promise.reject(new Error('boom')))
    const wrapper = mountCard()
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="classo-detect-button"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-test="classo-error"]').exists()).toBe(true)
    })
    expect(wrapper.text()).toContain('settings.classo.detectError')
  })
})
