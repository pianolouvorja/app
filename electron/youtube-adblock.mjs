import { ElectronBlocker } from "@cliqz/adblocker-electron";
import { ipcMain, session } from "electron";
import { registerYoutubeEmbedHeaders } from "./youtube-embed.mjs";

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
let blocker = null;

export async function enableAdblocker() {
	if (blocker) return { ok: true, already: true };
	blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
	/**
	 * Fix app#177 (Windows, Ezequias 13/09): com o blocker cru, "não abre vídeo
	 * de jeito nenhum" — só funcionava desligando o adblock. Causa: a lib registra
	 * webRequest em <all_urls> E injeta cosmetic filters (preload script em todo
	 * webContents) + CSP em todo frame, o que mata o embed do YouTube.
	 * AQUI: só network filters (bloqueio de requests de anúncio) — sem CSS/DOM
	 * injection, sem CSP, sem mutation observer.
	 */
	const cfg = blocker.config;
	cfg.loadCosmeticFilters = false;
	cfg.loadExtendedSelectors = false;
	cfg.loadGenericCosmeticsFilters = false;
	cfg.loadCSPFilters = false;
	cfg.enableMutationObserver = false;
	cfg.enableHtmlFiltering = false;
	cfg.enablePushInjectionsOnNavigationEvents = false;
	// escopo de efeito: defaultSession (o embed roda nela). O disable desta
	// lib limpa TODOS os webRequest listeners da session — re-registramos o
	// fix de Referer logo abaixo, senão o embed perde o header (Error 153).
	blocker.enableBlockingInSession(session.defaultSession);
	registerYoutubeEmbedHeaders();
	return { ok: true };
}

export function disableAdblocker() {
	if (!blocker) return { ok: true, already: true };
	try {
		blocker.disableBlockingInSession(session.defaultSession);
	} finally {
		blocker = null;
		// onBeforeRequest(null)/onHeadersReceived(null) da lib limpa o listener
		// do fix de Referer também — restaura.
		registerYoutubeEmbedHeaders();
	}
	return { ok: true };
}

export function isAdblockerEnabled() {
	return blocker !== null;
}

export async function setAdblocker(enabled) {
	return enabled ? enableAdblocker() : disableAdblocker();
}

/** Registra IPC yt-adblock:* */
export function registerAdblockerIpc(persist, restore) {
	// persist(estado) — callback pra gravar o setting; restore() — lê no boot
	ipcRegister(persist, restore);
}

function ipcRegister(persist, restore) {
	ipcMain.handle("yt-adblock:status", () => ({
		enabled: isAdblockerEnabled(),
	}));
	ipcMain.handle("yt-adblock:set", async (_e, enabled) => {
		const r = await setAdblocker(Boolean(enabled));
		if (r.ok && persist) persist(Boolean(enabled));
		return r;
	});
	// boot: restaura último estado escolhido
	void (async () => {
		try {
			const saved = restore ? await restore() : false;
			if (saved) await enableAdblocker();
		} catch {
			/* boot segue sem adblock */
		}
	})();
}
