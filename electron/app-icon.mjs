import { app, nativeImage } from 'electron'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** ID estável — deve bater com desktopName / StartupWMClass / Icon. */
export const APP_DESKTOP_ID = 'louvorja-piano'

/**
 * Resolve caminho de ícone no filesystem real (não asar).
 * Linux/Windows precisam de path real para a barra do sistema.
 */
export function resolveAppIconPath() {
  const preferIco = process.platform === 'win32'
  const candidates = preferIco
    ? [
        process.resourcesPath ? path.join(process.resourcesPath, 'icon.ico') : null,
        path.join(__dirname, 'icon.ico'),
        path.join(__dirname, '../build/icon.ico'),
        path.join(__dirname, '../public/ico/favicon.ico'),
        process.resourcesPath ? path.join(process.resourcesPath, 'icon.png') : null,
        path.join(__dirname, 'icon.png'),
        path.join(__dirname, '../build/icon.png'),
        path.join(__dirname, '../public/ico/favicon.png'),
      ]
    : [
        process.resourcesPath ? path.join(process.resourcesPath, 'icon.png') : null,
        path.join(__dirname, 'icon.png'),
        path.join(__dirname, '../build/icon.png'),
        path.join(__dirname, '../public/ico/favicon.png'),
        process.resourcesPath ? path.join(process.resourcesPath, 'icon.ico') : null,
        path.join(__dirname, 'icon.ico'),
      ]

  for (const candidate of candidates.filter(Boolean)) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // ignore
    }
  }
  return null
}

export function loadAppIconImage() {
  const iconPath = resolveAppIconPath()
  if (!iconPath) return null
  const image = nativeImage.createFromPath(iconPath)
  return image.isEmpty() ? null : image
}

/**
 * Instala .desktop + PNG em ~/.local/share — necessário no GNOME/Zorin
 * para o ícone aparecer na barra enquanto o app está aberto.
 * @see https://askubuntu.com/questions/1557436/desktop-entry-taskbar-icon-issue
 */
export function ensureLinuxTaskbarIntegration() {
  if (process.platform !== 'linux') return

  const iconSource = resolveAppIconPath()
  if (!iconSource) {
    console.warn('[icon] nenhum PNG/ICO encontrado para a barra do sistema')
    return
  }

  const home = os.homedir()
  const appsDir = path.join(home, '.local/share/applications')
  const iconDir = path.join(home, '.local/share/icons/hicolor/512x512/apps')

  try {
    fs.mkdirSync(appsDir, { recursive: true })
    fs.mkdirSync(iconDir, { recursive: true })
  } catch (error) {
    console.error('[icon] falha ao criar pastas de integração', error)
    return
  }

  const iconDest = path.join(iconDir, `${APP_DESKTOP_ID}.png`)
  try {
    const pngSource = iconSource.endsWith('.png')
      ? iconSource
      : [
          process.resourcesPath ? path.join(process.resourcesPath, 'icon.png') : null,
          path.join(__dirname, 'icon.png'),
          path.join(__dirname, '../public/ico/favicon.png'),
          path.join(__dirname, '../build/icon.png'),
        ].find((candidate) => candidate && fs.existsSync(candidate))

    if (!pngSource) {
      console.warn('[icon] PNG não encontrado para instalar na barra')
      return
    }
    fs.copyFileSync(pngSource, iconDest)
  } catch (error) {
    console.error('[icon] falha ao copiar ícone', error)
    return
  }

  const appImage = process.env.APPIMAGE
  let execLine
  if (appImage) {
    execLine = `"${appImage}" %U`
  } else if (app.isPackaged) {
    execLine = `"${process.execPath}" %U`
  } else {
    // electron:dev — aponta o binário electron + pasta do app
    execLine = `"${process.execPath}" "${app.getAppPath()}" %U`
  }

  const desktopPath = path.join(appsDir, `${APP_DESKTOP_ID}.desktop`)
  const desktop = `[Desktop Entry]
Version=1.0
Type=Application
Name=LouvorJA - PIANO
Comment=LouvorJA - PIANO — aplicativo desktop para gerenciamento de culto
Exec=${execLine}
Icon=${APP_DESKTOP_ID}
Terminal=false
Categories=AudioVideo;
StartupWMClass=${APP_DESKTOP_ID}
StartupNotify=true
`

  try {
    fs.writeFileSync(desktopPath, desktop, 'utf8')
    fs.chmodSync(desktopPath, 0o755)
  } catch (error) {
    console.error('[icon] falha ao gravar .desktop', error)
    return
  }

  // Atualiza caches (best-effort — não bloqueia o boot)
  execFile(
    'gtk-update-icon-cache',
    ['-f', '-t', path.join(home, '.local/share/icons/hicolor')],
    () => {},
  )
  execFile('update-desktop-database', [appsDir], () => {})
  execFile('xdg-desktop-menu', ['forceupdate'], () => {})
}
