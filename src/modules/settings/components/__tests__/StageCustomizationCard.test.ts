// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import ptBR from '../../locales/pt-BR'
import StageCustomizationCard from '../StageCustomizationCard.vue'
import { useStageSettingsStore } from '../../stores/useStageSettingsStore'

vi.mock('@design-system/index', () => ({
  GlassCard: { template: '<div><slot /></div>' },
}))
vi.mock('./SettingsToggle.vue', () => ({ default: {
  props: ['modelValue', 'label', 'disabled'],
  emits: ['update:modelValue'],
  template: '<button class="settings-toggle-stub" :data-on="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)">{{ label }}</button>',
} }))
vi.mock('./StagePreview.vue', () => ({ default: { template: '<div class="stage-preview-stub" />' } }))

const i18n = createI18n({ legacy: false, locale: 'pt', messages: { pt: ptBR } })

let pinia: ReturnType<typeof createPinia>

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(StageCustomizationCard, {
    props,
    global: { plugins: [i18n, pinia] },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

describe('StageCustomizationCard', () => {
  it('renderiza o card', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.stage-custom').exists()).toBe(true)
  })

  it('usa o store real: patch reflete no settings', async () => {
    const wrapper = createWrapper()
    const store = useStageSettingsStore()
    const antes = store.settings.textBox
    store.patch({ textBox: !antes })
    await wrapper.vm.$nextTick()
    expect(store.settings.textBox).toBe(!antes)
  })

  it('scope padrão é global', () => {
    const wrapper = createWrapper()
    const store = useStageSettingsStore()
    expect(store.activeScope).toBe('global')
  })

  it('initialScope válido muda a tab ativa', () => {
    const wrapper = createWrapper({ initialScope: 'timer' })
    const store = useStageSettingsStore()
    expect(store.activeScope).toBe('timer')
  })

  it('initialScope inválido não muda a tab', () => {
    const wrapper = createWrapper({ initialScope: 'xpto' })
    const store = useStageSettingsStore()
    expect(store.activeScope).toBe('global')
  })

  it('onlyScope muda escopo ativo', () => {
    const wrapper = createWrapper({ onlyScope: 'clock' })
    const store = useStageSettingsStore()
    expect(store.activeScope).toBe('clock')
  })

  it('botão de toggle alterna setting via patch no store', async () => {
    const wrapper = createWrapper()
    const label = wrapper.find('.stage-custom__toggle-label')
    expect(label.exists()).toBe(true)
    const store = useStageSettingsStore()
    const antes = store.settings.textShadow
    await label.trigger('click')
    expect(store.settings.textShadow).toBe(!antes)
  })

  it('segundo toggle-label alterna textBox', async () => {
    const wrapper = createWrapper()
    const labels = wrapper.findAll('.stage-custom__toggle-label')
    expect(labels.length).toBeGreaterThan(1)
    const store = useStageSettingsStore()
    const antes = store.settings.textBox
    await labels[1].trigger('click')
    expect(store.settings.textBox).toBe(!antes)
  })

  it('resetScope volta defaults', () => {
    const store = useStageSettingsStore()
    store.patch({ textBox: false })
    store.resetScope()
    expect(store.settings.textBox).toBe(true)
  })
})
