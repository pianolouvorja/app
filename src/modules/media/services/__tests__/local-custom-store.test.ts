// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
	createLocalCollection,
	createLocalLyric,
	createLocalMusic,
	deleteLocalCollection,
	deleteLocalLyric,
	deleteLocalMusic,
	getLocalMusic,
	isLocalId,
	listLocalCollections,
	listLocalMusics,
	updateLocalCollection,
	updateLocalLyric,
	updateLocalMusic,
} from "../local-custom-store";

describe("local-custom-store (coletâneas sem auth — ids negativos)", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("ids locais são negativos e distintos dos ids da API (positivos)", () => {
		expect(isLocalId(-1)).toBe(true);
		expect(isLocalId(1)).toBe(false);
		expect(isLocalId(2_000_001)).toBe(false);
		expect(isLocalId(null)).toBe(false);
	});

	it("cria coletânea + música + estrofe local", () => {
		const c = createLocalCollection("Minha coletânea");
		expect(c.id).toBeLessThan(0);
		const m = createLocalMusic(c.id, {
			name: "Hino X",
			lyric: "primeira estrofe",
		});
		expect(m.id).toBeLessThan(0);
		expect(m.collectionId).toBe(c.id);
		expect(m.lyrics).toHaveLength(1);
		expect(listLocalCollections()).toHaveLength(1);
		expect(listLocalMusics(c.id)).toHaveLength(1);
	});

	it("update de coletânea, música e estrofe persiste", () => {
		const c = createLocalCollection("antes");
		updateLocalCollection(c.id, { name: "depois" });
		expect(listLocalCollections()[0]?.name).toBe("depois");

		const m = createLocalMusic(c.id, { name: "a" });
		updateLocalMusic(m.id, { name: "b", audioBase64: "QUJD" });
		const stored = getLocalMusic(m.id);
		expect(stored?.name).toBe("b");
		expect(stored?.audioBase64).toBe("QUJD");

		const l = createLocalLyric(m.id, { lyric: "x" });
		updateLocalLyric(l.id, { lyric: "y" });
		expect(getLocalMusic(m.id)?.lyrics[0]?.lyric).toBe("y");
	});

	it("delete coletânea remove músicas junto; delete música/estrofe isolado", () => {
		const c = createLocalCollection("c");
		const m = createLocalMusic(c.id, { name: "m" });
		const l = createLocalLyric(m.id, { lyric: "l" });

		expect(deleteLocalLyric(l.id)).toBe(true);
		expect(getLocalMusic(m.id)?.lyrics).toHaveLength(0);

		expect(deleteLocalMusic(m.id)).toBe(true);
		expect(listLocalMusics(c.id)).toHaveLength(0);

		expect(deleteLocalCollection(c.id)).toBe(true);
		expect(listLocalCollections()).toHaveLength(0);
	});

	it("estado persiste entre leituras (localStorage)", () => {
		createLocalCollection("persistente");
		// segunda leitura vem do localStorage — mesma instância de dados
		expect(listLocalCollections()).toHaveLength(1);
	});
});
