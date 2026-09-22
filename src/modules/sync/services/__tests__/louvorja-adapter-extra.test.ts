// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Complemento louvorja-adapter — ramos: liturgy sem estado local (skip),
 * readModified sem storage (""), entidade não suportada.
 */
import {
	exportLouvorjaFromBrowser,
	importLouvorjaIntoBrowser,
} from "../louvorja-adapter";

beforeEach(() => {
	localStorage.clear();
});

describe("applySyncPackage — liturgy sem estado local", () => {
	it("remote mais novo + current null -> skipped liturgy (93-95)", () => {
		const result = importLouvorjaIntoBrowser({
			entities: {
				liturgy: {
					modified: "2030-01-01T00:00:00Z",
					data: {
						sunday: {
							items: [{ id: "1" }],
							notes: "nota",
						},
					},
				},
			},
		} as never);
		expect(result.skipped).toContain("liturgy");
		expect(result.applied).not.toContain("liturgy");
	});

	it("entidade desconhecida -> ignorada (forward-compatible)", () => {
		const result = importLouvorjaIntoBrowser({
			entities: {
				desconhecida: { modified: "2030-01-01T00:00:00Z", data: {} },
			},
		} as never);
		expect(result.applied).toEqual([]);
		expect(result.skipped).toEqual([]);
	});

	it("remote sem modified válido (epoch 0) não sobrepõe local vazio (146 via toEpoch)", () => {
		const result = importLouvorjaIntoBrowser({
			entities: {
				liturgy: {
					modified: "data-inválida",
					data: { sunday: { items: [] } },
				},
			},
		} as never);
		// local "" -> epoch 0; remote 0 > 0 false -> skipped
		expect(result.skipped).toContain("liturgy");
	});
});

describe("exportLouvorjaFromBrowser — sem estado local", () => {
	it("entidades vazias quando não há liturgy salva", () => {
		const pkg = exportLouvorjaFromBrowser("1.0", "test");
		expect(Object.keys(pkg.entities)).toHaveLength(0);
	});
});
