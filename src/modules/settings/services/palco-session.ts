/**
 * PalcoSession — sessão de cast para TV no desktop (padrão StageSession do APK).
 *
 * O sender (WS :7081 + HTTP :7080) vive no main process (electron/palco-server.mjs);
 * este service no renderer comanda via preload (window.palco.*) e traduz
 * StageSettings efetivo do escopo para as mensagens do protocolo Palco v2.
 */

import { readEffectiveStageSettings } from '../../settings/services/stage-settings-runtime'
import { resolveBackgroundImage } from '../../settings/types/stage-settings'

type PalcoStatus = {
  running: boolean
  clients: number
  url: string | null
  wsUrl: string | null
}

type ProjectionInput = {
  /** HTML do texto (aceita <br>). */
  text: string
  /** Referência do rodapé (ex.: 'João 3:16 — ARC'). */
  footerRef?: string
  /** Versão da Bíblia no rodapé. */
  footerVersion?: string
  /** BG: URL http(s) já resolvível pela TV; omitir usa o bg do stage. */
  background?: string
}

/** Mapeia StageSettings → campos do protocolo v2 (receiver). */
function stageToProjectionFields(scope: string, input: ProjectionInput) {
  const s = readEffectiveStageSettings(scope)
  const bg = input.background ?? resolveBackgroundImage(s.backgroundImage) ?? undefined
  return {
    background: bg,
    text: input.text,
    // px@1920 → o receiver divide por 10.8 (px@1080p → vh)
    fontSize: (s.fontSize / 1920) * 1080,
    fontWeight: s.fontWeight,
    textShadow: s.textShadow,
    shadowBlur: s.shadowBlur,
    shadowIntensity: s.shadowIntensity,
    textBox: s.textBox,
    boxOpacity: s.boxOpacity,
    boxBorder: s.boxBorder
      ? { width: 0.4, color: 'rgba(255,255,255,.25)' }
      : undefined,
    footerRef: input.footerRef ?? '',
    footerColor: s.footerRefColor,
    footerWeight: s.footerRefWeight,
    footerVersion: input.footerVersion,
  }
}

export const palcoSession = {
  get isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as never as { louvorja?: { palco?: unknown } }).louvorja?.palco
  },

  async status(): Promise<PalcoStatus | null> {
    if (!this.isElectron) return null
    const palco = (window as never as { louvorja: { palco: { status(): Promise<PalcoStatus> } } }).louvorja.palco
    return palco.status()
  },

  async turnOn(): Promise<boolean> {
    if (!this.isElectron) return false
    const palco = (window as never as { louvorja: { palco: { start(): Promise<boolean> } } }).louvorja.palco
    const ok = await palco.start()
    if (ok) {
      // liga o palco: bg permanente + idle
      this.sendBgPalco()
      this.idle()
    }
    return ok
  },

  async turnOff(): Promise<void> {
    if (!this.isElectron) return
    const palco = (window as never as { louvorja: { palco: { stop(): Promise<void> } } }).louvorja.palco
    await palco.stop()
  },

  /** Projeta texto com o StageSettings do escopo (liturgia/bíblia/hinos/random...). */
  project(scope: string, input: ProjectionInput): void {
    if (!this.isElectron) return
    const fields = stageToProjectionFields(scope, input)
    void (window as never as { louvorja: { palco: { send(m: unknown): Promise<boolean> } } }).louvorja.palco.send({
      v: 2,
      type: 'projection',
      ...fields,
    })
  },

  /** BG permanente do palco (idle) — bg global do stage. */
  sendBgPalco(): void {
    if (!this.isElectron) return
    const s = readEffectiveStageSettings('global')
    const bg = resolveBackgroundImage(s.backgroundImage)
    void (window as never as { louvorja: { palco: { send(m: unknown): Promise<boolean> } } }).louvorja.palco.send({
      v: 2,
      type: 'bgPalco',
      url: bg ?? '',
    })
  },

  /** Timer na TV (countdown/chrono). */
  timer(opts: { duration?: number; mode?: 'countdown' | 'chrono'; label?: string }): void {
    if (!this.isElectron) return
    void (window as never as { louvorja: { palco: { send(m: unknown): Promise<boolean> } } }).louvorja.palco.send({
      v: 2,
      type: 'timer',
      ...opts,
    })
  },

  timerStop(): void {
    if (!this.isElectron) return
    void (window as never as { louvorja: { palco: { send(m: unknown): Promise<boolean> } } }).louvorja.palco.send({
      v: 2,
      type: 'timer',
      action: 'stop',
    })
  },

  /** Volta ao idle (aguardando conteúdo). */
  idle(msg?: string): void {
    if (!this.isElectron) return
    void (window as never as { louvorja: { palco: { send(m: unknown): Promise<boolean> } } }).louvorja.palco.send({
      v: 2,
      type: 'idle',
      msg,
    })
  },

  /** Serve mídia local e retorna a URL para a TV. */
  async serveMedia(name: string, mime: string, base64: string): Promise<string | null> {
    if (!this.isElectron) return null
    return (window as never as { louvorja: { palco: { serveMedia(n: string, m: string, b: string): Promise<string | null> } } })
      .louvorja.palco.serveMedia(name, mime, base64)
  },

  /** Eventos receiver→sender (remote-key, ended, unlocked...). */
  onEvent(cb: (msg: { v?: number; type?: string; [k: string]: unknown }) => void): void {
    if (!this.isElectron) return
    ;(window as never as { louvorja: { palco: { onEvent(cb: (m: unknown) => void): void } } }).louvorja.palco.onEvent(
      cb as (m: unknown) => void,
    )
  },

  onReceiverConnected(cb: (info: { ip?: string; count: number }) => void): void {
    if (!this.isElectron) return
    ;(window as never as { louvorja: { palco: { onReceiverConnected(cb: (i: unknown) => void): void } } })
      .louvorja.palco.onReceiverConnected(cb as (i: unknown) => void)
  },

  onReceiverDisconnected(cb: (info: { count: number }) => void): void {
    if (!this.isElectron) return
    ;(window as never as { louvorja: { palco: { onReceiverDisconnected(cb: (i: unknown) => void): void } } })
      .louvorja.palco.onReceiverDisconnected(cb as (i: unknown) => void)
  },
}
