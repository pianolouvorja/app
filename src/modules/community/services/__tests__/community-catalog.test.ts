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

describe("community-catalog — URL base (branch 30)", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("default de produção quando VITE_PALCO_API_URL ausente", async () => {
		vi.stubEnv("VITE_PALCO_API_URL", undefined as unknown as string);
		let calledUrl = "";
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				calledUrl = url;
				return jsonResponse({ data: [] });
			}),
		);
		await listCommunityCollectionsPage(1, 24);
		expect(calledUrl).toContain("https://api.pianolouvorja.com.br/v1/custom");
	});

	it("env com trailing slash é normalizado", async () => {
		vi.stubEnv("VITE_PALCO_API_URL", "https://api.test.local/");
		let calledUrl = "";
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				calledUrl = url;
				return jsonResponse({ data: [] });
			}),
		);
		await listCommunityCollectionsPage(1, 24);
		expect(calledUrl).toContain("https://api.test.local/v1/custom");
	});
});

describe("community-catalog — mata mutantes de !ok/meta/description", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("!ok na listagem: body válido NÃO vira página (dado de erro não entra)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse(
					{
						data: [PUBLIC_ROW],
						meta: { page: 1, last_page: 5, total: 100 },
					},
					false,
				),
			),
		);
		const result = await listCommunityCollectionsPage(1, 24);
		expect(result).toEqual({ items: [], page: 1, lastPage: 1, total: 0 });
	});

	it("meta presente: page/lastPage/total vêm da API (mutante meta={} quebra)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					data: [PUBLIC_ROW],
					meta: { page: 2, last_page: 7, total: 130 },
				}),
			),
		);
		const result = await listCommunityCollectionsPage(2, 24);
		expect(result.page).toBe(2);
		expect(result.lastPage).toBe(7);
		expect(result.total).toBe(130);
	});

	it("meta ausente: fallback para page pedida / lastPage 1 / total 0", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ data: [PUBLIC_ROW] })),
		);
		const result = await listCommunityCollectionsPage(3, 24);
		expect(result.page).toBe(3);
		expect(result.lastPage).toBe(1);
		expect(result.total).toBe(0);
	});
});
