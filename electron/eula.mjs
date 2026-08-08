import { readFileSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, dialog, screen } from "electron";
import { readWorkspaceRecord, writeWorkspaceRecord } from "./workspace.mjs";

const CURRENT_EULA_VERSION = 1;

const EULA_COPY = {
	"pt-BR": {
		heading: "Contrato de Licença de Usuário Final",
		intro: "Leia os termos abaixo para continuar.",
		accept: "Aceitar",
		decline: "Recusar",
		declineTitle: "Tem certeza?",
		declineMessage:
			"Se você não aceitar os termos, não poderá utilizar o aplicativo. Deseja realmente recusar?",
		confirmDecline: "Sim, recusar",
		goBack: "Voltar",
		saveErrorTitle: "Não foi possível salvar",
		saveErrorMessage:
			"O aceite dos termos não pôde ser salvo. Verifique as permissões da pasta do aplicativo e tente novamente.",
	},
	en: {
		heading: "End-User License Agreement",
		intro: "Please read the terms below to continue.",
		accept: "Accept",
		decline: "Decline",
		declineTitle: "Are you sure?",
		declineMessage:
			"If you do not accept the terms, you will not be able to use the application. Do you really want to decline?",
		confirmDecline: "Yes, decline",
		goBack: "Go back",
		saveErrorTitle: "Unable to save",
		saveErrorMessage:
			"Your acceptance could not be saved. Check the application's folder permissions and try again.",
	},
	es: {
		heading: "Contrato de Licencia de Usuario Final",
		intro: "Lea los términos a continuación para continuar.",
		accept: "Aceptar",
		decline: "Rechazar",
		declineTitle: "¿Está seguro?",
		declineMessage:
			"Si no acepta los términos, no podrá utilizar la aplicación. ¿Realmente desea rechazar?",
		confirmDecline: "Sí, rechazar",
		goBack: "Volver",
		saveErrorTitle: "No se pudo guardar",
		saveErrorMessage:
			"No se pudo guardar la aceptación. Compruebe los permisos de la carpeta de la aplicación e inténtelo de nuevo.",
	},
};

/**
 * Verifica se o EULA foi aceito pelo usuário na versão atual.
 *
 * @returns {boolean}
 */
export function isEulaAccepted() {
	const record = readWorkspaceRecord("eula");
	if (!record) return false;
	if (record.accepted !== true) return false;
	if (!record.version || record.version < CURRENT_EULA_VERSION) return false;
	return true;
}

/**
 * Persiste a aceitação do EULA.
 *
 * @returns {boolean}
 */
export function acceptEula() {
	return writeWorkspaceRecord("eula", {
		accepted: true,
		version: CURRENT_EULA_VERSION,
		date: new Date().toISOString(),
	});
}

function getEulaDir() {
	try {
		return path.join(app.getAppPath(), "docs", "LEGAL", "eula");
	} catch {
		return path.resolve(process.cwd(), "docs", "LEGAL", "eula");
	}
}

/**
 * @param {string} locale
 * @returns {string}
 */
export function getEulaText(locale) {
	const filePath = path.join(getEulaDir(), `${locale}.txt`);
	return readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
}

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function getEulaWindowBounds() {
	const { width: workWidth, height: workHeight } =
		screen.getPrimaryDisplay().workAreaSize;
	const width = Math.min(760, Math.max(360, workWidth - 32));
	const height = Math.min(680, Math.max(360, workHeight - 32));

	return {
		width,
		height,
		minWidth: Math.min(540, width),
		minHeight: Math.min(420, height),
	};
}

function buildEulaHtml(locale, copy, eulaText) {
	return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-src 'none'">
<title>EULA — LouvorJA</title>
<style>
html, body { height: 100%; margin: 0; }
body { display: flex; flex-direction: column; color: #f5f5f7; background: #12121c; font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
header { flex: none; padding: 24px 28px 14px; border-bottom: 1px solid #343440; }
h1 { margin: 0 0 6px; color: #ffd200; font-size: 22px; }
p { margin: 0; color: #b9b9c5; }
main { flex: 1; min-height: 0; overflow: auto; padding: 22px 28px; }
pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; font: 13px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
footer { flex: none; display: flex; justify-content: flex-end; gap: 10px; padding: 16px 28px; border-top: 1px solid #343440; background: #181822; }
a { padding: 9px 18px; border-radius: 7px; color: #f5f5f7; text-decoration: none; background: #3a3a46; }
a:focus-visible { outline: 2px solid #ffd200; outline-offset: 2px; }
a.primary { color: #111; background: #ffd200; font-weight: 600; }
</style>
</head>
<body>
<header><h1>${escapeHtml(copy.heading)}</h1><p>${escapeHtml(copy.intro)}</p></header>
<main><pre>${escapeHtml(eulaText)}</pre></main>
<footer>
  <a href="louvorja-eula://decline">${escapeHtml(copy.decline)}</a>
  <a class="primary" href="louvorja-eula://accept">${escapeHtml(copy.accept)}</a>
</footer>
</body>
</html>`;
}

/**
 * Confirma uma recusa. O texto é curto, portanto o diálogo nativo é adequado.
 *
 * @param {BrowserWindow} parentWindow
 * @param {string} locale
 * @returns {Promise<boolean>} true quando a recusa foi confirmada.
 */
export async function confirmDecline(parentWindow, locale) {
	const copy = EULA_COPY[locale] || EULA_COPY["pt-BR"];
	const { response } = await dialog.showMessageBox(parentWindow, {
		type: "warning",
		title: copy.declineTitle,
		message: copy.declineMessage,
		buttons: [copy.goBack, copy.confirmDecline],
		defaultId: 0,
		cancelId: 0,
		noLink: true,
	});

	return response === 1;
}

/**
 * Exibe o EULA em uma janela local, redimensionável e com texto rolável.
 *
 * @param {BrowserWindow | null} parentWindow
 * @param {string} locale
 * @returns {Promise<boolean>}
 */
export function showEulaDialog(parentWindow, locale) {
	const copy = EULA_COPY[locale] || EULA_COPY["pt-BR"];
	const eulaText = getEulaText(locale);
	const hasParent = parentWindow && !parentWindow.isDestroyed();

	return new Promise((resolve) => {
		const eulaWindow = new BrowserWindow({
			...(hasParent ? { parent: parentWindow } : {}),
			...getEulaWindowBounds(),
			resizable: true,
			maximizable: true,
			fullscreenable: false,
			show: false,
			autoHideMenuBar: true,
			backgroundColor: "#12121c",
			title: "EULA — LouvorJA",
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
				webSecurity: true,
				allowRunningInsecureContent: false,
				webviewTag: false,
				devTools: false,
				navigateOnDragDrop: false,
			},
		});

		let settled = false;
		let handlingAction = false;

		const finish = (accepted) => {
			if (settled) return;
			settled = true;
			resolve(accepted);
			if (!eulaWindow.isDestroyed()) eulaWindow.destroy();
		};

		const showSaveError = async () => {
			if (eulaWindow.isDestroyed()) return;
			try {
				await dialog.showMessageBox(eulaWindow, {
					type: "error",
					title: copy.saveErrorTitle,
					message: copy.saveErrorMessage,
					buttons: ["OK"],
					defaultId: 0,
					cancelId: 0,
				});
			} catch (error) {
				console.error("[eula] não foi possível mostrar o erro de gravação", error);
			}
		};

		const handleAccept = async () => {
			if (handlingAction || settled) return;
			handlingAction = true;
			try {
				if (acceptEula()) {
					finish(true);
				} else {
					await showSaveError();
				}
			} catch (error) {
				console.error("[eula] não foi possível salvar o aceite", error);
				await showSaveError();
			} finally {
				handlingAction = false;
			}
		};

		const handleDecline = async () => {
			if (handlingAction || settled) return;
			handlingAction = true;
			try {
				if (await confirmDecline(eulaWindow, locale)) finish(false);
			} catch (error) {
				console.error("[eula] não foi possível confirmar a recusa", error);
			} finally {
				handlingAction = false;
			}
		};

		eulaWindow.webContents.on("will-navigate", (event, targetUrl) => {
			event.preventDefault();

			try {
				const target = new URL(targetUrl);
				if (target.protocol !== "louvorja-eula:") return;
				if (target.hostname === "accept") void handleAccept();
				if (target.hostname === "decline") void handleDecline();
			} catch {
				// Qualquer navegação diferente das duas ações locais é bloqueada.
			}
		});

		eulaWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
		eulaWindow.webContents.on("will-attach-webview", (event) => {
			event.preventDefault();
		});

		eulaWindow.on("close", (event) => {
			if (settled) return;
			event.preventDefault();
			void handleDecline();
		});
		eulaWindow.on("closed", () => finish(false));
		eulaWindow.once("ready-to-show", () => {
			eulaWindow.center();
			eulaWindow.show();
			eulaWindow.focus();
		});

		const html = buildEulaHtml(locale, copy, eulaText);
		eulaWindow
			.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
			.catch((error) => {
				console.error("[eula] não foi possível carregar a janela", error);
				finish(false);
			});
	});
}

/**
 * @param {BrowserWindow | null} parentWindow
 * @param {string} locale
 * @returns {Promise<boolean>}
 */
export async function checkEulaAcceptance(parentWindow, locale) {
	if (isEulaAccepted()) return true;
	return showEulaDialog(parentWindow, locale);
}
