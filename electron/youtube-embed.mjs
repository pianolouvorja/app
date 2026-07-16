import { session } from 'electron'

/**
 * YouTube Error 153: embed exige Referer HTTP válido.
 * Só preenche quando o Referer está ausente/opaco (file://, app://).
 * Usa http://localhost (não youtube.com) para evitar Error 152 por Referer falso.
 */
export function registerYoutubeEmbedHeaders() {
  const filter = {
    urls: [
      '*://*.youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://*.googlevideo.com/*',
      '*://*.ytimg.com/*',
      '*://*.ggpht.com/*',
    ],
  }

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = { ...details.requestHeaders }
    const referer = headers.Referer || headers.referer || ''
    const needsReferer =
      !referer ||
      referer === 'null' ||
      /^file:/i.test(referer) ||
      /^app:/i.test(referer) ||
      /^chrome-extension:/i.test(referer)

    if (needsReferer) {
      headers.Referer = 'http://localhost/'
    }

    callback({ requestHeaders: headers })
  })
}
