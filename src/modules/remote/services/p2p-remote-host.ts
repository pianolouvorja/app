/**
 * Controle Remoto via WebRTC (P2P web ↔ APK) — handshake 2-QR.
 *
 * Fluxo (sem servidor de signaling):
 * 1. Web cria RTCPeerConnection + DataChannel, espera ICE gathering completo,
 *    serializa o OFFER (SDP) num QR exibido na tela.
 * 2. APK escaneia (mobile_scanner), seta remote offer, cria ANSWER,
 *    espera gathering, mostra o answer como QR na tela do celular
 *    (e como texto copiável — fallback pra PC sem webcam).
 * 3. Web lê o answer com a webcam (jsQR) OU recebe colado no campo manual.
 * 4. DataChannel abre → protocolo RemoteCommand/RemotePlayerState (v1.2)
 *    em JSON, igual ao WS do desktop.
 */

/** Espera o ICE gathering completar (QR precisa dos candidatos embutidos). */
async function waitForIce(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return
  await new Promise<void>((resolve) => {
    const timer = setTimeout(done, timeoutMs)
    function done() {
      clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    function onChange() {
      if (pc.iceGatheringState === 'complete') done()
    }
    pc.addEventListener('icegatheringstatechange', onChange)
  })
}

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  // STUN público — suficiente pra LAN e a maioria dos NATs.
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export class P2pRemoteHost {
  private pc: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null

  onMessage: ((data: unknown) => void) | null = null
  onOpen: (() => void) | null = null
  onClose: (() => void) | null = null

  /** Passo 1: gera o offer (QR pro APK escanear). */
  async createOffer(): Promise<string> {
    this.cleanup()
    this.pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG)
    this.channel = this.pc.createDataChannel('louvorja-remote', {
      ordered: true,
    })
    this.bindChannel(this.channel)
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    await waitForIce(this.pc)
    return JSON.stringify(this.pc.localDescription)
  }

  /** Passo 3: aplica o answer do APK (QR lido ou colado). */
  async acceptAnswer(answerJson: string): Promise<boolean> {
    if (!this.pc) return false
    try {
      const desc = JSON.parse(answerJson) as RTCSessionDescriptionInit
      await this.pc.setRemoteDescription(desc)
      return true
    } catch {
      return false
    }
  }

  send(payload: unknown): void {
    if (this.channel?.readyState === 'open') {
      this.channel.send(JSON.stringify(payload))
    }
  }

  get isOpen(): boolean {
    return this.channel?.readyState === 'open'
  }

  private bindChannel(ch: RTCDataChannel) {
    ch.onopen = () => this.onOpen?.()
    ch.onclose = () => this.onClose?.()
    ch.onmessage = (ev) => {
      try {
        this.onMessage?.(JSON.parse(String(ev.data)))
      } catch {
        // payload não-JSON: ignora
      }
    }
  }

  private cleanup() {
    this.channel?.close()
    this.channel = null
    this.pc?.close()
    this.pc = null
  }

  destroy(): void {
    this.cleanup()
  }
}
