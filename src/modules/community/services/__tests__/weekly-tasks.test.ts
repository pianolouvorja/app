// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	completeWeeklyTask,
	getWeeklyTasks,
	type WeeklyTask,
} from "../weekly-tasks";

const SESSION = {
	token: "tok",
	user: { id_user: 1, email: "t@t.local", displayName: "T" },
};

function login() {
	localStorage.setItem("louvorja.custom.auth", JSON.stringify(SESSION));
}

function logout() {
	localStorage.removeItem("louvorja.custom.auth");
}

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
	} as unknown as Response;
}

const TASKS: WeeklyTask[] = [
	{
		id: "publish_theme",
		description: "Publique uma coletânea",
		done: false,
		bonus: 15,
	},
	{
		id: "complete_tracks",
		description: "Complete 3 faixas",
		done: true,
		bonus: 15,
	},
	{ id: "use_others", description: "Use 2 coletâneas", done: false, bonus: 15 },
];

describe("weekly-tasks service (F4 app)", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		logout();
	});

	it("getWeeklyTasks: autenticado → lista; sem sessão → null", async () => {
		login();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ week_key: "2026-W38", data: TASKS })),
		);
		const tasks = await getWeeklyTasks();
		expect(tasks).toEqual(TASKS);

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		logout();
		expect(await getWeeklyTasks()).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("getWeeklyTasks: falha da API → null", async () => {
		login();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ error: "x" }, false)),
		);
		expect(await getWeeklyTasks()).toBeNull();
	});

	it("completeWeeklyTask: retorna credited; falha → false", async () => {
		login();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ ok: true, credited: true })),
		);
		expect(await completeWeeklyTask("publish_theme")).toBe(true);

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ ok: true, credited: false })),
		);
		expect(await completeWeeklyTask("publish_theme")).toBe(false);
	});

	it("completeWeeklyTask sem sessão → false sem fetch", async () => {
		const m = vi.fn();
		vi.stubGlobal("fetch", m);
		expect(await completeWeeklyTask("x")).toBe(false);
		expect(m).not.toHaveBeenCalled();
	});
});
