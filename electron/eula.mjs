import { readFileSync } from "node:fs";
import path from "node:path";
import { app, dialog } from "electron";
import { readWorkspaceRecord, writeWorkspaceRecord } from "./workspace.mjs";

const CURRENT_EULA_VERSION = 1;

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
	const filePath = path.join(getEulaDir(), `${locale}.txt`);
	return readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
}

/**
 * Exibe o dialog modal do EULA para o usuário.
 * Botão 0 = "Aceitar", Botão 1 = "Recusar".
 *
 * @param {string} locale - Locale do EULA ('pt-BR', 'en', 'es').
 * @returns {boolean} true se aceitou, false se recusou.
 */
export function showEulaDialog(locale) {
	const eulaText = getEulaText(locale);

	const choice = dialog.showMessageBoxSync({
		type: "question",
		title: "EULA — LouvorJA",
		message: eulaText,
		buttons: ["Aceitar", "Recusar"],
		defaultId: 0,
		cancelId: 1,
		noLink: true,
	});

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
 * @returns {boolean} true se EULA está aceito, false caso contrário.
 */
export function checkEulaAcceptance(locale) {
	if (isEulaAccepted()) {
		return true;
	}

	return showEulaDialog(locale);
}
