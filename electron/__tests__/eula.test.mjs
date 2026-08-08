import { beforeEach, describe, expect, it, vi } from "vitest";

const electronMocks = vi.hoisted(() => ({
	windows: [],
	showMessageBox: vi.fn(),
}));

vi.mock("../workspace.mjs", () => ({
	readWorkspaceRecord: vi.fn(),
	writeWorkspaceRecord: vi.fn(),
}));

vi.mock("electron", () => {
	class BrowserWindow {
		constructor(options) {
			this.options = options;
			this.destroyed = false;
			this.events = new Map();
			this.webContents = {
				events: new Map(),
				on: vi.fn((name, callback) => {
					this.webContents.events.set(name, callback);
				}),
				setWindowOpenHandler: vi.fn(),
			};
			this.center = vi.fn();
			this.show = vi.fn();
			this.focus = vi.fn();
			this.isDestroyed = vi.fn(() => this.destroyed);
			this.destroy = vi.fn(() => {
				this.destroyed = true;
				this.events.get("closed")?.();
			});
			this.loadURL = vi.fn(async (url) => {
				this.url = url;
				this.events.get("ready-to-show")?.();
			});
			electronMocks.windows.push(this);
		}

		on(name, callback) {
			this.events.set(name, callback);
		}

		once(name, callback) {
			this.events.set(name, callback);
		}
	}

	return {
		app: {
			getAppPath: vi.fn(() => {
				throw new Error("test");
			}),
		},
		BrowserWindow,
		dialog: {
			showMessageBox: electronMocks.showMessageBox,
		},
		screen: {
			getPrimaryDisplay: vi.fn(() => ({
				workAreaSize: { width: 1440, height: 900 },
			})),
		},
	};
});

import { dialog } from "electron";
import {
	acceptEula,
	checkEulaAcceptance,
	confirmDecline,
	getEulaText,
	isEulaAccepted,
	showEulaDialog,
} from "../eula.mjs";
import { readWorkspaceRecord, writeWorkspaceRecord } from "../workspace.mjs";

function latestWindow() {
	return electronMocks.windows.at(-1);
}

function triggerAction(window, action) {
	const event = { preventDefault: vi.fn() };
	window.webContents.events.get("will-navigate")(
		event,
		`louvorja-eula://${action}`,
	);
	return event;
}

async function flushPromises() {
	await Promise.resolve();
	await Promise.resolve();
}

describe("EULA", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		electronMocks.windows.length = 0;
		electronMocks.showMessageBox.mockResolvedValue({ response: 0 });
		writeWorkspaceRecord.mockReturnValue(true);
	});

	it("reconhece somente o aceite da versão atual", () => {
		readWorkspaceRecord.mockReturnValue({ accepted: true, version: 1 });
		expect(isEulaAccepted()).toBe(true);

		readWorkspaceRecord.mockReturnValue({ accepted: true, version: 0 });
		expect(isEulaAccepted()).toBe(false);

		readWorkspaceRecord.mockReturnValue({ accepted: "true", version: 1 });
		expect(isEulaAccepted()).toBe(false);
	});

	it("persiste aceite com versão e data", () => {
		expect(acceptEula()).toBe(true);
		expect(writeWorkspaceRecord).toHaveBeenCalledWith(
			"eula",
			expect.objectContaining({ accepted: true, version: 1 }),
		);
	});

	it.each(["pt-BR", "en", "es"])("lê o texto do locale %s", (locale) => {
		const text = getEulaText(locale);
		expect(text.length).toBeGreaterThan(0);
	});

	it("abre uma janela local, redimensionável e com sandbox", () => {
		const result = showEulaDialog(null, "pt-BR");
		const window = latestWindow();

		expect(window.options).toMatchObject({
			resizable: true,
			show: false,
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
				devTools: false,
			},
		});
		expect(decodeURIComponent(window.url)).toContain("overflow: auto");
		expect(decodeURIComponent(window.url)).toContain("Contrato de Licença");

		triggerAction(window, "accept");
		return expect(result).resolves.toBe(true);
	});

	it("aceita somente quando a persistência tem sucesso", async () => {
		writeWorkspaceRecord.mockReturnValueOnce(false).mockReturnValueOnce(true);
		const result = showEulaDialog(null, "pt-BR");
		const window = latestWindow();

		triggerAction(window, "accept");
		await flushPromises();
		expect(dialog.showMessageBox).toHaveBeenCalledWith(
			window,
			expect.objectContaining({ type: "error" }),
		);
		expect(window.destroy).not.toHaveBeenCalled();

		triggerAction(window, "accept");
		await expect(result).resolves.toBe(true);
	});

	it("confirma a recusa com um diálogo nativo curto", async () => {
		electronMocks.showMessageBox.mockResolvedValue({ response: 1 });
		const result = showEulaDialog(null, "pt-BR");
		const window = latestWindow();

		triggerAction(window, "decline");
		await expect(result).resolves.toBe(false);
		expect(dialog.showMessageBox).toHaveBeenCalledWith(
			window,
			expect.objectContaining({
				message: expect.stringContaining("não aceitar"),
			}),
		);
	});

	it("mantém o EULA aberto quando o usuário volta da confirmação", async () => {
		electronMocks.showMessageBox.mockResolvedValue({ response: 0 });
		const result = showEulaDialog(null, "en");
		const window = latestWindow();

		triggerAction(window, "decline");
		await flushPromises();
		expect(window.destroy).not.toHaveBeenCalled();

		triggerAction(window, "accept");
		await expect(result).resolves.toBe(true);
	});

	it("mantém o EULA aberto se a confirmação nativa falhar", async () => {
		electronMocks.showMessageBox.mockRejectedValueOnce(
			new Error("falha no diálogo"),
		);
		const result = showEulaDialog(null, "pt-BR");
		const window = latestWindow();

		triggerAction(window, "decline");
		await flushPromises();
		expect(window.destroy).not.toHaveBeenCalled();

		triggerAction(window, "accept");
		await expect(result).resolves.toBe(true);
	});

	it("bloqueia navegações que não são ações locais", () => {
		const result = showEulaDialog(null, "pt-BR");
		const window = latestWindow();
		const event = { preventDefault: vi.fn() };

		window.webContents.events.get("will-navigate")(event, "https://example.com");
		expect(event.preventDefault).toHaveBeenCalled();

		triggerAction(window, "accept");
		return expect(result).resolves.toBe(true);
	});

	it("retorna a decisão da confirmação curta", async () => {
		electronMocks.showMessageBox.mockResolvedValueOnce({ response: 1 });
		await expect(confirmDecline(latestWindow(), "en")).resolves.toBe(true);

		electronMocks.showMessageBox.mockResolvedValueOnce({ response: 0 });
		await expect(confirmDecline(latestWindow(), "en")).resolves.toBe(false);
	});

	it("não abre janela quando o EULA já foi aceito", async () => {
		readWorkspaceRecord.mockReturnValue({ accepted: true, version: 1 });
		await expect(checkEulaAcceptance(null, "pt-BR")).resolves.toBe(true);
		expect(electronMocks.windows).toHaveLength(0);
	});

	it("abre a janela no primeiro uso e continua após o aceite", async () => {
		readWorkspaceRecord.mockReturnValue(null);
		const result = checkEulaAcceptance(null, "pt-BR");
		triggerAction(latestWindow(), "accept");
		await expect(result).resolves.toBe(true);
	});
});
