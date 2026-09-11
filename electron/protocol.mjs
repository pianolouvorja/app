import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, net, protocol } from 'electron'

import { API_BASE_URL } from './constants.mjs'
import { resolveMediaRoot } from './windows-media-root.mjs'

const IMAGE_EXT = /\.(bmp|jpe?g|png|gif|webp|ico)$/i

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

/** MIME real pelo conteúdo — no Windows o Chromium trata .bmp só como BMP. */
export function sniffImageMime(buffer) {
  if (!buffer || buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'image/bmp'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }
  if (
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

function mimeFromExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.bmp') return 'image/bmp'
  if (ext === '.ico') return 'image/x-icon'
  return 'application/octet-stream'
}

/**
 * Converte local://media/... no path de disco, sem consultar o registro de novo
 * (resolveMediaRoot é cacheado).
 * @param {string} requestUrl
 * @param {string} userDataRoot
 * @returns {{ kind: 'app' | 'media'; filePath: string; mediaRelative: string }}
 */
export function resolveLocalProtocolPath(requestUrl, userDataRoot) {
  const url = new URL(requestUrl)
  let filePath = decodeURIComponent(url.pathname)
  const host = url.host

  if (host === 'app') {
    if (process.platform === 'win32' && filePath.match(/^\/[a-zA-Z]:\//)) {
      filePath = filePath.slice(1)
    }
    return { kind: 'app', filePath, mediaRelative: '' }
  }

  let fallbackPath = ''
  if (host === 'media') {
    fallbackPath = filePath
  } else if (host) {
    fallbackPath = `/${host}${filePath}`
  } else {
    fallbackPath = filePath
  }

  fallbackPath = fallbackPath.replace(/^\/+/, '').replace(/\\/g, '/')
  const mediaRoot = resolveMediaRoot(userDataRoot)
  return {
    kind: 'media',
    filePath: path.join(mediaRoot, fallbackPath),
    mediaRelative: fallbackPath,
  }
}

function imageResponse(filePath) {
  const buffer = readFileSync(filePath)
  const mime = sniffImageMime(buffer) || mimeFromExtension(filePath)
  return new Response(buffer, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export function registerLocalFileProtocol() {
  protocol.handle('local', async (request) => {
    let resolved
    try {
      resolved = resolveLocalProtocolPath(request.url, app.getPath('userData'))
    } catch {
      return new Response(null, { status: 400 })
    }

    if (resolved.kind === 'app') {
      return net.fetch(pathToFileURL(resolved.filePath).href)
    }

    if (!existsSync(resolved.filePath)) {
      const apiUrl = `${API_BASE_URL}/file/${resolved.mediaRelative}`
      try {
        const response = await net.fetch(apiUrl)
        if (!response.ok) return new Response(null, { status: 404 })
        const buffer = Buffer.from(await response.arrayBuffer())
        mkdirSync(path.dirname(resolved.filePath), { recursive: true })
        writeFileSync(resolved.filePath, buffer)
        const mime = sniffImageMime(buffer) || mimeFromExtension(resolved.filePath)
        return new Response(buffer, {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      } catch (error) {
        console.error('[protocol] fallback download error:', error)
        return new Response(null, { status: 404 })
      }
    }

    if (IMAGE_EXT.test(resolved.filePath)) {
      try {
        return imageResponse(resolved.filePath)
      } catch (error) {
        console.error('[protocol] falha ao ler imagem local:', error)
        return new Response(null, { status: 404 })
      }
    }

    return net.fetch(pathToFileURL(resolved.filePath).href)
  })
}
