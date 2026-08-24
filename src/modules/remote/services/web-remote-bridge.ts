export interface WebRemoteSnapshot {
  player: {
    hymnId?: number
    title?: string | null
    mode?: string
    playing: boolean
    positionMs: number
    durationMs: number
    slideIndex: number
    slideCount: number
    volume: number
    canPrevious: boolean
    canNext: boolean
  }
  liturgy: {
    selectedIndex: number | null
    items: Array<{
      index: number
      type: string
      title: string | null
      subtitle?: string | null
      isCategory?: boolean
      accentColor?: string | null
      done: boolean
    }>
  }
}

export interface WebRemoteCommand {
  id: string
  action: string
  value?: number
  positionMs?: number
  mode?: string
  hymnId?: number
}

export interface WebRemoteBridgeOptions {
  snapshot(): WebRemoteSnapshot
  execute(command: WebRemoteCommand): Promise<boolean>
  onClose?(): void
}

/**
 * Cliente canônico do navegador para o Web Link servido pelo APK.
 * Usa Remote v1; não reutiliza protocolo Palco v2.
 */
export class WebRemoteBridge {
  private ws: WebSocket | null = null
  private stopped = false

  constructor(
    private readonly url: string,
    private readonly options: WebRemoteBridgeOptions,
  ) {}

  start(): void {
    this.stopped = false
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.send({ v: 1, type: 'hello', device: 'Piano LouvorJA Web' })
      this.reportState()
    }
    this.ws.onmessage = (event) => {
      void this.handle(String(event.data))
    }
    this.ws.onclose = () => {
      this.ws = null
      if (!this.stopped) this.options.onClose?.()
    }
    this.ws.onerror = () => this.ws?.close()
  }

  stop(): void {
    this.stopped = true
    this.ws?.close()
    this.ws = null
  }

  reportState(): void {
    this.send({ v: 1, type: 'state', ...this.options.snapshot() })
  }

  private async handle(raw: string): Promise<void> {
    let message: WebRemoteCommand & { v?: number; type?: string }
    try {
      message = JSON.parse(raw) as WebRemoteCommand & { v?: number; type?: string }
    } catch {
      return
    }
    if (message.v !== 1 || message.type !== 'command' || !message.id || !message.action) return

    let ok = false
    try {
      ok = await this.options.execute(message)
    } catch {
      ok = false
    }
    this.send({ v: 1, type: 'ack', id: message.id, ok })
    this.reportState()
  }

  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(message))
  }
}
