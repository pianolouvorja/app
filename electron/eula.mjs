import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import { readWorkspaceRecord, writeWorkspaceRecord } from "./workspace.mjs";

const CURRENT_EULA_VERSION = 1;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {null | ((locale: string) => Promise<0 | 1>)} */
let eulaPresenterOverride = null;
/** @type {null | NodeJS.Platform} */
let platformOverrideForTests = null;

function getPlatform() {
	return platformOverrideForTests ?? process.platform;
}

export function __setEulaPlatformForTests(platform) {
	platformOverrideForTests = platform;
}

/**
 * Hook de testes para substituir a janela visual do EULA.
 * Em produção permanece null.
 *
 * @param {null | ((locale: string) => Promise<0 | 1>)} fn
 */
export function __setEulaPresenterForTests(fn) {
	eulaPresenterOverride = fn;
}

/**
 * Verifica se o EULA foi aceito pelo usuário.
 * Lê o record 'eula' do workspace (arquivo .bin criptografado).
 * Checa nao so flag accepted mas tambem a versao — se a versao
 * do record for menor que CURRENT_EULA_VERSION, forca re-aceite.
 *
 * @returns {boolean} true se aceito na versao atual, false caso contrario.
 */
export function isEulaAccepted() {
	const record = readWorkspaceRecord("eula");
	if (!record) return false;
	if (record.accepted !== true) return false;
	if (!record.version || record.version < CURRENT_EULA_VERSION) return false;
	return true;
}

/**
 * Persiste a aceitação do EULA no workspace.
 * Grava record com flag accepted: true, versão e data.
 *
 * @returns {boolean} true se gravado com sucesso.
 */
export function acceptEula() {
	return writeWorkspaceRecord("eula", {
		accepted: true,
		version: CURRENT_EULA_VERSION,
		date: new Date().toISOString(),
	});
}

/**
 * Retorna o caminho base onde os arquivos EULA estão localizados.
 * Em dev: relativo ao cwd do projeto (docs/LEGAL/eula).
 * Em prod: relativo a app.getAppPath() (resources dentro do package).
 *
 * @returns {string} Caminho absoluto para o diretório eula.
 */
function getEulaDir() {
	try {
		return path.join(app.getAppPath(), "docs", "LEGAL", "eula");
	} catch {
		return path.resolve(process.cwd(), "docs", "LEGAL", "eula");
	}
}

/**
 * Lê o texto do EULA para um locale específico.
 *
 * @param {string} locale - Locale do EULA ('pt-BR', 'en', 'es').
 * @returns {string} Conteúdo do EULA como texto plano.
 */
export function getEulaText(locale) {
	const candidates = [
		path.join(getEulaDir(), `${locale}.txt`),
		path.join(getEulaDir(), "pt-BR.txt"),
	];

	let lastError = null;
	for (const filePath of candidates) {
		try {
			return readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
		} catch (error) {
			lastError = error;
		}
	}

	const detail =
		lastError instanceof Error ? lastError.message : String(lastError ?? "arquivo ausente");
	throw new Error(
		`Não foi possível carregar o EULA (${locale}). Verifique se docs/LEGAL/eula está no pacote. ${detail}`,
	);
}

function getEulaDialogLabels(locale) {
	const labels = {
		"pt-BR": {
			title: "EULA — LouvorJA",
			subtitle: "EULA — End User License Agreement",
			accept: "Aceitar",
			decline: "Recusar",
		},
		en: {
			title: "EULA — LouvorJA",
			subtitle: "End User License Agreement",
			accept: "Accept",
			decline: "Decline",
		},
		es: {
			title: "EULA — LouvorJA",
			subtitle: "Acuerdo de licencia de usuario final",
			accept: "Aceptar",
			decline: "Rechazar",
		},
	};
	return labels[locale] || labels["pt-BR"];
}

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function presentMacosEulaAcceptanceWindow(locale) {
	const eulaText = getEulaText(locale);
	const labels = getEulaDialogLabels(locale);

	return new Promise((resolve) => {
		const workArea = screen.getPrimaryDisplay().workAreaSize;
		const win = new BrowserWindow({
			width: Math.min(760, Math.max(420, workArea.width - 32)),
			height: Math.min(680, Math.max(360, workArea.height - 32)),
			minWidth: 400,
			minHeight: 320,
			center: true,
			show: false,
			resizable: true,
			maximizable: true,
			fullscreenable: false,
			autoHideMenuBar: true,
			backgroundColor: "#12121c",
			title: labels.title,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				sandbox: true,
				webSecurity: true,
				allowRunningInsecureContent: false,
				webviewTag: false,
				devTools: false,
			},
		});
		let settled = false;
		const finish = (choice) => {
			if (settled) return;
			settled = true;
			resolve(choice);
			if (!win.isDestroyed()) win.destroy();
		};
		win.webContents.on("will-navigate", (event, targetUrl) => {
			event.preventDefault();
			try {
				const target = new URL(targetUrl);
				if (target.protocol !== "louvorja-eula:") return;
				if (target.hostname === "accept") finish(0);
				if (target.hostname === "decline") finish(1);
			} catch {
				// Bloqueia qualquer navegação fora das ações locais.
			}
		});
		win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
		win.webContents.on("will-attach-webview", (event) => event.preventDefault());
		win.on("close", (event) => {
			if (!settled) {
				event.preventDefault();
				finish(1);
			}
		});
		win.on("closed", () => finish(1));
		win.once("ready-to-show", () => {
			win.show();
			win.focus();
		});
		const html = `<!doctype html><html lang="${escapeHtml(locale)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-src 'none'"><style>html,body{height:100%;margin:0}body{display:flex;flex-direction:column;color:#f5f5f7;background:#12121c;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{padding:24px 28px 14px;border-bottom:1px solid #343440}h1{margin:0 0 6px;color:#ffd200;font-size:22px}main{flex:1;min-height:0;overflow:auto;padding:22px 28px}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.55 inherit}footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 28px;border-top:1px solid #343440;background:#181822}a{padding:9px 18px;border-radius:7px;color:#f5f5f7;text-decoration:none;background:#3a3a46}.primary{color:#111;background:#ffd200;font-weight:600}</style></head><body><header><h1>${escapeHtml(labels.title)}</h1><p>${escapeHtml(labels.subtitle)}</p></header><main><pre>${escapeHtml(eulaText)}</pre></main><footer><a href="louvorja-eula://decline">${escapeHtml(labels.decline)}</a><a class="primary" href="louvorja-eula://accept">${escapeHtml(labels.accept)}</a></footer></body></html>`;
		void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => finish(1));
	});
}

/**
 * Abre janela rolável com o texto do EULA e botões fixos.
 * @param {string} locale
 * @returns {Promise<0 | 1>} 0 = Aceitar, 1 = Recusar
 */
export function presentEulaAcceptanceWindow(locale) {
	if (eulaPresenterOverride) {
		return eulaPresenterOverride(locale);
	}

	if (getPlatform() === "darwin") {
		return presentMacosEulaAcceptanceWindow(locale);
	}

	const eulaText = getEulaText(locale);
	const labels = getEulaDialogLabels(locale);

	return new Promise((resolve) => {
		const workArea = screen.getPrimaryDisplay().workAreaSize;
		const width = Math.min(720, Math.max(420, Math.floor(workArea.width * 0.85)));
		const height = Math.min(560, Math.max(360, Math.floor(workArea.height * 0.8)));

		const win = new BrowserWindow({
			width,
			height,
			minWidth: 400,
			minHeight: 320,
			center: true,
			show: false,
			resizable: true,
			maximizable: true,
			alwaysOnTop: true,
			autoHideMenuBar: true,
			backgroundColor: "#12121c",
			title: labels.title,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
				sandbox: false,
			},
		});

		const channel = `eula:decision:${win.id}`;
		let settled = false;

		const finish = (choice) => {
			if (settled) return;
			settled = true;
			ipcMain.removeListener(channel, onDecision);
			if (!win.isDestroyed()) {
				win.close();
			}
			resolve(choice);
		};

		const onDecision = (_event, accepted) => {
			finish(accepted ? 0 : 1);
		};

		ipcMain.once(channel, onDecision);

		win.on("closed", () => {
			// Fechar a janela (X) equivale a recusar — fluxo de confirmação segue.
			finish(1);
		});

		win.webContents.on("did-finish-load", () => {
			win.webContents.send("eula:init", {
				text: eulaText,
				labels,
				channel,
			});
			if (!win.isDestroyed()) {
				win.show();
				win.focus();
			}
		});

		void win.loadFile(path.join(__dirname, "eula-dialog.html"));
	});
}

/**
 * Exibe o dialog modal do EULA para o usuário.
 * Botão 0 = "Aceitar", Botão 1 = "Recusar".
 *
 * @param {string} locale - Locale do EULA ('pt-BR', 'en', 'es').
 * @returns {Promise<boolean>} true se aceitou, false se recusou.
 */
export async function showEulaDialog(locale) {
	const choice = await presentEulaAcceptanceWindow(locale);

	if (choice === 0) {
		acceptEula();
		return true;
	}

	return false;
}

/**
 * Orquestra a verificação do EULA no startup.
 * Se já aceito na versao atual, retorna true sem exibir dialog.
 * Se não aceito, exibe o dialog e retorna a decisão do usuário.
 *
 * @param {string} locale - Locale do EULA ('pt-BR', 'en', 'es').
 * @returns {Promise<boolean>} true se EULA está aceito, false caso contrário.
 */
export async function checkEulaAcceptance(locale) {
	if (isEulaAccepted()) {
		return true;
	}

	return showEulaDialog(locale);
}
