// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

/**
 * router/index — instância única criada no import. Em jsdom (http://localhost)
 * com isElectronShell false: history mode web, 3 rotas de topo (popup, shell
 * com children, catch-all redirect).
 */

describe("router", () => {
	it("exporta router com rotas de topo esperadas", async () => {
		const router = (await import("../index")).default;
		expect(router.getRoutes().length).toBeGreaterThan(3);
		const paths = router.getRoutes().map((r) => r.path);
		expect(paths).toContain("/popup");
		expect(paths).toContain("/");
		expect(paths).toContain("/:pathMatch(.*)*");
	});

	it("rota popup tem meta projection", async () => {
		const router = (await import("../index")).default;
		const popup = router.getRoutes().find((r) => r.name === "projection-popup");
		expect(popup?.meta.projection).toBe(true);
	});

	it("resolve rota inexistente → redireciona para /", async () => {
		const router = (await import("../index")).default;
		await router.push("/rota-inexistente-xyz");
		expect(router.currentRoute.value.path).toBe("/");
	});

	it("resolve rota home", async () => {
		const router = (await import("../index")).default;
		await router.push("/");
		expect(router.currentRoute.value.matched.length).toBeGreaterThan(0);
	});
});
