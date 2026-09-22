// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * useProjectionWindow — ciclo de vida das janelas de projeção (popups).
 * Mocks: display-service (monitores fixos), projection-preferences (settings
 * em memória), bridge e window.open controlável.
 */

const mocks = vi.hoisted(() => {
  const state = {
    displays: [] as Array<Record<string, unknown>>,
    settings: {
      targetDisplayIds: [] as number[],
      declinedDisplayIds: [] as number[],
      openReturnScreen: false,
      returnDisplayId: null as number | null,
      openFullscreenOnPrimary: true,
      disablePrimaryWhenExtended: true,
    },
    bridge: null as null | Record<string, unknown>,
  }
  return { state }
})

vi.mock('@modules/settings/services/display-service', () => ({
  listSystemDisplays: vi.fn(async () => mocks.state.displays),
  listExtendedDisplays: (all: Array<{ isPrimary: boolean }>) =>
    all.filter((d) => !d.isPrimary),
}))

vi.mock('@modules/settings/services/projection-preferences', () => ({
  loadProjectionSettings: vi.fn(() => ({ ...mocks.state.settings })),
  saveProjectionSettings: vi.fn(),
  reconcileTargetDisplays: vi.fn((s: { targetDisplayIds: number[] }, ids: number[]) => ({
    ...s,
    targetDisplayIds: s.targetDisplayIds.filter((id) => ids.includes(id)),
  })),
  pruneReturnDisplay: vi.fn((s: { returnDisplayId: number | null }, ids: number[]) => ({
    ...s,
    returnDisplayId:
      s.returnDisplayId != null && ids.includes(s.returnDisplayId)
        ? s.returnDisplayId
        : null,
  })),
  resolveSelectedReturnMonitorId: vi.fn(
    (s: { returnDisplayId: number | null }, ids: number[], sel: number[]) =>
      s.returnDisplayId != null && ids.includes(s.returnDisplayId) && sel.includes(s.returnDisplayId)
        ? s.returnDisplayId
        : null,
  ),
}))

vi.mock('@shared/services/desktop-bridge', () => ({
  getDesktopBridge: vi.fn(() => mocks.state.bridge),
}))

import {
  closeProjectionModule,
  hasSelectedExtendedProjectionTargets,
  isProjectionModuleOpen,
  openProjectionModule,
  reapplyProjectionTargets,
  syncProjectionAfterDisplayChange,
  toggleProjectionModule,
  useProjectionWindow,
} from '../useProjectionWindow'

const disp = (id: number, isPrimary = false) => ({
  id,
  isPrimary,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  scaleFactor: 1,
})

class FakePopup {
  static instances: FakePopup[] = []
  static nextOpen: FakePopup | null | 'closed' = null
  closed = false
  monitorId?: number
  layout?: string
  focused = false
  constructor(public url: string, public name: string) {
    FakePopup.instances.push(this)
  }
  focus() {
    this.focused = true
  }
  close() {
    this.closed = true
  }
}

beforeEach(() => {
  FakePopup.instances.length = 0
  FakePopup.nextOpen = null
  mocks.state.displays = [disp(1, true), disp(2), disp(3)]
  mocks.state.settings = {
    targetDisplayIds: [2],
    declinedDisplayIds: [],
    openReturnScreen: false,
    returnDisplayId: null,
    openFullscreenOnPrimary: true,
    disablePrimaryWhenExtended: true,
  }
  mocks.state.bridge = null
  closeProjectionModule()
  vi.stubGlobal('open', vi.fn((url: string, name: string) => {
    if (FakePopup.nextOpen === 'closed') {
      const closed = new FakePopup(url, name)
      closed.closed = true
      return closed
    }
    if (FakePopup.nextOpen === null) return new FakePopup(url, name)
    return FakePopup.nextOpen
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  closeProjectionModule()
})

describe('openProjectionModule', () => {
  it('abre popup nas telas selecionadas (audience)', async () => {
    const ok = await openProjectionModule('media')
    expect(ok).toBe(true)
    expect(isProjectionModuleOpen('media')).toBe(true)
    expect(FakePopup.instances).toHaveLength(1)
    expect(FakePopup.instances[0]?.url).toContain('module=media')
    expect(FakePopup.instances[0]?.url).toContain('monitorId=2')
    expect(FakePopup.instances[0]?.url).toContain('fs=1')
  })

  it('mesmo módulo já aberto -> foca e não reabre', async () => {
    await openProjectionModule('media')
    const countBefore = FakePopup.instances.length
    const again = await openProjectionModule('media')
    expect(again).toBe(true)
    expect(FakePopup.instances.length).toBe(countBefore)
    expect(FakePopup.instances[0]?.focused).toBe(true)
  })

  it('window.open falhando -> false e module null', async () => {
    FakePopup.nextOpen = null
    vi.stubGlobal('open', vi.fn(() => null))
    expect(await openProjectionModule('media')).toBe(false)
    expect(isProjectionModuleOpen()).toBe(false)
  })

  it('sem alvos e primary bloqueado por extended -> sem janelas', async () => {
    mocks.state.settings.targetDisplayIds = []
    mocks.state.settings.disablePrimaryWhenExtended = true
    expect(await openProjectionModule('bible')).toBe(false)
  })

  it('sem alvos e primary permitido (sem extended) -> abre no primário', async () => {
    mocks.state.settings.targetDisplayIds = []
    mocks.state.settings.disablePrimaryWhenExtended = false
    expect(await openProjectionModule('bible')).toBe(true)
    expect(FakePopup.instances[0]?.url).toContain('monitorId=1')
  })

  it('return screen: abre segunda janela layout=return', async () => {
    mocks.state.settings.targetDisplayIds = [2, 3]
    mocks.state.settings.openReturnScreen = true
    mocks.state.settings.returnDisplayId = 3
    await openProjectionModule('media')
    expect(FakePopup.instances).toHaveLength(2)
    const urls = FakePopup.instances.map((w) => w.url)
    expect(urls.some((u) => u.includes('layout=return'))).toBe(true)
  })

  it('preferredIds explícitos filtram extended', async () => {
    await openProjectionModule('bible', [2, 99])
    expect(FakePopup.instances).toHaveLength(1)
    expect(FakePopup.instances[0]?.url).toContain('monitorId=2')
  })

  it('preferredIds vazio -> nenhuma janela', async () => {
    expect(await openProjectionModule('bible', [])).toBe(false)
  })

  it('troca de módulo fecha as janelas anteriores', async () => {
    await openProjectionModule('media')
    const first = FakePopup.instances[0]
    await openProjectionModule('bible')
    expect(first?.closed).toBe(true)
    expect(isProjectionModuleOpen('bible')).toBe(true)
    expect(isProjectionModuleOpen('media')).toBe(false)
  })
})

describe('closeProjectionModule / toggle', () => {
  it('close fecha janelas e chama closeUrl da bridge', async () => {
    const closeUrl = vi.fn(async () => undefined)
    mocks.state.bridge = { projection: { closeUrl } }
    await openProjectionModule('media')
    closeProjectionModule()
    expect(FakePopup.instances[0]?.closed).toBe(true)
    expect(closeUrl).toHaveBeenCalled()
    expect(isProjectionModuleOpen()).toBe(false)
  })

  it('toggle abre e fecha', async () => {
    expect(await toggleProjectionModule('media')).toBe(true)
    expect(await toggleProjectionModule('media')).toBe(false)
    expect(isProjectionModuleOpen()).toBe(false)
  })
})

describe('reapplyProjectionTargets', () => {
  it('sem módulo ativo -> false', async () => {
    expect(await reapplyProjectionTargets([2])).toBe(false)
  })

  it('mantém janelas das telas que continuam selecionadas', async () => {
    await openProjectionModule('media')
    const kept = FakePopup.instances[0]
    const ok = await reapplyProjectionTargets([2, 3])
    expect(ok).toBe(true)
    expect(kept?.closed).toBe(false)
    // nova janela pra tela 3
    expect(FakePopup.instances.length).toBe(2)
  })

  it('troca completa de telas fecha as antigas', async () => {
    await openProjectionModule('media')
    const old = FakePopup.instances[0]
    await reapplyProjectionTargets([3])
    expect(old?.closed).toBe(true)
    expect(FakePopup.instances.some((w) => w.url.includes('monitorId=3'))).toBe(true)
  })

  it('nenhum alvo -> fecha tudo e notifica evento', async () => {
    const events: Array<{ detail: { open: boolean } }> = []
    window.addEventListener('louvorja:projection-reapplied', (e) => {
      events.push((e as CustomEvent<{ open: boolean }>).detail ? (e as never) : (e as never))
    })
    await openProjectionModule('media')
    await reapplyProjectionTargets([])
    expect(isProjectionModuleOpen()).toBe(false)
    window.removeEventListener('louvorja:projection-reapplied', () => {})
  })

  it('return window mantida quando returnId continua', async () => {
    mocks.state.settings.targetDisplayIds = [2, 3]
    mocks.state.settings.openReturnScreen = true
    mocks.state.settings.returnDisplayId = 3
    await openProjectionModule('media')
    await reapplyProjectionTargets([2, 3])
    const returnWins = FakePopup.instances.filter((w) => w.layout === 'return')
    expect(returnWins.length).toBeGreaterThan(0)
    expect(returnWins.every((w) => !w.closed)).toBe(true)
  })
})

describe('syncProjectionAfterDisplayChange', () => {
  it('sem extended e sem retorno -> fecha projeção', async () => {
    await openProjectionModule('media')
    mocks.state.displays = [disp(1, true)]
    await syncProjectionAfterDisplayChange()
    expect(isProjectionModuleOpen()).toBe(false)
  })

  it('com extended -> reconcilia e reaplica', async () => {
    await openProjectionModule('media')
    mocks.state.displays = [disp(1, true), disp(2), disp(3), disp(4)]
    await syncProjectionAfterDisplayChange()
    expect(isProjectionModuleOpen()).toBe(true)
  })
})

describe('hasSelectedExtendedProjectionTargets', () => {
  it('sem extended -> false', async () => {
    mocks.state.displays = [disp(1, true)]
    expect(await hasSelectedExtendedProjectionTargets()).toBe(false)
  })

  it('extended selecionado -> true; nada selecionado -> false', async () => {
    expect(await hasSelectedExtendedProjectionTargets()).toBe(true)
    mocks.state.settings.targetDisplayIds = []
    expect(await hasSelectedExtendedProjectionTargets()).toBe(false)
  })
})

describe('useProjectionWindow — fachada', () => {
  it('expõe as mesmas operações', async () => {
    const facade = useProjectionWindow()
    const ok = await facade.open('media')
    expect(ok).toBe(true)
    expect(facade.isOpen('media')).toBe(true)
    facade.closeAll()
    expect(facade.isOpen()).toBe(false)
    expect(typeof facade.toggle).toBe('function')
    expect(typeof facade.reapplyTargets).toBe('function')
    expect(typeof facade.syncAfterDisplayChange).toBe('function')
    expect(typeof facade.hasSelectedExtendedProjectionTargets).toBe('function')
  })
})
