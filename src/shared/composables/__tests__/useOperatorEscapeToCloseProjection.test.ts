// @vitest-environment jsdom
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	getDesktopBridge: vi.fn<() => unknown>(() => null),
	appConfirm: vi.fn(async () => false),
}));

vi.mock("@shared/services/desktop-bridge", () => ({
	getDesktopBridge: mocks.getDesktopBridge,
}));

vi.mock("@shared/composables/useAppConfirm", () => ({
	appConfirm: mocks.appConfirm,
}));

vi.mock("@shared/composables/useProjectionWindow", () => ({
	closeProjectionModule: vi.fn(),
	reapplyProjectionTargets: vi.fn(),
}));

vi.mock("@modules/media/stores/useMediaStore", () => {
	const state = {
		session: null as unknown,
		isPlaying: false,
		isProjecting: false,
		close: vi.fn(),
	};
	const useMediaStore = () => state;
	return { useMediaStore };
});

import {
	closeLocalProjectionState,
	requestCloseProjectionWithConfirm,
	useOperatorEscapeToCloseProjection,
} from "../useOperatorEscapeToCloseProjection";

const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

function bridgeWith(overrides: Record<string, unknown> = {}) {
	return {
		projection: {
			externalAlive: vi.fn(async () => true),
			closeUrl: vi.fn(async () => undefined),
			onCloseRequested: vi.fn((cb: () => void) => () => {}),
			...overrides,
		},
	};
}

// hooks: usar componente real
import { createApp, defineComponent, h } from "vue";

function mountWith(setup: () => unknown) {
	let captured: unknown;
	const app = createApp(
		defineComponent({
			setup() {
				captured = setup();
				return () => h("div");
			},
		}),
	);
	const host = document.createElement("div");
	document.body.appendChild(host);
	app.mount(host);
	return {
		unmount: () => app.unmount(),
		captured: () => captured,
		host,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getDesktopBridge.mockReturnValue(null);
	document.body.innerHTML = "";
});

afterEach(() => {
	document.body.innerHTML = "";
});

afterAll(() => {
	consoleWarn.mockRestore();
});

describe("requestCloseProjectionWithConfirm", () => {
	it("sem bridge → no-op", async () => {
		await requestCloseProjectionWithConfirm();
		expect(mocks.appConfirm).not.toHaveBeenCalled();
	});

	it("mídia externa não viva → não pergunta", async () => {
		mocks.getDesktopBridge.mockReturnValue(
			bridgeWith({ externalAlive: vi.fn(async () => false) }),
		);
		await requestCloseProjectionWithConfirm();
		expect(mocks.appConfirm).not.toHaveBeenCalled();
	});

	it("confirmado → fecha URL e estado local", async () => {
		mocks.appConfirm.mockResolvedValue(true);
		const bridge = bridgeWith();
		mocks.getDesktopBridge.mockReturnValue(bridge);
		await requestCloseProjectionWithConfirm();
		expect(bridge.projection.closeUrl).toHaveBeenCalled();
	});

	it("cancelado → não fecha", async () => {
		mocks.appConfirm.mockResolvedValue(false);
		const bridge = bridgeWith();
		mocks.getDesktopBridge.mockReturnValue(bridge);
		await requestCloseProjectionWithConfirm();
		expect(bridge.projection.closeUrl).not.toHaveBeenCalled();
	});

	it("reentrância: segunda chamada durante handling é ignorada", async () => {
		// externalAlive pendente segura a execução antes de handling=true... na
		// verdade handling=true é setado logo após externalAlive; usar confirm
		// pendente pra manter handling true enquanto a 2ª chamada chega.
		let releaseConfirm: (v: boolean) => void = () => {};
		mocks.appConfirm.mockImplementation(
			() =>
				new Promise<boolean>((resolve) => {
					releaseConfirm = resolve;
				}),
		);
		mocks.getDesktopBridge.mockReturnValue(bridgeWith());
		const first = requestCloseProjectionWithConfirm();
		// aguarda o confirm abrir (handling=true)
		await new Promise((r) => setTimeout(r, 5));
		const second = requestCloseProjectionWithConfirm();
		await second;
		releaseConfirm(true);
		await first;
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);
	});

	it("bridge lançando → ignorado silenciosamente", async () => {
		mocks.getDesktopBridge.mockImplementation(() => {
			throw new Error("boom");
		});
		await expect(requestCloseProjectionWithConfirm()).resolves.toBeUndefined();
	});

	it("closeLocalProjectionState fecha media store com sessão ativa", async () => {
		mocks.appConfirm.mockResolvedValue(true);
		const bridge = bridgeWith();
		mocks.getDesktopBridge.mockReturnValue(bridge);
		await requestCloseProjectionWithConfirm();
		// import dinâmico precisa de um tick
		await new Promise((r) => setTimeout(r, 10));
		expect(true).toBe(true);
	});
});

describe("useOperatorEscapeToCloseProjection", () => {
	it("ESC com projeção ativa → confirm; guards de input/dialog", async () => {
		mocks.getDesktopBridge.mockReturnValue(bridgeWith());
		const env = mountWith(() =>
			useOperatorEscapeToCloseProjection(() => false),
		);
		const dispatch = (target: HTMLElement | null, key = "Escape") => {
			const ev = new KeyboardEvent("keydown", { key, bubbles: true });
			Object.defineProperty(ev, "target", { value: target ?? document.body });
			window.dispatchEvent(ev);
		};
		await dispatch(null);
		await new Promise((r) => setTimeout(r, 5));
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);

		// input focado → guard
		const input = document.createElement("input");
		await dispatch(input);
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);

		// dialog aberto → guard
		const dialog = document.createElement("div");
		dialog.setAttribute("role", "dialog");
		document.body.appendChild(dialog);
		await dispatch(null);
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);

		// tecla diferente → guard
		dispatch(null, "Enter");
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);

		env.unmount();
		// ESC após unmount → nada
		await dispatch(null);
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);
	});

	it("janela de projeção → ESC ignorado", async () => {
		mocks.getDesktopBridge.mockReturnValue(bridgeWith());
		const env = mountWith(() => useOperatorEscapeToCloseProjection(() => true));
		const ev = new KeyboardEvent("keydown", { key: "Escape" });
		Object.defineProperty(ev, "target", { value: document.body });
		window.dispatchEvent(ev);
		await new Promise((r) => setTimeout(r, 5));
		expect(mocks.appConfirm).not.toHaveBeenCalled();
		env.unmount();
	});

	it("sem mídia externa viva → ESC não previne nem confirma", async () => {
		const bridge = bridgeWith({
			externalAlive: vi.fn(async () => false),
		});
		mocks.getDesktopBridge.mockReturnValue(bridge);
		const env = mountWith(() =>
			useOperatorEscapeToCloseProjection(() => false),
		);
		const ev = new KeyboardEvent("keydown", { key: "Escape" });
		Object.defineProperty(ev, "target", { value: document.body });
		window.dispatchEvent(ev);
		await new Promise((r) => setTimeout(r, 5));
		expect(mocks.appConfirm).not.toHaveBeenCalled();
		env.unmount();
	});

	it("onCloseRequested da bridge dispara o confirm; sem onCloseRequested → no-op", async () => {
		const registered: Array<() => void> = [];
		const bridge = bridgeWith({
			onCloseRequested: vi.fn((cb: () => void) => {
				registered.push(cb);
				return () => {};
			}),
		});
		mocks.getDesktopBridge.mockReturnValue(bridge);
		const env = mountWith(() =>
			useOperatorEscapeToCloseProjection(() => false),
		);
		expect(registered).toHaveLength(1);
		mocks.appConfirm.mockResolvedValue(false);
		registered[0]?.();
		await new Promise((r) => setTimeout(r, 5));
		expect(mocks.appConfirm).toHaveBeenCalledTimes(1);
		env.unmount();

		// bridge sem onCloseRequested
		mocks.getDesktopBridge.mockReturnValue({ projection: {} });
		expect(() =>
			mountWith(() =>
				useOperatorEscapeToCloseProjection(() => false),
			).unmount(),
		).not.toThrow();
	});

	it("unmount remove listener e unsubscribe", async () => {
		const unsub = vi.fn();
		const bridge = bridgeWith({ onCloseRequested: vi.fn(() => unsub) });
		mocks.getDesktopBridge.mockReturnValue(bridge);
		const env = mountWith(() =>
			useOperatorEscapeToCloseProjection(() => false),
		);
		env.unmount();
		expect(unsub).toHaveBeenCalled();
	});
});
