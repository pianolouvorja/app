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
	return readFileSync(filePath, "utf-8");
}

/**
 * Exibe o dialog modal do EULA para o usuário.
 * Botão 0 = "Aceitar", Botão 1 = "Recusar".
 * Se o usuário recusar, exibe um segundo dialog de confirmação.
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

	// Confirmacao dupla ao recusar
	return confirmDecline(locale);
}

/**
 * Exibe um dialog de confirmação quando o usuário recusa o EULA.
 * Se confirmar a recusa, retorna false (app fecha).
 * Se cancelar, re-exibe o dialog do EULA.
 *
 * @param {string} locale - Locale do EULA.
 * @returns {boolean} true se voltou e aceitou, false se confirmou recusa.
 */
function confirmDecline(locale) {
	const messages = {
		"pt-BR": {
			title: "Tem certeza?",
			message: "Se você não aceitar os termos, não poderá utilizar o aplicativo. Deseja realmente recusar?",
			confirm: "Sim, recusar",
			cancel: "Voltar",
		},
		en: {
			title: "Are you sure?",
			message: "If you do not accept the terms, you will not be able to use the application. Do you really want to decline?",
			confirm: "Yes, decline",
			cancel: "Go back",
		},
		es: {
			title: "¿Está seguro?",
			message: "Si no acepta los términos, no podrá utilizar la aplicación. ¿Realmente desea rechazar?",
			confirm: "Sí, rechazar",
			cancel: "Volver",
		},
	};

	const msg = messages[locale] || messages["pt-BR"];

	const confirmChoice = dialog.showMessageBoxSync({
		type: "warning",
		title: msg.title,
		message: msg.message,
		buttons: [msg.cancel, msg.confirm],
		defaultId: 0,
		cancelId: 0,
		noLink: true,
	});

	// 0 = Voltar — re-exibe o EULA
	if (confirmChoice === 0) {
		return showEulaDialog(locale);
	}

	// 1 = Confirmar recusa
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
