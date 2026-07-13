import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { app, net, protocol } from 'electron'

import { API_BASE_URL } from './constants.mjs'

export function registerLocalScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'local',
      privileges: {
        standard: true,
        bypassCSP: true,
        supportFetchAPI: true,
        secure: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
}

export function registerLocalFileProtocol() {
  protocol.registerFileProtocol('local', (request, callback) => {
    let url
    try {
      url = new URL(request.url)
    } catch {
      return callback({ error: -2 })
    }

    let filePath = decodeURIComponent(url.pathname)
    const host = url.host

    if (host === 'app') {
      if (process.platform === 'win32' && filePath.match(/^\/[a-zA-Z]:\//)) {
        filePath = filePath.slice(1)
      }
      return callback({ path: filePath })
    }

    let fallbackPath = ''
    if (host === 'media') {
      fallbackPath = filePath
    } else if (host) {
      fallbackPath = `/${host}${filePath}`
    } else {
      fallbackPath = filePath
    }

    const mediaRoot = path.join(app.getPath('userData'), 'Media')
    filePath = path.join(mediaRoot, fallbackPath)

    if (!existsSync(filePath)) {
      const apiUrl = `${API_BASE_URL}/file${fallbackPath.replace(/\\/g, '/')}`
      net
        .fetch(apiUrl)
        .then((res) => {
          if (!res.ok) throw new Error('API request failed')
          return res.arrayBuffer()
        })
        .then((buffer) => {
          mkdirSync(path.dirname(filePath), { recursive: true })
          writeFileSync(filePath, Buffer.from(buffer))
          callback({ path: filePath })
        })
        .catch((error) => {
          console.error('[protocol] fallback download error:', error)
          callback({ error: -6 })
        })
      return
    }

    callback({ path: filePath })
  })
}
