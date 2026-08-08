import { powerSaveBlocker } from "electron";

const state = {
	/** @type {number | null} */
	blockerId: null,
};

/**
 * Impede o PC de dormir/desligar a tela enquanto o app está aberto.
 * Usa prevent-display-sleep para manter a tela ativa durante projeção.
 * Idempotente — não cria outro blocker se já existe um ativo.
 *
 * @returns {boolean} true se ativo.
 */
export function enablePowerBlocker() {
	if (state.blockerId !== null && powerSaveBlocker.isStarted(state.blockerId)) return true;

	state.blockerId = powerSaveBlocker.start("prevent-display-sleep");
	return true;
}

/**
 * Libera o blocker e permite o PC dormir normalmente.
 * Idempotente — não faz nada se não há blocker ativo.
 */
export function disablePowerBlocker() {
	if (state.blockerId !== null && powerSaveBlocker.isStarted(state.blockerId)) {
		powerSaveBlocker.stop(state.blockerId);
	}
	state.blockerId = null;
}

/**
 * Verifica se o power blocker está ativo.
 *
 * @returns {boolean} true se ativo.
 */
export function isPowerBlockerActive() {
	return state.blockerId !== null && powerSaveBlocker.isStarted(state.blockerId);
}

/** Reseta o estado interno (para testes). */
export function _resetPowerBlocker() {
	state.blockerId = null;
}
