/**
 * Servidor do PALCO (cast para TV) — main process do Electron.
 *
 * Paridade com o PalcoSender do APK (lib/core/services/palco/palco_sender.dart,
 * branch feature/palco-ws-transport):
 * - HTTP :7080 — /status (scan do receiver), /receiver.html (receiver embutido),
 *   /media/<nome> (mídia local), /proxy?url= (CORS/headers p/ API)
 * - WS :7081 path /palco — protocolo "Palco v2" (WS JSON):
 *   sender→receiver: projection, audio, video, timer, bgPalco, idle, youare
 *   receiver→sender: unlocked, ended, remote-key, error
 *
 * Regras críticas herdadas do spike/APK (NÃO regredir):
 * 1. WS SEM ping — webOS 4.x não responde pings e cai em loop.
 * 2. Mídia sempre com IP da sub-rede da TV (nunca localhost).
 * 3. Sem token no Palco (rede local, igual APK) — receiver conecta direto.
 *
 * O renderer comanda via IPC: palco:start/palco:stop/palco:send/palco:status.
 */

import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { app, ipcMain } from 'electron'
import { WebSocketServer } from 'ws'

const HTTP_PORT = 7080
const WS_PORT = 7081

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @typedef {import('node:http').IncomingMessage} Req */
/** @typedef {import('node:http').ServerResponse} Res */

function lanIp() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

export function attachPalcoServer(getContents) {
  let httpServer = null
  let wss = null
  /** @type {Set<import('ws').WebSocket>} */
  const clients = new Set()
  /** Mídia servida em /media/<nome> — bytes em memória. */
  const media = new Map()
  /** Última mensagem por tipo (estado) para receivers que conectam depois. */
  const lastByType = new Map()
  let running = false

  const broadcast = (obj) => {
    lastByType.set(obj.type, obj)
    const data = JSON.stringify(obj)
    for (const ws of clients) {
      try {
        if (ws.readyState === ws.OPEN) ws.send(data)
      } catch {
        clients.delete(ws)
      }
    }
  }

  const handleHttp = async (/** @type {Req} */ req, /** @type {Res} */ res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const p = url.pathname
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Scan do receiver: identifica sender na sub-rede
    if (p === '/status') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ unlocked: true, clients: clients.size }))
      return
    }

    // Receiver embutido (mesma página do palco-receiver)
    if (p === '/' || p === '/receiver.html' || p === '/index.html') {
      try {
        const page = await readFile(path.join(__dirname, 'palco', 'receiver.html'))
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(page)
      } catch {
        res.statusCode = 404
        res.end('receiver not bundled')
      }
      return
    }

    // Assets do receiver
    const assetMatch = p.match(/^\/(bg-fallback\.png|logo-piano-louvorja\.png|splash-palco\.png|logo-louvor-ja\.svg|icon\d+\.png)$/)
    if (assetMatch) {
      try {
        const file = path.join(__dirname, 'palco', assetMatch[1])
        const buf = await readFile(file)
        res.setHeader('Content-Type', assetMatch[1].endsWith('.svg') ? 'image/svg+xml' : 'image/png')
        res.end(buf)
      } catch {
        res.statusCode = 404
        res.end()
      }
      return
    }

    // Mídia local servida pelo sender
    if (p.startsWith('/media/')) {
      const name = p.slice('/media/'.length)
      const entry = media.get(name)
      if (!entry) {
        res.statusCode = 404
        res.end()
        return
      }
      res.setHeader('Content-Type', entry.mime)
      res.setHeader('Content-Length', entry.bytes.length)
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      res.end(entry.bytes)
      return
    }

    res.statusCode = 404
    res.end()
  }

  const start = async () => {
    if (running) return true
    try {
      httpServer = createServer((req, res) => {
        void handleHttp(req, res)
      })
      await new Promise((resolve, reject) => {
        httpServer.once('error', reject)
        httpServer.listen(HTTP_PORT, '0.0.0.0', resolve)
      })

      wss = new WebSocketServer({ port: WS_PORT })
      wss.on('connection', (ws, req) => {
        if (req?.url && !req.url.startsWith('/palco')) {
          ws.close()
          return
        }
        clients.add(ws)
        const remoteIp = req?.socket?.remoteAddress?.replace('::ffff:', '')
        // replay do estado atual pro receiver que chegou depois
        for (const msg of lastByType.values()) {
          try {
            if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
          } catch { /* ignore */ }
        }
        if (remoteIp) {
          try {
            ws.send(JSON.stringify({ v: 2, type: 'youare', ip: remoteIp }))
          } catch { /* ignore */ }
        }
        getContents()?.send('palco:receiver-connected', {
          ip: remoteIp,
          count: clients.size,
        })
        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(String(raw))
            getContents()?.send('palco:event', msg)
          } catch { /* ignore */ }
        })
        ws.on('close', () => {
          clients.delete(ws)
          getContents()?.send('palco:receiver-disconnected', { count: clients.size })
        })
        ws.on('error', () => clients.delete(ws))
        // SEM ping (webOS 4.x)
      })

      running = true
      const ip = lanIp()
      console.log(`[palco] sender em http://${ip}:${HTTP_PORT} + ws://${ip}:${WS_PORT}`)
      return true
    } catch (err) {
      console.error('[palco] start FALHOU:', err.message)
      await stop()
      return false
    }
  }

  const stop = async () => {
    for (const ws of clients) {
      try { ws.close() } catch { /* ignore */ }
    }
    clients.clear()
    lastByType.clear()
    media.clear()
    if (wss) {
      await new Promise((r) => wss.close(r))
      wss = null
    }
    if (httpServer) {
      await new Promise((r) => httpServer.close(r))
      httpServer = null
    }
    running = false
  }

  // ---- IPC (renderer comanda) ----

  ipcMain.handle('palco:start', () => start())
  ipcMain.handle('palco:stop', () => stop())
  ipcMain.handle('palco:status', () => ({
    running,
    clients: clients.size,
    url: running ? `http://${lanIp()}:${HTTP_PORT}` : null,
    wsUrl: running ? `ws://${lanIp()}:${WS_PORT}/palco` : null,
  }))
  ipcMain.handle('palco:send', (_e, msg) => {
    if (!running) return false
    broadcast(msg)
    return true
  })
  ipcMain.handle('palco:serve-media', (_e, { name, mime, base64 }) => {
    if (!running) return null
    media.set(name, { mime, bytes: Buffer.from(base64, 'base64') })
    return `http://${lanIp()}:${HTTP_PORT}/media/${name}`
  })
  ipcMain.handle('palco:clear-media', () => {
    media.clear()
    return true
  })

  app.on('before-quit', () => {
    void stop()
  })

  return { stop }
}
