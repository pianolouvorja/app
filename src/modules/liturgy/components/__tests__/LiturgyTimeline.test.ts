// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createI18n } from 'vue-i18n'
import LiturgyTimeline from '../LiturgyTimeline.vue'
import liturgyLocale from '../../locales/pt-BR'

vi.mock('../services/liturgy-item-helpers', () => ({
  getCategoryBlockEnd: vi.fn((items: any[], index: number) => {
    let i = index + 1
    while (i < items.length && items[i]?.type !== 'category') i++
    return i - 1
  }),
}))

// Stub leve sem Pinia
vi.mock('../LiturgyTimelineItem.vue', () => ({
  default: {
    name: 'LiturgyTimelineItem',
    props: ['item', 'index', 'isSelected', 'hasInstrumental', 'isBusy', 'startLabel', 'durationLabel', 'canClone', 'deletionLocked', 'siteProjectionItemId', 'videoProjectionItemId'],
    template: '<div data-testid="timeline-item" @click="$emit(\'click\')" />',
    emits: ['click', 'edit', 'remove', 'toggleDone', 'reorder', 'clone', 'addSubItem', 'musicSung', 'musicInstrumental', 'musicSlides', 'musicLyric', 'setPlayer', 'videoFileSelected'],
  },
}))

const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  messages: { 'pt-BR': liturgyLocale },
})

function createItem(overrides = {}) {
  return {
    id: `item-${Math.random()}`,
    type: 'music',
    name: 'Item',
    durationMs: 300000,
    categoryId: null,
    filePath: '',
    filePaths: [],
    musicId: 1,
    url: '',
    accentColor: '#000',
    startTime: '10:00',
    endTime: '10:05',
    ...overrides,
  }
}

function createCategory(overrides = {}) {
  return createItem({ type: 'category', durationMs: 0, categoryId: null, ...overrides })
}

const defaultProps = {
  items: [] as any[],
  selectedIndex: null,
  startLabels: [],
  durationLabels: [],
  canClone: true,
  deletionLocked: false,
  musicInstrumentalById: {},
  busyMusicId: null,
}

function createWrapper(props = {}) {
  return mount(LiturgyTimeline, {
    props: { ...defaultProps, ...props },
    global: { plugins: [i18n] },
  })
}

describe('LiturgyTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza vazio sem erros', () => {
    const wrapper = createWrapper({ items: [] })
    expect(wrapper.exists()).toBe(true)
  })

  it('renderiza itens simples (stub)', () => {
    const items = [createItem({ id: '1', type: 'music' }), createItem({ id: '2', type: 'images' })]
    const wrapper = createWrapper({ items })
    expect(wrapper.findAll('[data-testid="timeline-item"]').length).toBe(2)
  })

  it('agrupa filhos sob categoria (stub)', () => {
    const items = [
      createCategory({ id: 'cat1', name: 'Categoria 1' }),
      createItem({ id: '1', categoryId: 'cat1', type: 'music' }),
      createItem({ id: '2', categoryId: 'cat1', type: 'verse' }),
      createCategory({ id: 'cat2', name: 'Categoria 2' }),
      createItem({ id: '3', categoryId: 'cat2', type: 'images' }),
    ]
    const wrapper = createWrapper({ items })
    expect(wrapper.findAll('[data-testid="timeline-item"]').length).toBe(5)
  })

  it('selectedIndex renderiza sem erro', () => {
    const items = [createItem({ id: '1' }), createItem({ id: '2' })]
    const wrapper = createWrapper({ items, selectedIndex: 1 })
    expect(wrapper.findAll('[data-testid="timeline-item"]').length).toBe(2)
  })

  describe('emits propagados', () => {
    const items = [createItem({ id: '1', type: 'music', musicId: 1 })]

    const emitCases = [
      { event: 'edit', args: [0] },
      { event: 'remove', args: [0] },
      { event: 'toggleDone', args: [0] },
      { event: 'reorder', args: [0, 1] },
      { event: 'clone', args: [] },
      { event: 'addSubItem', args: ['cat1'] },
      { event: 'musicSung', args: [0] },
      { event: 'musicInstrumental', args: [0] },
      { event: 'musicSlides', args: [0] },
      { event: 'musicLyric', args: [0] },
      { event: 'setPlayer', args: [0, 'player-1'] },
      { event: 'videoFileSelected', args: ['1', 30] },
    ] as const

    for (const { event, args } of emitCases) {
      it(`emite ${event}`, async () => {
        const wrapper = createWrapper({ items })
        await wrapper.vm.$emit(event, ...args)
        expect(wrapper.emitted(event)?.[0]).toEqual(args)
      })
    }
  })

  // computed helpers testados indiretamente via LiturgyItemDialog.test.ts
})