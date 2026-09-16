// @vitest-environment jsdom

import {
	createLocalCollection,
	listLocalCollections,
	listLocalMusics,
} from "@modules/media/services/local-custom-store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	listCommunityCollections,
	saveCommunityCopy,
} from "../community-catalog";

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
	} as unknown as Response;
}

const COLLECTION = {
	id: 12,
	name: "Culto Jovem",
	description: "desc",
	coverUrl: null,
	authorName: "Maria",
	musicsCount: 2,
	updatedAt: null,
};

describe("saveCommunityCopy (cópia local read-only → editável)", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		localStorage.clear();
	});

	it("cria cópia local com as faixas da original, só com GET (B4/B5)", async () => {
		const calls: Array<{ url: string; method: string }> = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init?: RequestInit) => {
				calls.push({
					url: String(url),
					method: (init?.method as string) ?? "GET",
				});
				if (String(url).endsWith("/collections/12/musics")) {
					return jsonResponse({
						data: [
							{ id_music: 1, name: "Hino A", official_music_id: 555 },
							{ id_music: 2, name: "Hino B", official_music_id: null },
						],
					});
				}
				return jsonResponse({ data: [] });
			}),
		);

		const localId = await saveCommunityCopy(COLLECTION);
		expect(localId).not.toBeNull();
		expect(localId).toSatisfy((n: number) => n < 0); // id local (negativo)
		const copy = listLocalMusics(localId as number);
		expect(copy.map((m) => m.name)).toEqual(["Hino A", "Hino B"]);
		expect(copy[0]?.officialMusicId).toBe(555);
		// zero escritas remotas: nenhum POST/PUT/PATCH/DELETE
		expect(calls.filter((c) => !["GET", "HEAD"].includes(c.method))).toEqual(
			[],
		);
		// a coletânea da comunidade não mudou (não há como — só lemos)
		expect(calls.every((c) => c.method === "GET")).toBe(true);
	});

	it("falha ao buscar faixas → null, sem criar cópia parcial", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ error: "x" }, false)),
		);
		const before = listLocalCollections().length;
		const localId = await saveCommunityCopy(COLLECTION);
		expect(localId).toBeNull();
		expect(listLocalCollections().length).toBe(before);
	});

	it("exceção de rede → null", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("down");
			}),
		);
		expect(await saveCommunityCopy(COLLECTION)).toBeNull();
	});

	it("listCommunityCollections continua não afetando localStorage", async () => {
		createLocalCollection("pre-existente");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ data: [] })),
		);
		await listCommunityCollections();
		expect(listLocalCollections().length).toBe(1);
	});

	it("response !ok na busca de faixas → null (lado erro)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ error: "x" }, false)),
		);
		expect(await saveCommunityCopy(COLLECTION)).toBeNull();
	});

	it("payload sem array → null; description null não quebra (lado null)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (String(url).endsWith("/collections/12/musics")) {
					return jsonResponse({ nope: true });
				}
				return jsonResponse({ data: [] });
			}),
		);
		expect(
			await saveCommunityCopy({ ...COLLECTION, description: null }),
		).toBeNull();
	});

	it("copia com description null funciona quando ha faixas", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (String(url).endsWith("/collections/12/musics")) {
					return jsonResponse({
						data: [
							{ id_music: 1, name: "A", official_music_id: 0 },
							{ id_music: 2 },
						],
					});
				}
				return jsonResponse({ data: [] });
			}),
		);
		const localId = await saveCommunityCopy({
			...COLLECTION,
			description: null,
		});
		expect(localId).not.toBeNull();
		expect(listLocalMusics(localId as number)).toHaveLength(2);
	});
});
