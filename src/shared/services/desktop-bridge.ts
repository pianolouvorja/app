import type { LouvorJaBridge } from '@shared/types/desktop-bridge'

export function getDesktopBridge(): LouvorJaBridge | null {
  if (typeof window === 'undefined') return null
  return window.louvorja ?? null
}

/** True no shell Electron (preload) ou pelo userAgent se a bridge ainda não subiu. */
export function isElectronShell(): boolean {
  if (typeof window === 'undefined') return false
  if (getDesktopBridge()?.isElectron) return true
  return /Electron/i.test(navigator.userAgent)
}

export function isDesktopApp(): boolean {
  return Boolean(getDesktopBridge()?.isElectron)
}
