import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, screen, shell } from "electron";

import {
	APP_DESKTOP_ID,
	ensureLinuxTaskbarIntegration,
	loadAppIconImage,
	resolveAppIconPath,
} from "./app-icon.mjs";
import { APP_PRODUCT_NAME, APP_USER_DATA_DIR } from "./constants.mjs";
import { checkEulaAcceptance } from "./eula.mjs";
import { resolveAppLocale } from "./locale.mjs";
import { registerWorkspaceIpc } from "./ipc/register.mjs";
import { attachWindowStateEvents, registerWindowIpc } from "./ipc/window.mjs";
import { ensureWorkspaceDirectories } from "./paths.mjs";
import { registerLocalFileProtocol, registerLocalScheme } from "./protocol.mjs";
import { initUpdater } from "./updater.mjs";
import { loadWindowState, trackWindowState } from "./window-state.mjs";
import { registerYoutubeEmbedHeaders } from "./youtube-embed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(VITE_DEV_SERVER_URL);
const PRELOAD_PATH = path.join(__dirname, "preload.mjs");

registerLocalScheme();

/**
 * Linux: app name = WM_CLASS = StartupWMClass do .desktop (ícone na barra).
 * Título da janela continua sendo APP_PRODUCT_NAME.
 */
if (process.platform === "linux") {
	app.setName(APP_DESKTOP_ID);
	app.commandLine.appendSwitch("class", APP_DESKTOP_ID);
} else {
	app.setName(APP_PRODUCT_NAME);
}

app.setPath("userData", path.join(app.getPath("appData"), APP_USER_DATA_DIR));

if (process.platform === "win32") {
	app.setAppUserModelId("com.louvorja.piano");
}

/** Chromium não permite root sem sandbox (dev containers / CI) */
if (typeof process.getuid === "function" && process.getuid() === 0) {
	app.commandLine.appendSwitch("no-sandbox");
}

/** Permite autoplay com áudio nas janelas de projeção (YouTube). */
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
}

let mainWindow = null;
let splashWindow = null;

/**
 * Cria e exibe uma splash window imediatamente no startup.
 * Dá feedback visual ao usuário enquanto o app carrega.
 * Funciona em dev (via VITE_DEV_SERVER_URL) e em produção (via loadFile).
 */
function createSplash() {
	splashWindow = new BrowserWindow({
		width: 360,
		height: 240,
		frame: false,
		resizable: false,
		center: true,
		show: true,
		transparent: true,
		backgroundColor: "#00000000",
		hasShadow: true,
		skipTaskbar: true,
		menuBarVisible: false,
		autoHideMenuBar: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	const splashPath = path.join(__dirname, "splash.html");
	void splashWindow.loadFile(splashPath);

	splashWindow.on("closed", () => {
		splashWindow = null;
	});
}

function closeSplash() {
	if (splashWindow && !splashWindow.isDestroyed()) {
		splashWindow.close();
		splashWindow = null;
	}
}

function applyWindowIcon(win) {
	if (!win || win.isDestroyed()) return;
	const iconPath = resolveAppIconPath();
	const iconImage = loadAppIconImage();
	if (iconImage) {
		win.setIcon(iconImage);
	} else if (iconPath) {
		win.setIcon(iconPath);
	}
	if (process.platform === "win32" && iconPath) {
		try {
			win.setAppDetails({
				appId: "com.louvorja.piano",
				appIconPath: iconPath,
				appIconIndex: 0,
				relaunchDisplayName: APP_PRODUCT_NAME,
			});
		} catch (error) {
			console.warn("[icon] setAppDetails falhou", error);
		}
	}
}

function isProjectionPopupUrl(url) {
	try {
		const parsed = new URL(url);
		if (parsed.hash.startsWith("#/popup")) return true;
		const path = parsed.pathname.replace(/\/+$/, "");
		return path === "/popup" || path.endsWith("/popup");
	} catch {
		return (
			typeof url === "string" &&
			(url.includes("#/popup") || url.includes("/popup"))
		);
	}
}

/**
 * Extrai dicas de projeção do features (window.open) e da URL (mais confiável).
 * @param {string} url
 * @param {string} [features]
 */
function parseProjectionLaunchHints(url, features = '') {
  const featureText = typeof features === 'string' ? features : ''
  let fullscreen = featureText.includes('fullscreen=yes')
  let monitorId = null

  const monitorFromFeatures = featureText.match(/(?:^|,)\s*monitor=(\d+)/i)
  if (monitorFromFeatures) {
    monitorId = Number.parseInt(monitorFromFeatures[1], 10)
  }

  try {
    const parsed = new URL(url)
    const queryText = parsed.hash.includes('?')
      ? parsed.hash.slice(parsed.hash.indexOf('?') + 1)
      : parsed.search.startsWith('?')
        ? parsed.search.slice(1)
        : parsed.search
    const params = new URLSearchParams(queryText)
    if (params.get('fs') === '1' || params.get('fullscreen') === '1') {
      fullscreen = true
    }
    const monitorParam = params.get('monitorId') ?? params.get('monitor')
    if (monitorParam != null && monitorParam !== '') {
      const parsedId = Number.parseInt(monitorParam, 10)
      if (Number.isFinite(parsedId)) monitorId = parsedId
    }
  } catch {
    // ignore URL parse errors
  }

  return { fullscreen, monitorId }
}

/**
 * Opções sem chrome do SO (sem barra / minimizar / fechar), alinhado ao legado.
 * @param {string} url
 * @param {string} [features]
 */
function buildPopupWindowOptions(url, features = '') {
  const { fullscreen, monitorId } = parseProjectionLaunchHints(url, features)

  /** @type {import('electron').BrowserWindowConstructorOptions} */
  const windowConfig = {
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    // Sempre sem frame nas telas de projeção — evita barra e botões do SO
    frame: false,
    thickFrame: false,
    hasShadow: false,
    fullscreenable: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  }

  if (!fullscreen) {
    windowConfig.skipTaskbar = true
    return windowConfig
  }

  const displays = screen.getAllDisplays()
  let targetDisplay = null
  if (monitorId != null && Number.isFinite(monitorId)) {
    targetDisplay = displays.find((display) => display.id === monitorId) ?? null
  }

  // Sem monitor explícito: primário (openFullscreenOnPrimary). Não assumir 1º estendido.
  if (!targetDisplay) {
    targetDisplay = screen.getPrimaryDisplay()
  }

  windowConfig.x = targetDisplay.bounds.x
  windowConfig.y = targetDisplay.bounds.y
  windowConfig.width = targetDisplay.bounds.width
  windowConfig.height = targetDisplay.bounds.height
  windowConfig.resizable = false
  windowConfig.skipTaskbar = true

  return windowConfig
}

/**
 * Aplica fullscreen / bounds sem chrome após criar a janela (legado win32/linux/mac).
 * @param {import('electron').BrowserWindow} childWindow
 * @param {boolean} fullscreen
 */
function applyProjectionDisplayMode(childWindow, fullscreen) {
  if (!fullscreen || childWindow.isDestroyed()) return

  if (process.platform === 'win32') {
    const bounds = childWindow.getBounds()
    const display = screen.getDisplayMatching(bounds)
    childWindow.setFullScreen(false)
    childWindow.setBounds(display.bounds)
    childWindow.setAlwaysOnTop(true, 'screen-saver')
    return
  }

  childWindow.setFullScreen(true)
  if (process.platform === 'darwin') {
    childWindow.setSimpleFullScreen(true)
  }
  childWindow.setAlwaysOnTop(true, 'screen-saver')
}

function attachProjectionWindowHandlers(parentWindow) {
  /** @type {WeakMap<import('electron').BrowserWindow, boolean>} */
  const fullscreenByWindow = new WeakMap()

  parentWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    if (isProjectionPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: buildPopupWindowOptions(url, features),
      }
    }

    void shell.openExternal(url)
    return { action: 'deny' }
  })

  parentWindow.webContents.on('did-create-window', (childWindow, details) => {
    childWindow.webContents.setAudioMuted(false)
    applyWindowIcon(childWindow)

    const childUrl = details?.url ?? ''
    const isProjection = isProjectionPopupUrl(childUrl)
    const { fullscreen } = isProjection
      ? parseProjectionLaunchHints(childUrl, details?.features ?? '')
      : { fullscreen: !childWindow.isResizable() }

    if (isProjection) {
      // Reforça sem chrome mesmo se o Chromium tiver mesclado opções
      childWindow.setMenuBarVisibility(false)
      fullscreenByWindow.set(childWindow, fullscreen)
    }

    childWindow.once('ready-to-show', () => {
      if (childWindow.isDestroyed()) return
      childWindow.webContents.setAudioMuted(false)
      const shouldFullscreen = fullscreenByWindow.get(childWindow) ?? fullscreen
      applyProjectionDisplayMode(childWindow, shouldFullscreen)
      childWindow.show()
    })
  })
}

function createWindow(locale = 'pt-BR') {
	const iconPath = resolveAppIconPath();
	const windowState = loadWindowState();

	mainWindow = new BrowserWindow({
		...(typeof windowState.x === "number" ? { x: windowState.x } : {}),
		...(typeof windowState.y === "number" ? { y: windowState.y } : {}),
		width: windowState.width,
		height: windowState.height,
		minWidth: 1024,
		minHeight: 640,
		backgroundColor: "#12121c",
		title: APP_PRODUCT_NAME,
		show: false,
		frame: false,
		autoHideMenuBar: true,
		...(iconPath ? { icon: iconPath } : {}),
		webPreferences: {
			preload: PRELOAD_PATH,
			contextIsolation: true,
			nodeIntegration: false,
			// false: garante preload/IPC no AppImage empacotado (first-boot / splash)
			sandbox: false,
			spellcheck: false,
		},
	});

	applyWindowIcon(mainWindow);
	attachWindowStateEvents(mainWindow);
	trackWindowState(mainWindow, { isMaximized: windowState.isMaximized });

	mainWindow.on("page-title-updated", (event) => {
		event.preventDefault();
	});

	mainWindow.once("ready-to-show", () => {
		applyWindowIcon(mainWindow);
		if (windowState.isMaximized && mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.maximize();
		}
		mainWindow?.show();
		// Fecha o splash assim que a janela principal estiver visível
		closeSplash();
		// Reaplica após show — alguns WMs só pegam o ícone com a janela visível
		applyWindowIcon(mainWindow);
		if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === "1") {
			mainWindow?.webContents.openDevTools({ mode: "detach" });
		}
	});

	attachProjectionWindowHandlers(mainWindow);

	if (isDev && VITE_DEV_SERVER_URL) {
		const localeParam = `?lang=${locale}`;
		void mainWindow.loadURL(VITE_DEV_SERVER_URL + localeParam);
	} else {
		void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), { query: { lang: locale } });
	}

	// Timeout de segurança: se ready-to-show não disparar em 15s, mostra erro
	const loadTimeout = setTimeout(() => {
		if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
			console.error("[main] timeout: janela principal não carregou em 15s");
			closeSplash();
			dialog.showMessageBoxSync(mainWindow, {
				type: "error",
				title: "Erro ao iniciar",
				message: "O aplicativo demorou muito para iniciar.\n\nIsso pode indicar um problema de carregamento.\nCódigo do erro: TIMEOUT_15S",
				buttons: ["OK"],
			});
			mainWindow.destroy();
			mainWindow = null;
		}
	}, 15_000);

	mainWindow.once("ready-to-show", () => {
		clearTimeout(loadTimeout);
	});

	// Fallback: se a janela principal falhar ao carregar, mostra erro e fecha o splash
	mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
		console.error(`[main] falha ao carregar: code=${errorCode} desc=${errorDescription}`);
		closeSplash();
		if (!mainWindow || mainWindow.isDestroyed()) return;
		dialog.showMessageBoxSync(mainWindow, {
			type: "error",
			title: "Erro ao iniciar",
			message: `Não foi possível carregar o aplicativo.\n\nCódigo: ${errorCode}\n${errorDescription || ""}`.trim(),
			buttons: ["OK"],
		});
		mainWindow.destroy();
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

app.whenReady().then(async () => {
	ensureLinuxTaskbarIntegration();
	ensureWorkspaceDirectories();

	// Splash screen — feedback visual imediato antes de qualquer coisa
	createSplash();

	try {
		// EULA: detecta idioma do SO, fallback pt-BR
		const locale = resolveAppLocale(app.getLocale());

		if (!(await checkEulaAcceptance(locale))) {
			closeSplash();
			app.quit();
			return;
		}

		registerWorkspaceIpc();
		registerWindowIpc(() => mainWindow);
		registerLocalFileProtocol();
		registerYoutubeEmbedHeaders();
		createWindow(locale);
	} catch (error) {
		console.error("[main] falha no startup", error);
		closeSplash();
		const message =
			error instanceof Error ? error.message : String(error ?? "erro desconhecido");
		dialog.showErrorBox(
			"Erro ao iniciar",
			`Não foi possível iniciar o aplicativo.\n\n${message}`,
		);
		app.quit();
		return;
	}

	// Auto-update: check 3s após janela criada (não bloqueia startup)
	initUpdater(() => mainWindow);
	setTimeout(() => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("updater:check-start");
		}
	}, 3000);
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow(locale);
		}
	});
});

app.on("second-instance", () => {
	if (!mainWindow) return;
	if (mainWindow.isMinimized()) mainWindow.restore();
	mainWindow.focus();
});

app.on("window-all-closed", () => {
	// window-all-closed pode disparar quando o splash fecha mas a main
	// ainda está carregando. Só saímos se mainWindow já existiu ou se
	// não há intenção de criar janela (eula recusado, erro fatal, etc).
	if (process.platform !== "darwin") {
		app.quit();
	}
});
