// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockShowSaveFilePicker, mockShowOpenFilePicker } = vi.hoisted(() => ({
	mockShowSaveFilePicker: vi.fn(),
	mockShowOpenFilePicker: vi.fn(),
}));

vi.mock("@shared/services/desktop-bridge", () => ({
	isDesktopApp: vi.fn(() => false),
	getDesktopBridge: vi.fn(() => null),
}));

import { exportLouvorjaFile, importLouvorjaFile } from "../louvorja-file";
import { encodeLouvorjaPackage } from "../louvorja-package";

function fakeWritable() {
	const chunks: BlobPart[] = [];
	return {
		write: vi.fn(async (chunk: BlobPart) => chunks.push(chunk)),
		close: vi.fn(async () => undefined),
		_chunks: chunks,
	};
}

function fakeFileHandle(text: string) {
	return {
		getFile: vi.fn(async () => ({ text: () => Promise.resolve(text) })),
	};
}

afterEach(() => {
	vi.clearAllMocks();
	delete (window as unknown as Record<string, unknown>).showSaveFilePicker;
	delete (window as unknown as Record<string, unknown>).showOpenFilePicker;
});

describe("exportLouvorjaFile (browser)", () => {
	it("escreve pacote via File System Access API", async () => {
		const writable = fakeWritable();
		mockShowSaveFilePicker.mockResolvedValue({
			createWritable: vi.fn(async () => writable),
		});
		(window as unknown as Record<string, unknown>).showSaveFilePicker =
			mockShowSaveFilePicker;

		const raw = encodeLouvorjaPackage({
			schema: 1,
			entities: {},
			appVersion: "1.17.5",
			platform: "web",
		});
		const ok = await exportLouvorjaFile(raw);
		expect(ok).toBe(true);
		expect(mockShowSaveFilePicker).toHaveBeenCalledTimes(1);
		expect(writable.write).toHaveBeenCalledTimes(1);
	});

	it("retorna false quando usuário cancela", async () => {
		mockShowSaveFilePicker.mockRejectedValue(
			new DOMException("cancel", "AbortError"),
		);
		(window as unknown as Record<string, unknown>).showSaveFilePicker =
			mockShowSaveFilePicker;

		const ok = await exportLouvorjaFile("{}");
		expect(ok).toBe(false);
	});
});

describe("importLouvorjaFile (browser)", () => {
	it("lê arquivo via File System Access API", async () => {
		const raw = encodeLouvorjaPackage({ schema: 1, entities: {} });
		mockShowOpenFilePicker.mockResolvedValue([fakeFileHandle(raw)]);
		(window as unknown as Record<string, unknown>).showOpenFilePicker =
			mockShowOpenFilePicker;

		const result = await importLouvorjaFile();
		expect(result).toBe(raw);
	});

	it("retorna null quando cancela", async () => {
		mockShowOpenFilePicker.mockRejectedValue(
			new DOMException("cancel", "AbortError"),
		);
		(window as unknown as Record<string, unknown>).showOpenFilePicker =
			mockShowOpenFilePicker;

		const result = await importLouvorjaFile();
		expect(result).toBeNull();
	});
});
