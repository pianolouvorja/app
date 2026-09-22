// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * desktop-bridge — deteção de ambiente: bridge do preload, userAgent
 * Electron, Windows via UA/Client Hints/platform.
 */
import {
	getDesktopBridge,
	isDesktopApp,
	isElectronShell,
	isWindowsDesktop,
} from "../desktop-bridge";

type Win = Record<string, unknown>;

function setWindow(partial: Win) {
	vi.stubGlobal("window", { ...globalThis.window, ...partial });
}

function setUA(ua: string) {
	Object.defineProperty(window.navigator, "userAgent", {
		value: ua,
		configurable: true,
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
	setUA("Mozilla/5.0 (X11; Linux x86_64) Chrome/120");
	delete (window as unknown as Win).louvorja;
	delete (window as unknown as Win).process;
	Reflect.deleteProperty(window.navigator, "userAgentData");
});

describe("getDesktopBridge", () => {
	it("window.louvorja presente -> bridge", () => {
		const bridge = { isElectron: true };
		setWindow({ louvorja: bridge });
		expect(getDesktopBridge()).toBe(bridge);
	});

	it("sem bridge -> null", () => {
		expect(getDesktopBridge()).toBeNull();
	});
});

describe("isElectronShell", () => {
	it("bridge com isElectron -> true", () => {
		setWindow({ louvorja: { isElectron: true } });
		expect(isElectronShell()).toBe(true);
	});

	it("UA Electron sem bridge -> true (preload ainda não subiu)", () => {
		setUA("Mozilla/5.0 Electron/25.0");
		expect(isElectronShell()).toBe(true);
	});

	it("browser comum -> false", () => {
		expect(isElectronShell()).toBe(false);
	});
});

describe("isDesktopApp", () => {
	it("bridge isElectron -> true; sem -> false", () => {
		expect(isDesktopApp()).toBe(false);
		setWindow({ louvorja: { isElectron: true } });
		expect(isDesktopApp()).toBe(true);
	});
});

describe("isWindowsDesktop", () => {
	it("bridge platform win32 -> true", () => {
		setWindow({ louvorja: { platform: "win32" } });
		expect(isWindowsDesktop()).toBe(true);
	});

	it("UA Windows sem bridge -> true (fallback clássico)", () => {
		setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
		expect(isWindowsDesktop()).toBe(true);
	});

	it("Client Hints platform Win -> true", () => {
		setUA("Mozilla/5.0 Chrome/120");
		Object.defineProperty(window.navigator, "userAgentData", {
			value: { platform: "Windows" },
			configurable: true,
		});
		expect(isWindowsDesktop()).toBe(true);
	});

	it("Linux sem nada -> false", () => {
		setUA("Mozilla/5.0 (X11; Linux x86_64)");
		expect(isWindowsDesktop()).toBe(false);
	});
});
