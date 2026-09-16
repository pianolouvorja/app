import { describe, it, expect, vi, beforeEach } from "vitest";

import {
	getSeasonalEvent,
	type SeasonalEventBanner,
} from "../seasonal-event";

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
	} as unknown as Response;
}

describe("seasonal-event service (F6 banner)", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("evento ativo → retorna dados", async () => {
		const payload: SeasonalEventBanner = {
			active: true,
			name: "Temporada SDA Hymnal",
			description: "Crie músicas e ganhe pontos em dobro!",
			multiplier: 2,
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse(payload)),
		);
		expect(await getSeasonalEvent()).toEqual(payload);
	});

	it("active:false → null", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ active: false })),
		);
		expect(await getSeasonalEvent()).toBeNull();
	});

	it("falha de rede → null (nunca lança)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("down");
			}),
		);
		expect(await getSeasonalEvent()).toBeNull();
	});
});
