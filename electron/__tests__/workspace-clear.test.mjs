import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	resetWorkspaceDirectories: vi.fn(),
	getWorkspacePaths: vi.fn(() => ({
		root: "/workspace",
		sysdata: "/workspace/.sysdata",
		media: "/workspace/Media",
		covers: "/workspace/Media/covers",
		music: "/workspace/Media/music",
		images: "/workspace/Media/images",
		tempDatabase: "/workspace/database.db",
		downloadCompleteFlag: "/workspace/.download-complete",
	})),
}));

vi.mock("node:fs", () => ({
	existsSync: mocks.existsSync,
	mkdirSync: vi.fn(),
	unlinkSync: vi.fn(),
	writeFileSync: mocks.writeFileSync,
	readFileSync: mocks.readFileSync,
	statSync: vi.fn(),
}));

vi.mock("electron", () => ({
	net: { request: vi.fn() },
}));

vi.mock("basic-ftp", () => ({
	Client: class Client {},
}));

vi.mock("../crypto.mjs", () => ({
	obfuscateText: vi.fn(() => "registro-eula-ofuscado"),
	revealText: vi.fn(() => '{"accepted":true}'),
}));

vi.mock("../ftp.mjs", () => ({
	getFtpParams: vi.fn(),
}));

vi.mock("../catalog-extractor.mjs", () => ({
	CatalogExtractor: class CatalogExtractor {},
}));

vi.mock("../paths.mjs", () => ({
	ensureWorkspaceDirectories: vi.fn(),
	getWorkspacePaths: mocks.getWorkspacePaths,
	resetWorkspaceDirectories: mocks.resetWorkspaceDirectories,
	resolveMediaDirectory: vi.fn(),
}));

import { clearWorkspaceData } from "../workspace.mjs";

describe("clearWorkspaceData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.readFileSync.mockReturnValue("fake-encrypted-content");
	});

	it("preserva eula.bin ao recriar o workspace", () => {
		mocks.existsSync.mockImplementation((filePath) =>
			String(filePath).endsWith("/eula.bin"),
		);

		expect(clearWorkspaceData()).toBe(true);
		expect(mocks.readFileSync).toHaveBeenCalledWith(
			"/workspace/.sysdata/eula.bin",
			"utf8",
		);
		expect(mocks.resetWorkspaceDirectories).toHaveBeenCalledOnce();
		expect(mocks.writeFileSync).toHaveBeenCalledWith(
			"/workspace/.sysdata/eula.bin",
			"registro-eula-ofuscado",
			"utf8",
		);
		expect(
			mocks.resetWorkspaceDirectories.mock.invocationCallOrder[0],
		).toBeLessThan(mocks.writeFileSync.mock.invocationCallOrder[0]);
	});

	it("não cria registro legal quando ainda não existe", () => {
		mocks.existsSync.mockReturnValue(false);

		expect(clearWorkspaceData()).toBe(true);
		expect(mocks.resetWorkspaceDirectories).toHaveBeenCalledOnce();
		expect(mocks.writeFileSync).not.toHaveBeenCalled();
	});
});
