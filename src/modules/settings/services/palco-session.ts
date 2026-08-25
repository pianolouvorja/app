/**
 * PalcoSession — sessão de cast para TV no desktop (padrão StageSession do APK).
 *
 * O sender (WS :7081 + HTTP :7080) vive no main process (electron/palco-server.mjs);
 * este service no renderer comanda via preload (window.louvorja.palco.*) e traduz
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

/** Acesso tipado ao palco exposto pelo preload (contextBridge). */
function palcoApi(): {
  status(): Promise<PalcoStatus>
  start(): Promise<boolean>
  stop(): Promise<void>
  send(m: unknown): Promise<boolean>
  serveMedia(n: string, m: string, b: string): Promise<string | null>
  onEvent(cb: (m: unknown) => void): void
  onReceiverConnected(cb: (i: unknown) => void): void
  onReceiverDisconnected(cb: (i: unknown) => void): void
} {
  return (window as never as { louvorja: { palco: never } }).louvorja.palco
}

class PalcoSession {
  private baseUrl: string | null = null

  get isElectron(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as never as { louvorja?: { palco?: unknown } }).louvorja?.palco
    )
  }

  async status(): Promise<PalcoStatus | null> {
    if (!this.isElectron) return null
    return palcoApi().status()
  }

  async turnOn(): Promise<boolean> {
    if (!this.isElectron) return false
    this.baseUrl = null // recarrega no próximo project
    const ok = await palcoApi().start()
    if (ok) {
      // liga o palco: bg permanente + idle
      this.sendBgPalco()
      this.idle()
    }
    return ok
  }

  async turnOff(): Promise<void> {
    if (!this.isElectron) return
    this.baseUrl = null
    await palcoApi().stop()
  }

  /** BaseUrl do sender (http://ip:7080) — cacheado após 1º status. */
  private async ensureBaseUrl(): Promise<string | null> {
    if (!this.baseUrl) {
      const st = await this.status()
      this.baseUrl = st?.url ?? null
    }
    return this.baseUrl
  }

  /**
   * BG do build do desktop (/assets/bg-XX-<hash>.png) não existe na TV —
   * o palco-server serve os oficiais em /bg/:id.png. Converte pra URL absoluta.
   */
  private async resolveBgUrl(bg: string | null | undefined): Promise<string | undefined> {
    if (!bg) return undefined
    if (/^https?:\/\//i.test(bg)) return bg
    const base = await this.ensureBaseUrl()
    if (!base) return undefined
    const m = bg.match(/bg-\d+/)
    if (m) return `${base}/bg/${m[0]}.png`
    return `${base}${bg.startsWith('/') ? bg : `/${bg}`}`
  }

  /** Projeta texto com o StageSettings do escopo (liturgia/bíblia/hinos/random...). */
  async project(scope: string, input: ProjectionInput): Promise<void> {
    if (!this.isElectron) return
    const s = readEffectiveStageSettings(scope)
    const bg = await this.resolveBgUrl(
      input.background ?? resolveBackgroundImage(s.backgroundImage),
    )
    await palcoApi().send({
      v: 2,
      type: 'projection',
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
    })
  }

  /** BG permanente do palco (idle) — bg global do stage. */
  async sendBgPalco(): Promise<void> {
    if (!this.isElectron) return
    const s = readEffectiveStageSettings('global')
    const bg = await this.resolveBgUrl(resolveBackgroundImage(s.backgroundImage))
    await palcoApi().send({
      v: 2,
      type: 'bgPalco',
      url: bg ?? '',
    })
  }

  /** Timer na TV (countdown/chrono). */
  timer(opts: { duration?: number; mode?: 'countdown' | 'chrono'; label?: string }): void {
    if (!this.isElectron) return
    void palcoApi().send({
      v: 2,
      type: 'timer',
      ...opts,
    })
  }

  timerStop(): void {
    if (!this.isElectron) return
    void palcoApi().send({
      v: 2,
      type: 'timer',
      action: 'stop',
    })
  }

  /** Áudio na TV — o receiver sincroniza positionMs antes do play. */
  async audio(input: {
    url?: string
    title?: string
    subtitle?: string
    cover?: string
    background?: string
    positionMs?: number
    action?: 'play' | 'pause' | 'stop' | 'seek'
    position?: number
  }): Promise<void> {
    if (!this.isElectron) return
    const bg = await this.resolveBgUrl(input.background)
    await palcoApi().send({
      v: 2,
      type: 'audio',
      ...input,
      background: bg,
    })
  }

  /** Volta ao idle (aguardando conteúdo). */
  idle(msg?: string): void {
    if (!this.isElectron) return
    void palcoApi().send({
      v: 2,
      type: 'idle',
      msg,
    })
  }

  /** Serve mídia local e retorna a URL para a TV. */
  async serveMedia(name: string, mime: string, base64: string): Promise<string | null> {
    if (!this.isElectron) return null
    return palcoApi().serveMedia(name, mime, base64)
  }

  /** Eventos receiver→sender (remote-key, ended, unlocked...). */
  onEvent(cb: (msg: { v?: number; type?: string; [k: string]: unknown }) => void): void {
    if (!this.isElectron) return
    palcoApi().onEvent(cb as (m: unknown) => void)
  }

  onReceiverConnected(cb: (info: { ip?: string; count: number }) => void): void {
    if (!this.isElectron) return
    palcoApi().onReceiverConnected(cb as (i: unknown) => void)
  }

  onReceiverDisconnected(cb: (info: { count: number }) => void): void {
    if (!this.isElectron) return
    palcoApi().onReceiverDisconnected(cb as (i: unknown) => void)
  }
}

export const palcoSession = new PalcoSession()
