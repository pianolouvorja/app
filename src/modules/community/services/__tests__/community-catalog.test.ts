import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CommunityCollectionSummary,
	listCommunityCollectionsPage,
} from "../community-catalog";

const PUBLIC_ROW = {
	id_collection: 12,
	name: "Culto Jovem",
	description: "Louvor para culto de jovens",
	cover_url: "https://api.example/capa.jpg",
	owner_id: 7,
	author_name: "Maria",
	musics_count: 9,
	updated_at: "2026-09-10 10:00:00",
};

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
	} as unknown as Response;
}

describe("listCommunityCollections", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("retorna somente coletâneas públicas com campos mapeados (B2/B3)", async () => {
		const fetchMock = vi.fn(async () => jsonResponse({ data: [PUBLIC_ROW] }));
		vi.stubGlobal("fetch", fetchMock);

		const { items: result } = await listCommunityCollectionsPage(1);

		expect(result).toHaveLength(1);
		const item = result[0] as CommunityCollectionSummary;
		expect(item).toEqual({
			id: 12,
			name: "Culto Jovem",
			description: "Louvor para culto de jovens",
			coverUrl: "https://api.example/capa.jpg",
			authorName: "Maria",
			musicsCount: 9,
			updatedAt: "2026-09-10 10:00:00",
		});
		// NUNCA expõe email (B8): payload não carrega campo de email algum
		expect(JSON.stringify(item)).not.toContain("@");
	});

	it("ordena por updated_at DESC (B6)", async () => {
		const rows = [
			{ ...PUBLIC_ROW, id_collection: 1, updated_at: "2026-09-01 08:00:00" },
			{ ...PUBLIC_ROW, id_collection: 2, updated_at: "2026-09-15 08:00:00" },
			{ ...PUBLIC_ROW, id_collection: 3, updated_at: "2026-09-08 08:00:00" },
		];
		// API devolve fora de ordem de propósito — serviço garante a ordenação
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ data: [rows[1], rows[0], rows[2]] })),
		);

		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result.map((c) => c.id)).toEqual([2, 3, 1]);
	});

	it("usuário deslogado lista normalmente (B7) — sem header de auth quando sem sessão", async () => {
		let capturedHeaders: Record<string, string> | undefined;
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
			return jsonResponse({ data: [] });
		});
		vi.stubGlobal("fetch", fetchMock);

		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result).toEqual([]);
		// Sem sessão: nenhum header de autorização é enviado
		expect(
			capturedHeaders?.Authorization ?? capturedHeaders?.authorization,
		).toBeUndefined();
	});

	it("falha da API → lista vazia, nunca lança (resiliência)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ error: "boom" }, false)),
		);
		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result).toEqual([]);
	});

	it("exceção de rede → lista vazia, nunca lança", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("network down");
			}),
		);
		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result).toEqual([]);
	});

	it("payload sem data → lista vazia", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({})),
		);
		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result).toEqual([]);
	});

	it("asString cobre os dois lados: string vazia → null, não-string → null", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					data: [
						{
							id_collection: 9,
							name: "   ",
							description: 42,
							cover_url: "",
							author_name: false,
							musics_count: "abc",
							updated_at: "lixo",
						},
					],
				}),
			),
		);
		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result[0]).toEqual({
			id: 9,
			name: "",
			description: null,
			coverUrl: null,
			authorName: null,
			musicsCount: 0,
			updatedAt: "lixo",
		});
	});

	it("ordenacao com updatedAt null vai pro fim (sortByRecentFirst lado null)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					data: [
						{ id_collection: 2, name: "B", updated_at: null },
						{ id_collection: 3, name: "C", updated_at: null },
						{ id_collection: 1, name: "A", updated_at: "2026-09-15 08:00:00" },
					],
				}),
			),
		);
		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result.map((c) => c.id)).toEqual([1, 2, 3]);
	});

	it("campos opcionais ausentes → defaults seguros (B3)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					data: [{ id_collection: 5, name: "Só Nome" }],
				}),
			),
		);
		const { items: result } = await listCommunityCollectionsPage(1);
		expect(result[0]).toEqual({
			id: 5,
			name: "Só Nome",
			description: null,
			coverUrl: null,
			authorName: null,
			musicsCount: 0,
			updatedAt: null,
		});
	});
});
