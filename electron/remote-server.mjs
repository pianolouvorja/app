/**
 * Servidor WS de Controle Remoto (main process do Electron).
 *
 * Protocolo "LouvorJA Remote v1" — mesmo do APK
 * (lib/core/services/remote/remote_protocol.dart):
 * - envelope JSON {v:1, type, ...}
 * - command/ack/state/error/ping/pong
 * - token de emparelhamento em todo comando (ou desconecta)
 * - estado COMPLETO, não delta
 *
 * O APK conecta aqui (porta 7071) e comanda a LITURGIA (prioridade:
 * múltiplos monitores + projetor cabeado) e o player.
 *
 * Ações de liturgia executam no renderer (store Pinia) via
 * webContents.send('remote:command', ...) — o handler vive em
 * src/modules/remote/renderer/liturgy-bridge.ts.
 */

import { randomBytes } from 'node:crypto'
import { networkInterfaces } from 'node:os'

import QRCode from 'qrcode'
import { app, ipcMain } from 'electron'

const PORT = 7071
const HEARTBEAT_MS = 15_000
const HEARTBEAT_TIMEOUT_MS = 10_000

/** @typedef {import('electron').WebContents} WebContents */

/**
 * @param {import('ws').WebSocketServer} wss
 * @param {WebContents} contents
 * @returns {{ token: string, stop: () => void }}
 */
function lanIp() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

export async function startRemoteServer(wss, contents) {
  const token = randomBytes(4).toString('hex').toUpperCase()

  /** @type {Map<import('ws').WebSocket, {aliveAt: number, authed: boolean, timer: NodeJS.Timeout}>} */
  const clients = new Map()

  const send = (ws, obj) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }

  const clientIdentity = () => {
    const first = clients.keys().next().value
    const address = first?._socket?.remoteAddress ?? null
    return address?.replace(/^::ffff:/, '') ?? null
  }

  const notifyClients = () => {
    try {
      if (!contents.isDestroyed()) {
        contents.send('remote:clients', {
          count: clients.size,
          address: clientIdentity(),
        })
      }
    } catch {
      // janela ainda não pronta
    }
  }

  const pushState = () => {
    // Renderer responde com estado completo; broadcast a todos os clientes.
    try {
      if (!contents.isDestroyed()) contents.send('remote:request-state')
    } catch {
      // janela ainda não pronta
    }
  }

  wss.on('connection', (ws) => {
    // Um operador por desktop: evita comandos concorrentes e ambiguidade UX.
    if (clients.size >= 1) {
      send(ws, { v: 1, type: 'error', code: 'remote_busy' })
      ws.close()
      return
    }

    const entry = {
      aliveAt: Date.now(),
      authed: false,
      timer: setInterval(() => {
        if (Date.now() - entry.aliveAt > HEARTBEAT_TIMEOUT_MS + HEARTBEAT_MS) {
          ws.terminate()
          return
        }
        send(ws, { v: 1, type: 'ping' })
      }, HEARTBEAT_MS),
    }
    clients.set(ws, entry)
    notifyClients()

    ws.on('message', async (raw) => {
      entry.aliveAt = Date.now()
      let msg
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }
      if (msg?.v !== 1) return

      switch (msg.type) {
        case 'ping':
          send(ws, { v: 1, type: 'pong' })
          return
        case 'pong':
          return
        case 'command': {
          const { id, action, token: tok } = msg
          if (typeof id !== 'string' || typeof action !== 'string') return
          if (tok !== token) {
            send(ws, { v: 1, type: 'error', id, code: 'bad_token' })
            ws.close()
            return
          }
          entry.authed = true
          // Encaminha ao renderer; o ack volta via 'remote:ack'.
          contents.send('remote:command', {
            id,
            action,
            value: typeof msg.value === 'number' ? msg.value : undefined,
            positionMs:
              typeof msg.positionMs === 'number' ? msg.positionMs : undefined,
            mode: typeof msg.mode === 'string' ? msg.mode : undefined,
            hymnId: typeof msg.hymnId === 'number' ? msg.hymnId : undefined,
          })
          return
        }
        default:
          return
      }
    })

    ws.on('close', () => {
      clearInterval(entry.timer)
      clients.delete(ws)
      notifyClients()
    })
    ws.on('error', () => ws.terminate())

    // Estado inicial na conexão
    if (!contents.isDestroyed()) pushState()
  })

  // Renderer → APK: ack de comando e push de estado (ipcMain, global)
  const onAck = (_e, ack) => {
    for (const [ws] of clients) send(ws, { v: 1, type: 'ack', ...ack })
  }
  const onState = (_e, player) => {
    for (const [ws] of clients) {
      send(ws, { v: 1, type: 'state', ...(player ?? {}) })
    }
  }
  ipcMain.on('remote:ack', onAck)
  ipcMain.on('remote:state', onState)

  console.info(`[remote] servidor WS na porta ${PORT} — token ${token}`)

  // Pairing: renderer pergunta host+token+QR (Configurações > Controle Remoto)
  const host = lanIp()
  const connectUrl = `louvorja://connect?host=${host}:${PORT}&token=${token}`
  const qrDataUrl = await QRCode.toDataURL(connectUrl, { margin: 1, width: 220 })
  ipcMain.handle('remote:pairing-info', () => ({
    host,
    port: PORT,
    token,
    connectUrl,
    qrDataUrl,
    clientCount: clients.size,
    clientAddress: clientIdentity(),
  }))

  return {
    token,
    stop() {
      // Fechamento normal: avisa o APK para ele sair do modo remoto já.
      for (const [ws, entry] of clients) {
        clearInterval(entry.timer)
        send(ws, { v: 1, type: 'error', id: 'server', code: 'desktop_closed' })
        ws.close()
      }
      clients.clear()
      ipcMain.removeListener('remote:ack', onAck)
      ipcMain.removeListener('remote:state', onState)
      wss.close()
    },
  }
}

export const REMOTE_PORT = PORT

/** Conveniência para o main: sobe junto com o app em dev (devmode). */
export function attachRemoteServer(getContents) {
  let stopped = false
  const boot = async () => {
    if (stopped) return
    const { WebSocketServer } = await import('ws')
    const wss = new WebSocketServer({ port: PORT })
    const handle = await startRemoteServer(wss, {
      // proxy mínimo de WebContents usado pelo servidor
      send: (channel, ...args) => getContents()?.send(channel, ...args),
      isDestroyed: () => !getContents(),
    })
    app.on('quit', handle.stop)
  }
  boot().catch((err) => console.error('[remote] falhou:', err))
  return () => {
    stopped = true
  }
}
