/**
 * Receiver de Controle Remoto (LouvorJA Palco).
 *
 * Conecta ao sender WS do celular (Palco ligado) e executa comandos
 * multimídia no player do desktop (remote.command / remote.ack).
 *
 * Protocolo (v2, mesmo do Palco):
 * - envia `hello {role: 'desktop'}` ao conectar
 * - recebe `remote.command {command, id?, value?}`
 * - responde `remote.ack {id, ok, state}` com o estado do player
 *
 * Sem dependências: WebSocket nativo do renderer.
 */

export type RemoteCommand =
  | 'play'
  | 'pause'
  | 'stop'
  | 'volume'
  | 'seek'

export interface RemotePlayerState {
  playing: boolean
  volume: number
  positionSec?: number
  durationSec?: number
}

export interface RemoteControlOptions {
  /** Ações sobre o player (injetadas pela UI). */
  actions: {
    play(): unknown
    pause(): unknown
    stop(): unknown
    setVolume(v: number): unknown
    seek(sec: number): unknown
  }
  /** Snapshot do estado atual do player. */
  getState(): RemotePlayerState
  /** Log opcional. */
  log?(...args: unknown[]): void
}

export class RemoteControlReceiver {
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private stopped = false

  constructor(
    private readonly url: string,
    private readonly opts: RemoteControlOptions,
  ) {}

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  start(): void {
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  private connect(): void {
    if (this.stopped) return
    try {
      this.ws = new WebSocket(this.url)
    } catch (err) {
      this.opts.log?.('remote: falha ao conectar', err)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.opts.log?.('remote: conectado ao', this.url)
      this.send({ v: 2, type: 'hello', role: 'desktop' })
    }

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type: string
          command?: RemoteCommand
          id?: string
          value?: number
        }
        if (msg.type === 'remote.command' && msg.command) {
          void this.handleCommand(msg.command, msg.id, msg.value)
        }
      } catch {
        // mensagem inválida: ignora
      }
    }

    this.ws.onclose = () => {
      if (!this.stopped) this.scheduleReconnect()
    }
    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || this.stopped) return
    this.reconnectTimer = window.setTimeout(
      () => {
        this.reconnectTimer = null
        this.connect()
      },
      3000,
    )
  }

  private async handleCommand(
    command: RemoteCommand,
    id?: string,
    value?: number,
  ): Promise<void> {
    let ok = true
    try {
      switch (command) {
        case 'play':
          await this.opts.actions.play()
          break
        case 'pause':
          await this.opts.actions.pause()
          break
        case 'stop':
          await this.opts.actions.stop()
          break
        case 'volume':
          if (typeof value === 'number' && Number.isFinite(value)) {
            this.opts.actions.setVolume(Math.min(1, Math.max(0, value)))
          }
          break
        case 'seek':
          if (typeof value === 'number' && Number.isFinite(value)) {
            this.opts.actions.seek(value)
          }
          break
        default:
          ok = false
      }
    } catch (err) {
      this.opts.log?.('remote: erro no comando', command, err)
      ok = false
    }
    this.send({
      v: 2,
      type: 'remote.ack',
      id,
      ok,
      state: this.opts.getState(),
    })
  }

  /** Envia snapshot espontâneo do player (ex: a cada mudança de faixa). */
  reportState(): void {
    this.send({
      v: 2,
      type: 'remote.state',
      state: this.opts.getState(),
    })
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.connected) return
    try {
      this.ws?.send(JSON.stringify(msg))
    } catch {
      // ignore
    }
  }
}
