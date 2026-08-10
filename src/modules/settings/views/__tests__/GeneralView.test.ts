// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock dependencies
vi.mock('@shared/services/desktop-bridge', () => ({
  isDesktopApp: vi.fn(() => false),
}))
vi.mock('@shared/services/workspace-api', () => ({
  clearWorkspace: vi.fn(),
}))
vi.mock('@shared/services/browser-storage', () => ({
  removeBrowserItem: vi.fn(),
  removeBrowserItemsByPrefix: vi.fn(),
}))
vi.mock('@shared/constants/app', () => ({
  APP_USER_DATA_DIR: '/test/path',
}))
vi.mock('@design-system/index', () => ({
  GlassCard: {
    name: 'GlassCard',
    template: '<div class="glass-card-mock"><slot /></div>',
  },
}))

import GeneralView from '../GeneralView.vue'

// Minimal i18n mock
const mockT = vi.fn((key: string) => key)
const mockLocale = { value: 'pt-BR' }

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: mockT, locale: mockLocale }),
}))

// Mock user-preferences
vi.mock('@shared/services/user-preferences', () => ({
  getUserPreference: vi.fn(() => 'pt-BR'),
  setUserPreference: vi.fn(),
}))

import { setUserPreference } from '@shared/services/user-preferences'

describe('GeneralView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocale.value = 'pt-BR'
  })

  function mountComponent() {
    return mount(GeneralView, {
      global: {
        stubs: ['v-btn'],
      },
    })
  }

  it('renderiza a secao de idioma com GlassCard', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.glass-card-mock').exists()).toBe(true)
    expect(wrapper.find('.general-settings__lang-options').exists()).toBe(true)
  })

  it('renderiza 2 botoes de idioma (pt-BR, es) -- EN desabilitado temporariamente', () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAll('.general-settings__lang-btn')
    expect(buttons).toHaveLength(2)
  })

  it('marca o botao pt-BR como ativo por padrao', () => {
    const wrapper = mountComponent()
    const activeBtn = wrapper.find('.general-settings__lang-btn--active')
    expect(activeBtn.exists()).toBe(true)
  })

  it('chama setUserPreference ao clicar num botao de idioma', async () => {
    const wrapper = mountComponent()
    const esBtn = wrapper.findAll('.general-settings__lang-btn')[1]
    await esBtn.trigger('click')
    expect(setUserPreference).toHaveBeenCalledWith('language', 'es')
  })

  it('troca locale.value ao clicar num botao de idioma', async () => {
    const wrapper = mountComponent()
    const esBtn = wrapper.findAll('.general-settings__lang-btn')[1]
    await esBtn.trigger('click')
    expect(mockLocale.value).toBe('es')
  })

  it('renderiza a secao de dados locais com botao danger', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.general-settings__btn--danger').exists()).toBe(true)
  })

  it('renderiza icone do idioma (ti-world)', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.ti-world').exists()).toBe(true)
  })

  it('renderiza icone de dados (ti-database)', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.ti-database').exists()).toBe(true)
  })

  it('nao renderiza mensagem de erro inicialmente', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.general-settings__status--error').exists()).toBe(false)
  })
})
