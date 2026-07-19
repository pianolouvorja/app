#!/usr/bin/env node
/**
 * Migração visual: classes MDI → Tabler Icons (ti).
 * Uso único — pode ser removido após a migração.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname
const EXTS = new Set(['.vue', '.ts', '.js', '.css', '.scss', '.html', '.md'])

/** @type {Record<string, string>} */
const ICON_MAP = {
  'mdi-account-circle': 'ti-user-circle',
  'mdi-account-group-outline': 'ti-users',
  'mdi-account-voice': 'ti-microphone',
  'mdi-album': 'ti-disc',
  'mdi-align-vertical-bottom': 'ti-layout-align-bottom',
  'mdi-align-vertical-center': 'ti-layout-align-middle',
  'mdi-align-vertical-top': 'ti-layout-align-top',
  'mdi-animation-outline': 'ti-keyframes',
  'mdi-animation': 'ti-keyframes',
  'mdi-arrow-collapse': 'ti-arrows-minimize',
  'mdi-arrow-expand': 'ti-arrows-maximize',
  'mdi-arrow-left': 'ti-arrow-left',
  'mdi-arrow-top-right': 'ti-arrow-up-right',
  'mdi-auto-fix': 'ti-sparkles',
  'mdi-book-music': 'ti-book',
  'mdi-book-open-page-variant': 'ti-book-2',
  'mdi-book-open-variant': 'ti-book',
  'mdi-bullhorn-outline': 'ti-speakerphone',
  'mdi-calendar-clock': 'ti-calendar-time',
  'mdi-check': 'ti-check',
  'mdi-chevron-down': 'ti-chevron-down',
  'mdi-chevron-left': 'ti-chevron-left',
  'mdi-chevron-right': 'ti-chevron-right',
  'mdi-clipboard-text-outline': 'ti-clipboard-text',
  'mdi-clock-outline': 'ti-clock',
  'mdi-close-circle-multiple': 'ti-circles-relation',
  'mdi-close-circle': 'ti-circle-x',
  'mdi-close': 'ti-x',
  'mdi-cloud-download': 'ti-cloud-download',
  'mdi-cloud-upload-outline': 'ti-cloud-upload',
  'mdi-cog': 'ti-settings',
  'mdi-content-copy': 'ti-copy',
  'mdi-content-save': 'ti-device-floppy',
  'mdi-delete-outline': 'ti-trash',
  'mdi-delete': 'ti-trash',
  'mdi-desktop-mac': 'ti-device-desktop',
  'mdi-dice-5': 'ti-dice',
  'mdi-download': 'ti-download',
  'mdi-drag-vertical': 'ti-grip-vertical',
  'mdi-draw': 'ti-pencil',
  'mdi-eraser': 'ti-eraser',
  'mdi-eyedropper': 'ti-color-picker',
  'mdi-file-multiple-outline': 'ti-files',
  'mdi-file-pdf-box': 'ti-file-type-pdf',
  'mdi-file-powerpoint-box': 'ti-file-type-ppt',
  'mdi-file-upload-outline': 'ti-upload',
  'mdi-folder-open': 'ti-folder-open',
  'mdi-format-color-fill': 'ti-paint',
  'mdi-format-color-text': 'ti-typography',
  'mdi-format-list-bulleted': 'ti-list',
  'mdi-format-list-numbered': 'ti-list-numbers',
  'mdi-format-text-variant': 'ti-letter-case',
  'mdi-format-text': 'ti-text-size',
  'mdi-fullscreen': 'ti-maximize',
  'mdi-hammer-wrench': 'ti-tool',
  'mdi-hands-pray': 'ti-pray',
  'mdi-help': 'ti-help',
  'mdi-history': 'ti-history',
  'mdi-home': 'ti-home',
  'mdi-image-outline': 'ti-photo',
  'mdi-information-outline': 'ti-info-circle',
  'mdi-library': 'ti-books',
  'mdi-loading': 'ti-loader-2',
  'mdi-lock-open-variant': 'ti-lock-open',
  'mdi-lock': 'ti-lock',
  'mdi-magnify-scan': 'ti-zoom-scan',
  'mdi-magnify': 'ti-search',
  'mdi-minus': 'ti-minus',
  'mdi-monitor-dashboard': 'ti-layout-dashboard',
  'mdi-monitor-multiple': 'ti-devices',
  'mdi-monitor-off': 'ti-device-desktop-off',
  'mdi-monitor-share': 'ti-screen-share',
  'mdi-monitor': 'ti-device-desktop',
  'mdi-music-box-multiple': 'ti-playlist',
  'mdi-music-note': 'ti-music',
  'mdi-music': 'ti-music',
  'mdi-palette-outline': 'ti-palette',
  'mdi-palette': 'ti-palette',
  'mdi-pause-circle': 'ti-player-pause',
  'mdi-pause': 'ti-player-pause',
  'mdi-pencil': 'ti-pencil',
  'mdi-piano': 'ti-piano',
  'mdi-play-circle-outline': 'ti-player-play',
  'mdi-play-circle': 'ti-player-play',
  'mdi-play': 'ti-player-play',
  'mdi-playlist-plus': 'ti-playlist-add',
  'mdi-plus': 'ti-plus',
  'mdi-presentation-play': 'ti-presentation',
  'mdi-projector-screen': 'ti-projector',
  'mdi-refresh': 'ti-refresh',
  'mdi-restore': 'ti-restore',
  'mdi-run-fast': 'ti-run',
  'mdi-run': 'ti-run',
  'mdi-skip-next': 'ti-player-skip-forward',
  'mdi-skip-previous': 'ti-player-skip-back',
  'mdi-slideshow': 'ti-presentation',
  'mdi-star': 'ti-star',
  'mdi-stop': 'ti-player-stop',
  'mdi-tag': 'ti-tag',
  'mdi-text-box-outline': 'ti-file-text',
  'mdi-text': 'ti-text-caption',
  'mdi-ticket-confirmation': 'ti-ticket',
  'mdi-timer-cog-outline': 'ti-clock-cog',
  'mdi-timer-outline': 'ti-clock',
  'mdi-timer-sand': 'ti-hourglass',
  'mdi-timer': 'ti-clock-hour-4',
  'mdi-tune': 'ti-adjustments',
  'mdi-undo': 'ti-arrow-back-up',
  'mdi-video-outline': 'ti-video',
  'mdi-volume-high': 'ti-volume',
  'mdi-volume-off': 'ti-volume-off',
  'mdi-walk': 'ti-walk',
  'mdi-weather-night': 'ti-moon',
  'mdi-web': 'ti-world',
  'mdi-white-balance-sunny': 'ti-sun',
  'mdi-youtube': 'ti-brand-youtube',
}

const sortedKeys = Object.keys(ICON_MAP).sort((a, b) => b.length - a.length)

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'dist-electron' || name === '.git') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (EXTS.has(extname(name))) out.push(full)
  }
  return out
}

function transform(content) {
  let next = content
  for (const from of sortedKeys) {
    next = next.split(from).join(ICON_MAP[from])
  }
  // Base class mdi → ti (HTML/attrs)
  next = next.replace(/\bclass="mdi\b/g, 'class="ti')
  next = next.replace(/\bclass='mdi\b/g, "class='ti")
  // CSS selectors .mdi → .ti (avoid already-migrated .ti-*)
  next = next.replace(/\.mdi(?![a-z0-9-])/g, '.ti')
  // Comments / docs
  next = next.replace(/Classe MDI,/g, 'Classe Tabler,')
  next = next.replace(/\bMDI\b/g, 'Tabler')
  next = next.replace(/\bmdi\b/g, 'ti')
  return next
}

const files = walk(join(ROOT, 'src')).concat(walk(join(ROOT, 'docs')).filter(() => true))
let changed = 0
const unmapped = new Set()

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  if (!raw.includes('mdi')) continue
  const leftover = raw.match(/mdi-[a-z0-9-]+/g) || []
  for (const icon of leftover) {
    if (!ICON_MAP[icon]) unmapped.add(icon)
  }
  const next = transform(raw)
  if (next !== raw) {
    writeFileSync(file, next)
    changed++
    console.log('updated', file.replace(ROOT, ''))
  }
}

console.log(`\nDone. Files changed: ${changed}`)
if (unmapped.size) {
  console.error('Unmapped icons:', [...unmapped].sort().join(', '))
  process.exitCode = 1
}
