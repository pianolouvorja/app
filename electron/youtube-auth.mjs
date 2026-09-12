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
    // O endpoint /premium responde diferente para assinantes; usamos o
    // redirect do account menu como sinal de login (barato e estável):
    const ses = session.defaultSession
    const result = await ses.fetch(
      'https://www.youtube.com/signin?feature=sign_in_button&next=/',
      { redirect: 'manual' },
    )
    // Sem login: redireciona para accounts.google.com. Logado: fica no YouTube.
    const location = result.headers.get('location') ?? ''
    const signedIn = !/accounts\.google\.com/.test(location)

    // Premium: só é detectável de forma confiável via página /premium
    let premium = null
    if (signedIn) {
      const res = await ses.fetch('https://www.youtube.com/premium', {
        redirect: 'manual',
      })
      const body = typeof res.text === 'function' ? await res.text() : ''
      premium = /já tem o YouTube Premium|already have YouTube Premium/i.test(body)
    }
    return { signedIn, premium }
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
      width: 520,
      height: 700,
      parent: parent ?? undefined,
      modal: Boolean(parent),
      title: 'Entrar com Google',
      autoHideMenuBar: true,
      backgroundColor: '#12121c',
      webPreferences: {
        // mesma session do player (defaultSession) — sem partition separada
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

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

    void loginWindow.loadURL(LOGIN_URL)
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
