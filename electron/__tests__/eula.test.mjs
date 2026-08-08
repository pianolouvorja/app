import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock workspace.mjs — isEulaAccepted depende de readWorkspaceRecord
vi.mock("../workspace.mjs", () => ({
	readWorkspaceRecord: vi.fn(),
	writeWorkspaceRecord: vi.fn(),
}));

// Mock electron — dialog e app
vi.mock("electron", () => ({
	app: {
		getAppPath: vi.fn(() => {
			throw new Error("test");
		}),
	},
	dialog: {
		showMessageBoxSync: vi.fn(),
	},
}));

import { dialog } from "electron";
// Importar após o mock
import {
	acceptEula,
	checkEulaAcceptance,
	getEulaText,
	isEulaAccepted,
	showEulaDialog,
} from "../eula.mjs";
import { readWorkspaceRecord, writeWorkspaceRecord } from "../workspace.mjs";

describe("isEulaAccepted", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna true quando record existe com accepted: true e versao atual", () => {
		readWorkspaceRecord.mockReturnValue({
			accepted: true,
			version: 1,
			date: "2026-08-07",
		});
		expect(isEulaAccepted()).toBe(true);
	});

	it("retorna false quando record e null (primeira execucao)", () => {
		readWorkspaceRecord.mockReturnValue(null);
		expect(isEulaAccepted()).toBe(false);
	});

	// --- Task 3: testes de borda ---

	it("retorna false quando record tem accepted: false explicitamente", () => {
		readWorkspaceRecord.mockReturnValue({ accepted: false, version: 1 });
		expect(isEulaAccepted()).toBe(false);
	});

	it("retorna false quando record existe mas nao tem chave accepted", () => {
		readWorkspaceRecord.mockReturnValue({ version: 1, date: "2026-08-07" });
		expect(isEulaAccepted()).toBe(false);
	});

	it('retorna false quando accepted tem valor nao-booleano (string "true")', () => {
		readWorkspaceRecord.mockReturnValue({ accepted: "true", version: 1 });
		expect(isEulaAccepted()).toBe(false);
	});

	// --- WARNING #3: versao do EULA ---

	it("retorna false quando versao do record e menor que CURRENT_EULA_VERSION", () => {
		readWorkspaceRecord.mockReturnValue({ accepted: true, version: 0 });
		expect(isEulaAccepted()).toBe(false);
	});

	it("retorna false quando record nao tem campo version", () => {
		readWorkspaceRecord.mockReturnValue({ accepted: true, date: "2026-01-01" });
		expect(isEulaAccepted()).toBe(false);
	});
});

describe("acceptEula", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("escreve record com accepted: true e version atual via writeWorkspaceRecord", () => {
		writeWorkspaceRecord.mockReturnValue(true);
		acceptEula();
		expect(writeWorkspaceRecord).toHaveBeenCalledWith(
			"eula",
			expect.objectContaining({
				accepted: true,
				version: 1,
			}),
		);
	});

	it("retorna true quando writeWorkspaceRecord tem sucesso", () => {
		writeWorkspaceRecord.mockReturnValue(true);
		expect(acceptEula()).toBe(true);
	});
});

describe("getEulaText", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("le arquivo pt-BR.txt e retorna conteudo como string", () => {
		const text = getEulaText("pt-BR");
		expect(typeof text).toBe("string");
		expect(text.length).toBeGreaterThan(0);
	});

	it("le arquivo en.txt e retorna conteudo como string", () => {
		const text = getEulaText("en");
		expect(typeof text).toBe("string");
		expect(text.length).toBeGreaterThan(0);
	});

	it("le arquivo es.txt e retorna conteudo como string", () => {
		const text = getEulaText("es");
		expect(typeof text).toBe("string");
		expect(text.length).toBeGreaterThan(0);
	});
});

describe("showEulaDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('retorna true e chama acceptEula quando usuario clica "Aceitar" (response=0)', () => {
		writeWorkspaceRecord.mockReturnValue(true);
		dialog.showMessageBoxSync.mockReturnValue(0); // 0 = Aceitar

		const result = showEulaDialog("pt-BR");
		expect(dialog.showMessageBoxSync).toHaveBeenCalledTimes(1);
		expect(writeWorkspaceRecord).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('retorna false quando usuario recusa EULA e confirma recusa no dialog duplo', () => {
		// 1a chamada: EULA dialog → Recusar (1)
		// 2a chamada: confirm dialog → Sim, recusar (1)
		dialog.showMessageBoxSync
			.mockReturnValueOnce(1) // EULA: Recusar
			.mockReturnValueOnce(1); // Confirm: Sim, recusar

		const result = showEulaDialog("pt-BR");
		expect(dialog.showMessageBoxSync).toHaveBeenCalledTimes(2);
		expect(writeWorkspaceRecord).not.toHaveBeenCalled();
		expect(result).toBe(false);
	});

	it("re-exibe EULA quando usuario clica Voltar no dialog de confirmacao e depois aceita", () => {
		// 1a: EULA → Recusar (1)
		// 2a: Confirm → Voltar (0)
		// 3a: EULA re-exibido → Aceitar (0)
		writeWorkspaceRecord.mockReturnValue(true);
		dialog.showMessageBoxSync
			.mockReturnValueOnce(1) // EULA: Recusar
			.mockReturnValueOnce(0) // Confirm: Voltar
			.mockReturnValueOnce(0); // EULA re-exibido: Aceitar

		const result = showEulaDialog("pt-BR");
		expect(dialog.showMessageBoxSync).toHaveBeenCalledTimes(3);
		expect(writeWorkspaceRecord).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("passa o texto do EULA do locale correto para o dialog", () => {
		dialog.showMessageBoxSync.mockReturnValue(0);
		writeWorkspaceRecord.mockReturnValue(true);

		showEulaDialog("en");
		const callArgs = dialog.showMessageBoxSync.mock.calls[0][0];
		expect(callArgs.message).toContain("Louvor");
	});

	it("dialog de confirmacao usa locale pt-BR", () => {
		dialog.showMessageBoxSync
			.mockReturnValueOnce(1) // EULA: Recusar
			.mockReturnValueOnce(1); // Confirm: Sim, recusar

		showEulaDialog("pt-BR");
		const confirmArgs = dialog.showMessageBoxSync.mock.calls[1][0];
		expect(confirmArgs.title).toContain("certeza");
		expect(confirmArgs.buttons).toContain("Sim, recusar");
	});

	it("dialog de confirmacao usa locale en", () => {
		dialog.showMessageBoxSync
			.mockReturnValueOnce(1) // EULA: Recusar
			.mockReturnValueOnce(1); // Confirm: Yes, decline

		showEulaDialog("en");
		const confirmArgs = dialog.showMessageBoxSync.mock.calls[1][0];
		expect(confirmArgs.title).toContain("sure");
		expect(confirmArgs.buttons).toContain("Yes, decline");
	});
});

describe("checkEulaAcceptance", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna true sem mostrar dialog quando EULA ja foi aceito na versao atual", () => {
		readWorkspaceRecord.mockReturnValue({ accepted: true, version: 1 });
		writeWorkspaceRecord.mockReturnValue(true);

		const result = checkEulaAcceptance("pt-BR");
		expect(dialog.showMessageBoxSync).not.toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("mostra dialog quando versao do record e anterior", () => {
		readWorkspaceRecord.mockReturnValue({ accepted: true, version: 0 });
		writeWorkspaceRecord.mockReturnValue(true);
		dialog.showMessageBoxSync.mockReturnValue(0); // Aceitar

		const result = checkEulaAcceptance("pt-BR");
		expect(dialog.showMessageBoxSync).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("mostra dialog e retorna true quando usuario aceita (primeira execucao)", () => {
		readWorkspaceRecord.mockReturnValue(null);
		writeWorkspaceRecord.mockReturnValue(true);
		dialog.showMessageBoxSync.mockReturnValue(0);

		const result = checkEulaAcceptance("pt-BR");
		expect(dialog.showMessageBoxSync).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("mostra dialog e retorna false quando usuario recusa e confirma recusa", () => {
		readWorkspaceRecord.mockReturnValue(null);
		dialog.showMessageBoxSync
			.mockReturnValueOnce(1) // EULA: Recusar
			.mockReturnValueOnce(1); // Confirm: Sim, recusar

		const result = checkEulaAcceptance("pt-BR");
		expect(dialog.showMessageBoxSync).toHaveBeenCalled();
		expect(writeWorkspaceRecord).not.toHaveBeenCalled();
		expect(result).toBe(false);
	});
});
