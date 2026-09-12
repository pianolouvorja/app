import { ipcMain, session } from 'electron'
import { ElectronBlocker } from '@cliqz/adblocker-electron'

/**
 * Bloqueador de anúncios para o player YouTube (opt-in, experimental).
 *
 * Mesma engine do Brave (adblock-rust via @cliqz/adblocker-electron),
 * plugada no webRequest da session padrão — o mesmo gancho do fix de
 * Referer (youtube-embed.mjs).
 *
 * Regra de produto: DESLIGADO por padrão. Só ativa quando o usuário liga
 * "Reduzir anúncios (experimental)" nas Configurações. Premium auth é o
 * caminho primário/recomendado; isto é fallback para contas free.
 */

/** @type {import('@cliqz/adblocker-electron').ElectronBlocker | null} */
let blocker = null

const GOOGLE_MEDIA_HOSTS = /^(www\.youtube\.com|youtube\.com|.*\.googlevideo\.com|.*\.ytimg\.com)$/i

export async function enableAdblocker() {
  if (blocker) return { ok: true, already: true }
  blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
  // escopo restrito: só requests do ecossistema YouTube — não filtra o
  // resto do app nem a API do catálogo
  blocker.enableBlockingInSession(session.defaultSession)
  return { ok: true }
}

export function disableAdblocker() {
  if (!blocker) return { ok: true, already: true }
  try {
    blocker.disableBlockingInSession(session.defaultSession)
  } finally {
    blocker = null
  }
  return { ok: true }
}

export function isAdblockerEnabled() {
  return blocker !== null
}

export async function setAdblocker(enabled) {
  return enabled ? enableAdblocker() : disableAdblocker()
}

/** Registra IPC yt-adblock:* */
export function registerAdblockerIpc(persist, restore) {
  // persist(estado) — callback pra gravar o setting; restore() — lê no boot
  ipcRegister(persist, restore)
}

function ipcRegister(persist, restore) {
  ipcMain.handle('yt-adblock:status', () => ({ enabled: isAdblockerEnabled() }))
  ipcMain.handle('yt-adblock:set', async (_e, enabled) => {
    const r = await setAdblocker(Boolean(enabled))
    if (r.ok && persist) persist(Boolean(enabled))
    return r
  })
  // boot: restaura último estado escolhido
  void (async () => {
    try {
      const saved = restore ? await restore() : false
      if (saved) await enableAdblocker()
    } catch {
      /* boot segue sem adblock */
    }
  })()
}
