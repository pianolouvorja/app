import { BrowserWindow, session, ipcMain } from 'electron'

/**
 * YouTube Auth — login Google na session padrão do app (defaultSession),
 * para que o embed/player do YouTube herde a sessão Premium do usuário
 * (vídeos sem anúncios para assinantes).
 *
 * Fluxo: janela dedicada carrega accounts.google.com na MESMA session do
 * player. O usuário faz login uma vez; os cookies persistem no userData do
 * app e sobrevivem a restarts (B5). Nada de tokens em localStorage do
 * renderer — a sessão vive no cookie jar do Chromium (B6).
 */

const LOGIN_URL =
  'https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fwww.youtube.com%2Fsignin&hl=pt-BR'

/** @type {BrowserWindow | null} */
let loginWindow = null

/**
 * Consulta o estado da sessão YouTube SEM abrir janela: carrega a resposta
 * do player embed num frame offscreen via fetch da session (cookies inclusos)
 * e procura o indicador de login. Leve e sem UI.
 * @returns {Promise<{signedIn: boolean, premium: boolean | null}>}
 */
export async function getYoutubeAuthStatus() {
  try {
    // Detecção por cookie (instantânea, sem rede): sessão Google logada no
    // contexto do player = cookies SID/SAPISID em .youtube.com.
    // Nota: ses.fetch com redirect:manual trava no Electron — não usar.
    const ses = session.defaultSession
    const ytCookies = await ses.cookies.get({ domain: 'youtube.com' })
    const hasSession = ytCookies.some((c) => c.name === 'SID' || c.name === 'SAPISID')
    if (!hasSession) return { signedIn: false, premium: null }

    // Premium: página /premium diz "Você já tem o YouTube Premium" para
    // assinantes (mesma validação do P1). Rede com timeout curto.
    let premium = null
    try {
      const res = await Promise.race([
        ses.fetch('https://www.youtube.com/premium'),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ])
      const body = await res.text()
      premium = /já tem o YouTube Premium|already have YouTube Premium/i.test(body)
    } catch {
      premium = null // offline/timeout: mostra só "Conectado"
    }
    return { signedIn: true, premium }
  } catch {
    return { signedIn: false, premium: null }
  }
}

/**
 * Abre a janela de login do Google na session padrão.
 * @param {BrowserWindow | null} parent
 * @returns {Promise<{ok: boolean, signedIn: boolean}>}
 */
export function openYoutubeLogin(parent) {
  return new Promise((resolve) => {
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.focus()
      resolve({ ok: false, signedIn: false, reason: 'already-open' })
      return
    }

    loginWindow = new BrowserWindow({
      width: 560,
      height: 760,
      parent: parent ?? undefined,
      modal: Boolean(parent),
      title: 'Entrar com Google',
      autoHideMenuBar: true,
      backgroundColor: '#12121c',
      webPreferences: {
        // mesma session do player (defaultSession) — sem partition separada
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })
    // UA sem token "Electron" — o login do Google recusa UAs de automação
    // (ERR_FAILED) mantendo o resto do UA do runtime
    loginWindow.webContents.setUserAgent(
      loginWindow.webContents
        .getUserAgent()
        .replace(/\s*Electron\/[\d.]+/, ''),
    )

    let settled = false
    const finish = (payload) => {
      if (settled) return
      settled = true
      resolve(payload)
    }

    loginWindow.on('closed', () => {
      loginWindow = null
      // usuário fechou: checa se logou mesmo assim
      void getYoutubeAuthStatus().then((s) =>
        finish({ ok: s.signedIn, signedIn: s.signedIn }),
      )
    })

    // Se após login o Google redireciona de volta pro YouTube, o login deu certo
    loginWindow.webContents.on('did-navigate', (_e, url) => {
      if (/^https:\/\/(www\.)?youtube\.com\//.test(url)) {
        void getYoutubeAuthStatus().then((s) => {
          finish({ ok: s.signedIn, signedIn: s.signedIn })
          if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close()
        })
      }
    })

    loginWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
      // -3 (ABORTED) acontece em redirects do próprio fluxo Google — benigno
      console.error(`[yt-auth] did-fail-load ${code} ${desc} ${url}`)
      if (code !== -3 && loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close()
      }
    })

    void loginWindow.loadURL(LOGIN_URL).catch((err) => {
      console.error('[yt-auth] loadURL falhou', err)
      if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close()
    })
  })
}

/**
 * Limpa 100% dos cookies/storage de Google/YouTube da session (B4 — logout).
 * @returns {Promise<{ok: boolean}>}
 */
export async function logoutYoutube() {
  const ses = session.defaultSession
  await ses.clearStorageData({
    storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage'],
    quotas: [
      'https://youtube.com',
      'https://www.youtube.com',
      'https://accounts.youtube.com',
      'https://accounts.google.com',
      'https://google.com',
      'https://www.google.com',
    ],
  })
  return { ok: true }
}

/** Registra os handlers IPC yt-auth:* (chamado uma vez no boot do main). */
export function registerYoutubeAuthIpc() {
  ipcMain.handle('yt-auth:status', () => getYoutubeAuthStatus())
  ipcMain.handle('yt-auth:login', () => {
    return openYoutubeLogin(null)
  })
  ipcMain.handle('yt-auth:logout', () => logoutYoutube())
}
