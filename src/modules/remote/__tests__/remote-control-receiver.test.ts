/**
 * Tests — RemoteControlReceiver (protocolo Palco remote.command).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RemoteControlReceiver } from '../services/remote-control-receiver'

class FakeWebSocket {
  static OPEN = 1
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.OPEN
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
    this.onclose?.()
  }

  // helpers de teste
  open(): void {
    this.onopen?.()
  }

  receive(msg: unknown): void {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
}

vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)

function makeActions() {
  return {
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn(),
    seek: vi.fn(),
  }
}

describe('RemoteControlReceiver', () => {
  let receiver: RemoteControlReceiver

  afterEach(() => {
    receiver?.stop()
    FakeWebSocket.instances.length = 0
    vi.restoreAllMocks()
  })

  it('envia hello com role desktop ao conectar', () => {
    const actions = makeActions()
    receiver = new RemoteControlReceiver('ws://192.168.1.10:7081/palco', {
      actions,
      getState: () => ({ playing: false, volume: 0.5 }),
    })
    receiver.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    expect(ws.sent.length).toBeGreaterThan(0)
    const hello = JSON.parse(ws.sent[0]!)
    expect(hello).toMatchObject({ v: 2, type: 'hello', role: 'desktop' })
  })

  it('executa pause e responde ack com estado', async () => {
    const actions = makeActions()
    receiver = new RemoteControlReceiver('ws://x/palco', {
      actions,
      getState: () => ({ playing: false, volume: 0.5 }),
    })
    receiver.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    ws.receive({ v: 2, type: 'remote.command', command: 'pause', id: 'rc_1' })
    await vi.waitFor(() =>
      expect(ws.sent.some((s) => s.includes('remote.ack'))).toBe(true),
    )

    expect(actions.pause).toHaveBeenCalledTimes(1)
    const ack = JSON.parse(
      ws.sent.find((s) => s.includes('remote.ack'))!,
    )
    expect(ack).toMatchObject({
      type: 'remote.ack',
      id: 'rc_1',
      ok: true,
    })
    expect(ack.state).toEqual({ playing: false, volume: 0.5 })
  })

  it('volume é clampado em [0,1]', async () => {
    const actions = makeActions()
    receiver = new RemoteControlReceiver('ws://x/palco', {
      actions,
      getState: () => ({ playing: false, volume: 1 }),
    })
    receiver.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    ws.receive({
      v: 2,
      type: 'remote.command',
      command: 'volume',
      id: 'rc_2',
      value: 7,
    })
    await vi.waitFor(() => expect(actions.setVolume).toHaveBeenCalled())
    expect(actions.setVolume).toHaveBeenCalledWith(1)
  })

  it('comando desconhecido responde ok=false', async () => {
    const actions = makeActions()
    receiver = new RemoteControlReceiver('ws://x/palco', {
      actions,
      getState: () => ({ playing: false, volume: 0.5 }),
    })
    receiver.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    ws.receive({ v: 2, type: 'remote.command', command: 'eject', id: 'rc_3' })
    await vi.waitFor(() =>
      expect(ws.sent.some((s) => s.includes('remote.ack'))).toBe(true),
    )
    const ack = JSON.parse(
      ws.sent.find((s) => s.includes('remote.ack'))!,
    )
    expect(ack.ok).toBe(false)
  })

  it('reportState envia snapshot espontâneo', () => {
    const actions = makeActions()
    receiver = new RemoteControlReceiver('ws://x/palco', {
      actions,
      getState: () => ({ playing: true, volume: 0.9 }),
    })
    receiver.start()
    const ws = FakeWebSocket.instances.at(-1)!
    ws.open()

    receiver.reportState()
    const state = JSON.parse(ws.sent.at(-1)!)
    expect(state).toMatchObject({ type: 'remote.state' })
    expect(state.state).toEqual({ playing: true, volume: 0.9 })
  })

  it('stop impede reconexão', async () => {
    vi.useFakeTimers()
    const actions = makeActions()
    receiver = new RemoteControlReceiver('ws://x/palco', {
      actions,
      getState: () => ({ playing: false, volume: 0.5 }),
    })
    receiver.start()
    receiver.stop()
    const before = FakeWebSocket.instances.length
    await vi.advanceTimersByTimeAsync(10_000)
    expect(FakeWebSocket.instances.length).toBe(before)
    vi.useRealTimers()
  })
})
