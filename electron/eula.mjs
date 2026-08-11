import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import { readWorkspaceRecord, writeWorkspaceRecord } from "./workspace.mjs";

const CURRENT_EULA_VERSION = 1;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {null | ((locale: string) => Promise<0 | 1>)} */
let eulaPresenterOverride = null;

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

/**
 * Abre janela rolável com o texto do EULA e botões fixos.
 * @param {string} locale
 * @returns {Promise<0 | 1>} 0 = Aceitar, 1 = Recusar
 */
export function presentEulaAcceptanceWindow(locale) {
	if (eulaPresenterOverride) {
		return eulaPresenterOverride(locale);
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
