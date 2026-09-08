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

/**
 * Windows desktop (qualquer versão/arch: 10, 11, Server, x86/x64/arm64).
 * Electron reporta sempre `win32` como process.platform no Windows.
 */
export function isWindowsDesktop(): boolean {
  if (typeof window === 'undefined') return false
  const bridge = getDesktopBridge()
  const platform = bridge?.platform
  if (platform === 'win32') return true
  // Fallbacks: UA clássico + Client Hints (Chrome/Electron recentes).
  if (/Windows|Win64|Win32|WOW64/i.test(navigator.userAgent)) return true
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  if (uaData?.platform && /Win/i.test(uaData.platform)) return true
  return false
}
