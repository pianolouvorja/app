import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	getMyPosition,
	getRanking,
	type RankingEntry,
	registerUse,
} from "../ranking";

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
	} as unknown as Response;
}

const ENTRIES: RankingEntry[] = [
	{ position: 1, user_id: 7, display_name: "Alice", total: 15 },
	{ position: 2, user_id: 9, display_name: "Bob", total: 10 },
];

describe("ranking service (F2 app)", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("getRanking busca com janela e mapeia entradas", async () => {
		let calledUrl = "";
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				calledUrl = String(url);
				return jsonResponse({ data: ENTRIES });
			}),
		);
		const data = await getRanking("week");
		expect(calledUrl).toContain("/v1/custom/ranking?window=week");
		expect(data).toEqual(ENTRIES);
	});

	it("getRanking: falha da API → lista vazia, nunca lança", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ error: "x" }, false)),
		);
		expect(await getRanking("all")).toEqual([]);
	});

	it("getMyPosition: autenticado → payload; 401 → null", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ position: 3, total: 7 })),
		);
		expect(await getMyPosition("all", "tok")).toEqual({
			position: 3,
			total: 7,
		});

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ error: "unauth" }, false)),
		);
		expect(await getMyPosition("all", "tok")).toBeNull();
		expect(await getMyPosition("all", null)).toBeNull();
	});

	it("registerUse: só chama com sessão; retorna first_use", async () => {
		let capturedInit: RequestInit | undefined;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_url: string, init?: RequestInit) => {
				capturedInit = init;
				return jsonResponse({ ok: true, first_use: true });
			}),
		);
		const first = await registerUse(12, "tok");
		expect(first).toBe(true);
		expect((capturedInit?.method as string) || "GET").toBe("POST");
		const auth = (capturedInit?.headers as Record<string, string>)?.[
			"Authorization"
		];
		expect(auth).toBe("Bearer tok");

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ ok: true, first_use: false })),
		);
		expect(await registerUse(12, "tok")).toBe(false);
	});

	it("registerUse sem sessão → false sem chamar fetch", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		expect(await registerUse(12, null)).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
