import { session } from 'electron'

/**
 * Strip Cross-Origin-Resource-Policy / Cross-Origin-Opener-Policy
 * em respostas vindas de túneis trycloudflare (Cloudflare injeta CORP
 * same-origin, bloqueando <img>/<audio> cross-origin no renderer dev).
 * Filtro restrito a *.trycloudflare.com — produção (api.louvorja.com.br) não é afetada.
 */
export function registerTunnelCorpBypass() {
  const filter = {
    urls: ['*://*.trycloudflare.com/*'],
  }

  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    const headers = { ...details.responseHeaders }
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase()
      if (
        lower === 'cross-origin-resource-policy' ||
        lower === 'cross-origin-opener-policy'
      ) {
        delete headers[key]
      }
    }
    callback({ responseHeaders: headers })
  })
}
