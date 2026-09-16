// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	getNotifications,
	markAllRead,
} from "../notifications";

function jsonResponse(body: unknown, ok = true): Response {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
	} as unknown as Response;
}

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

describe("notifications service (F6 app)", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		logout();
	});

	it("getNotifications: autenticado → lista; sem sessão → []", async () => {
		login();
		const NOTIFS = [
			{
				id: 1,
				type: "music_promoted",
				title: "Promovida!",
				body: "Sua música foi promovida",
				created_at: "2026-09-16 12:00:00",
			},
		];
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ data: NOTIFS })),
		);
		expect(await getNotifications()).toEqual(NOTIFS);

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		logout();
		expect(await getNotifications()).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("markAllRead: chama POST; sem sessão → não chama", async () => {
		login();
		let method = "GET";
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_url: string, init?: RequestInit) => {
				method = (init?.method as string) ?? "GET";
				return jsonResponse({ ok: true });
			}),
		);
		await markAllRead();
		expect(method).toBe("POST");

		const m = vi.fn();
		vi.stubGlobal("fetch", m);
		logout();
		await markAllRead();
		expect(m).not.toHaveBeenCalled();
	});
});
