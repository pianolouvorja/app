import { afterEach, describe, expect, it, vi } from 'vitest'

import { WebRemoteBridge } from '../services/web-remote-bridge'

class FakeWebSocket {
  static OPEN = 1
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.OPEN
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
    this.onclose?.()
  }

  open(): void {
    this.onopen?.()
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)

const snapshot = () => ({
  player: {
    playing: false,
    positionMs: 0,
    durationMs: 0,
    slideIndex: 0,
    slideCount: 0,
    volume: 80,
    canPrevious: false,
    canNext: true,
  },
  liturgy: {
    selectedIndex: 0,
    items: [
      { index: 0, type: 'hymn', title: 'Santo, Santo, Santo', done: false },
    ],
  },
})

describe('WebRemoteBridge', () => {
  let bridge: WebRemoteBridge | undefined

  afterEach(() => {
    bridge?.stop()
    bridge = undefined
    FakeWebSocket.instances.length = 0
    vi.restoreAllMocks()
  })

  it('conecta, envia hello v1 e estado completo com liturgia', () => {
    bridge = new WebRemoteBridge('ws://192.168.1.15:9000?t=ABC', {
      snapshot,
      execute: vi.fn().mockResolvedValue(true),
    })

    bridge.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    expect(ws.sent.map((frame) => JSON.parse(frame))).toEqual([
      { v: 1, type: 'hello', device: 'Piano LouvorJA Web' },
      { v: 1, type: 'state', ...snapshot() },
    ])
  })

  it('executa comando da liturgia e responde ack seguido de estado novo', async () => {
    const execute = vi.fn().mockResolvedValue(true)
    bridge = new WebRemoteBridge('ws://x?t=T', { snapshot, execute })
    bridge.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    ws.receive({
      v: 1,
      type: 'command',
      id: 'select-1',
      action: 'liturgy.select',
      value: 0,
    })

    await vi.waitFor(() => expect(execute).toHaveBeenCalledWith(expect.objectContaining({ action: 'liturgy.select', value: 0 })))
    expect(ws.sent.map((frame) => JSON.parse(frame)).slice(-2)).toEqual([
      { v: 1, type: 'ack', id: 'select-1', ok: true },
      { v: 1, type: 'state', ...snapshot() },
    ])
  })

  it('ignora envelope incompatível sem executar ação', async () => {
    const execute = vi.fn().mockResolvedValue(true)
    bridge = new WebRemoteBridge('ws://x?t=T', { snapshot, execute })
    bridge.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    ws.receive({ action: 'remote.hello', device: 'web' })
    await Promise.resolve()

    expect(execute).not.toHaveBeenCalled()
  })
})
