import { describe, expect, it, vi } from 'vitest'
import {
  collectAliveProjectionWindows,
  decideToggleAction,
  createProjectionHotkeyController,
} from '../projection-hotkey.mjs'

function fakeWindow({ destroyed = false, visible = true } = {}) {
  return {
    isDestroyed: () => destroyed,
    isVisible: () => visible,
    hide: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  }
}

describe('collectAliveProjectionWindows', () => {
  it('coleta fonte + espelhos + shields vivos', () => {
    const source = fakeWindow()
    const mirror = fakeWindow()
    const shield = fakeWindow()
    const alive = collectAliveProjectionWindows({
      getSource: () => source,
      getMirrors: () => [mirror],
      getShields: () => [shield],
    })
    expect(alive).toHaveLength(3)
  })

  it('descarta janelas destruídas', () => {
    const alive = collectAliveProjectionWindows({
      getSource: () => fakeWindow({ destroyed: true }),
      getMirrors: () => [fakeWindow({ destroyed: true }), fakeWindow()],
      getShields: () => [null],
    })
    expect(alive).toHaveLength(1)
  })
})

describe('decideToggleAction', () => {
  it('sem projeção viva → none', () => {
    expect(decideToggleAction({ anyAlive: false, anyVisible: false, operatorVisible: true })).toBe('none')
  })

  it('projeção visível → operador assume', () => {
    expect(decideToggleAction({ anyAlive: true, anyVisible: true, operatorVisible: false })).toBe('show-operator')
  })

  it('projeção escondida e operador visível → volta a projeção', () => {
    expect(decideToggleAction({ anyAlive: true, anyVisible: false, operatorVisible: true })).toBe('show-projection')
  })

  it('nenhum visível (operador minimizado) → operador assume', () => {
    expect(decideToggleAction({ anyAlive: true, anyVisible: false, operatorVisible: false })).toBe('show-operator')
  })
})

describe('createProjectionHotkeyController', () => {
  function makeDeps({ registerOk = true } = {}) {
    const source = fakeWindow()
    const operator = fakeWindow()
    const globalShortcut = {
      register: vi.fn((_key, cb) => {
        globalShortcut.__cb = cb
        return registerOk
      }),
      unregister: vi.fn(),
    }
    const deps = {
      globalShortcut,
      BrowserWindow: { getAllWindows: vi.fn(() => [operator, source]) },
      getSource: () => source,
      getMirrors: () => [],
      getShields: () => [],
      getOperatorWindow: () => operator,
    }
    return { deps, globalShortcut, source, operator }
  }

  it('ensureRegistered registra e toggle show-operator esconde projeção e foca operador', async () => {
    const { deps, globalShortcut, source, operator } = makeDeps()
    const ctrl = createProjectionHotkeyController(deps)
    expect(ctrl.ensureRegistered()).toBe(true)
    expect(globalShortcut.register).toHaveBeenCalledWith('Control+Alt+P', expect.any(Function))

    globalShortcut.__cb()
    expect(source.hide).toHaveBeenCalled()
    expect(operator.focus).toHaveBeenCalled()
  })

  it('toggle de novo (projeção escondida) → mostra projeção', () => {
    const { deps, globalShortcut, source } = makeDeps()
    source.isVisible = () => false
    const ctrl = createProjectionHotkeyController(deps)
    ctrl.ensureRegistered()
    globalShortcut.__cb()
    expect(source.show).toHaveBeenCalled()
    expect(source.focus).toHaveBeenCalled()
  })

  it('unregister libera e é idempotente', () => {
    const { deps, globalShortcut } = makeDeps()
    const ctrl = createProjectionHotkeyController(deps)
    ctrl.ensureRegistered()
    ctrl.unregister()
    ctrl.unregister()
    expect(globalShortcut.unregister).toHaveBeenCalledTimes(1)
    expect(ctrl.isRegistered()).toBe(false)
  })

  it('falha de registro (atalho em uso) não quebra e registra estado falso', () => {
    const { deps } = makeDeps({ registerOk: false })
    const ctrl = createProjectionHotkeyController(deps)
    expect(ctrl.ensureRegistered()).toBe(false)
    expect(ctrl.isRegistered()).toBe(false)
  })
})
