// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock dependencies
vi.mock('@shared/services/desktop-bridge', () => ({
  isDesktopApp: vi.fn(() => false),
  getDesktopBridge: vi.fn(() => null),
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
vi.mock('../../components/LegacyMediaImportCard.vue', () => ({
  default: { name: 'LegacyMediaImportCard', template: '<div />' },
}))
vi.mock('../../components/MediaFolderCard.vue', () => ({
  default: { name: 'MediaFolderCard', template: '<div />' },
}))
vi.mock('../../components/AppBackupCard.vue', () => ({
  default: { name: 'AppBackupCard', template: '<div class="app-backup-card-mock" />' },
}))

import GeneralView from '../GeneralView.vue'
import { isDesktopApp } from '@shared/services/desktop-bridge'
import { clearWorkspace } from '@shared/services/workspace-api'

// Minimal i18n mock
const mockT = vi.fn((key: string) => key)
const mockLocale = { value: 'pt-BR' }

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: mockT, locale: mockLocale }),
  createI18n: () => ({ global: { locale: 'pt-BR', t: (key: string) => key } }),
}))

// Mock user-preferences
vi.mock('@shared/services/user-preferences', () => ({
  getUserPreference: vi.fn(() => 'pt-BR'),
  setUserPreference: vi.fn(),
}))

import { setUserPreference } from '@shared/services/user-preferences'

describe('GeneralView.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocale.value = 'pt-BR'
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  function mountComponent() {
    wrapper = mount(GeneralView, {
      attachTo: document.body,
      global: {
        stubs: {
          'v-btn': true,
          Teleport: true,
          LegacyMediaImportCard: true,
          MediaFolderCard: true,
          AppBackupCard: true,
        },
      },
    })
    return wrapper
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

  it('abre o popup ao clicar em apagar dados e nao limpa ainda', async () => {
    vi.mocked(isDesktopApp).mockReturnValue(true)
    const wrapper = mountComponent()
    await wrapper.find('.general-settings__btn--danger').trigger('click')
    expect(wrapper.find('.clear-confirm').exists()).toBe(true)
    expect(wrapper.find('.clear-confirm__checkbox').exists()).toBe(true)
    expect(clearWorkspace).not.toHaveBeenCalled()
  })

  it('mantem confirmar desabilitado ate marcar o checkbox', async () => {
    vi.mocked(isDesktopApp).mockReturnValue(true)
    const wrapper = mountComponent()
    await wrapper.find('.general-settings__btn--danger').trigger('click')
    const confirmBtn = wrapper.find('.clear-confirm__btn--danger')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
    await confirmBtn.trigger('click')
    expect(clearWorkspace).not.toHaveBeenCalled()
  })

  it('apaga os dados so depois do checkbox e confirmar', async () => {
    vi.mocked(isDesktopApp).mockReturnValue(true)
    vi.mocked(clearWorkspace).mockResolvedValue(true)
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    const wrapper = mountComponent()
    await wrapper.find('.general-settings__btn--danger').trigger('click')
    await wrapper.find('.clear-confirm__checkbox').setValue(true)
    await wrapper.find('.clear-confirm__btn--danger').trigger('click')
    expect(clearWorkspace).toHaveBeenCalledTimes(1)
  })

  it('cancela o popup sem apagar dados', async () => {
    vi.mocked(isDesktopApp).mockReturnValue(true)
    const wrapper = mountComponent()
    await wrapper.find('.general-settings__btn--danger').trigger('click')
    await wrapper.find('.clear-confirm__actions .clear-confirm__btn').trigger('click')
    expect(wrapper.find('.clear-confirm').exists()).toBe(false)
    expect(clearWorkspace).not.toHaveBeenCalled()
  })
})
