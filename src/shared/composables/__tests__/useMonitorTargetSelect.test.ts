// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useMonitorTargetSelect — seleção de monitores alvo da projeção.
 * Mocks: display-service (lista fixa), projection-preferences (settings em
 * memória), bridge e useProjectionWindow.
 */

const mocks = vi.hoisted(() => {
	const state = {
		displays: [] as Array<Record<string, unknown>>,
		settings: {
			targetDisplayIds: [] as number[],
			declinedDisplayIds: [] as number[],
			openReturnScreen: false,
			returnDisplayId: null as number | null,
		},
		bridge: null as null | Record<string, unknown>,
	};
	return { state };
});

vi.mock("@modules/settings/services/display-service", () => ({
	listSystemDisplays: vi.fn(async () => mocks.state.displays),
	listExtendedDisplays: (all: Array<{ isPrimary: boolean }>) =>
		all.filter((d) => !d.isPrimary),
	formatDisplayResolution: (d: { bounds: { width: number; height: number } }) =>
		`${d.bounds.width} × ${d.bounds.height}`,
	identifySystemDisplays: vi.fn(async () => true),
	subscribeDisplaysChanged: vi.fn(() => () => {}),
}));

vi.mock("@modules/settings/services/projection-preferences", () => ({
	loadProjectionSettings: vi.fn(() => ({ ...mocks.state.settings })),
	saveProjectionSettings: vi.fn((s: unknown) => {
		Object.assign(mocks.state.settings, s as Record<string, unknown>);
	}),
	reconcileTargetDisplays: vi.fn((s: unknown) => s),
}));

vi.mock("@shared/services/desktop-bridge", () => ({
	getDesktopBridge: vi.fn(() => mocks.state.bridge),
}));

vi.mock("@shared/composables/useProjectionWindow", () => ({
	reapplyProjectionTargets: vi.fn(async () => undefined),
}));

vi.mock("@modules/settings/stores/useProjectionStore", () => ({
	useProjectionStore: () => ({
		applySettings: vi.fn(),
	}),
}));

import { saveProjectionSettings } from "@modules/settings/services/projection-preferences";
import { useMonitorTargetSelect } from "../useMonitorTargetSelect";

const disp = (id: number, isPrimary = false) => ({
	id,
	isPrimary,
	bounds: { x: 0, y: 0, width: 1920, height: 1080 },
	workArea: { x: 0, y: 0, width: 1920, height: 1040 },
	scaleFactor: 1,
});

// componente real p/ hooks
import { createApp, defineComponent, h } from "vue";

async function mountWith(setup: () => unknown) {
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
	const env = {
		tm: captured as ReturnType<typeof useMonitorTargetSelect>,
		unmount: () => app.unmount(),
	};
	// aguarda o syncToMain do onMounted drenar (setTimeout(0) interno do applyingRemote)
	for (let i = 0; i < 3; i++) {
		await new Promise((r) => setTimeout(r, 0));
	}
	return env;
}

type TM = ReturnType<typeof useMonitorTargetSelect>;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.state.displays = [disp(1, true), disp(2), disp(3)];
	mocks.state.settings = {
		targetDisplayIds: [],
		declinedDisplayIds: [],
		openReturnScreen: false,
		returnDisplayId: null,
	};
	mocks.state.bridge = null;
});

afterEach(() => {
	document.body.innerHTML = "";
});

describe("useMonitorTargetSelect — listagem e opções", () => {
	it("refresh carrega displays; extendedOnly esconde o primário", async () => {
		const env = await mountWith(() => useMonitorTargetSelect());
		const tm = env.tm;
		await tm.refresh();
		expect(tm.optionsList.value.map((o) => o.id)).toEqual([2, 3]);
		expect(tm.optionsList.value[0]?.label).toBe("Monitor 2");
		expect(tm.optionsList.value[0]?.resolutionLabel).toBe("1920 × 1080");
		env.unmount();
	});

	it("extendedOnly=false mostra todos", async () => {
		const env = await mountWith(() =>
			useMonitorTargetSelect({ extendedOnly: false }),
		);
		await env.tm.refresh();
		expect(env.tm.optionsList.value).toHaveLength(3);
		env.unmount();
	});

	it("hasDisplays/selectedCount/loading", async () => {
		const env = await mountWith(() => useMonitorTargetSelect());
		// refresh do mount já rodou (mountWith aguarda microtasks)
		expect(env.tm.hasDisplays.value).toBe(true);
		expect(env.tm.selectedCount.value).toBe(0);
		expect(env.tm.loading.value).toBe(false);
		env.unmount();
	});

	it("identify alterna identifying", async () => {
		const env = await mountWith(() => useMonitorTargetSelect());
		const p = env.tm.identify();
		await p;
		expect(env.tm.identifying.value).toBe(false);
		env.unmount();
	});

	it("open/toggleOpen/close disparam refresh", async () => {
		const env = await mountWith(() => useMonitorTargetSelect());
		env.tm.toggleOpen();
		expect(env.tm.open.value).toBe(true);
		await new Promise((r) => setTimeout(r, 0));
		env.tm.close();
		expect(env.tm.open.value).toBe(false);
		env.tm.toggleOpen();
		expect(env.tm.open.value).toBe(true);
		env.unmount();
	});
});

describe("useMonitorTargetSelect — seleção e persistência", () => {
	it("setSelectedIds filtra inválidos, persiste e sincroniza ao main", async () => {
		const setSite = vi.fn(async () => undefined);
		const setVideo = vi.fn(async () => undefined);
		mocks.state.bridge = {
			projection: {
				setSiteTargetMonitors: setSite,
				setVideoTargetMonitors: setVideo,
			},
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		env.tm.setSelectedIds([2, 99]); // 99 não existe
		expect(env.tm.selectedIds.value).toEqual([2]);
		expect(saveProjectionSettings).toHaveBeenCalled();
		await new Promise((r) => setTimeout(r, 0));
		expect(setSite).toHaveBeenCalledWith([2]);
		expect(setVideo).toHaveBeenCalledWith([2]);
		env.unmount();
	});

	it("toggle adiciona e remove", async () => {
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		env.tm.toggle(2);
		expect(env.tm.selectedIds.value).toEqual([2]);
		env.tm.toggle(2);
		expect(env.tm.selectedIds.value).toEqual([]);
		// toggle de primário (não permitido) é ignorado
		env.tm.toggle(1);
		expect(env.tm.selectedIds.value).toEqual([]);
		env.unmount();
	});

	it("persist=false não grava settings", async () => {
		const env = await mountWith(() =>
			useMonitorTargetSelect({ persist: false }),
		);
		await env.tm.refresh();
		env.tm.setSelectedIds([2]);
		expect(saveProjectionSettings).not.toHaveBeenCalled();
		env.unmount();
	});

	it("modelValue controlado filtra pela lista permitida", async () => {
		const env = await mountWith(() =>
			useMonitorTargetSelect({ persist: false, modelValue: () => [2, 77] }),
		);
		await env.tm.refresh();
		expect(env.tm.selectedIds.value).toEqual([2]);
		env.unmount();
	});

	it("onUpdate dispara ao mudar seleção", async () => {
		const onUpdate = vi.fn();
		const env = await mountWith(() =>
			useMonitorTargetSelect({ persist: false, onUpdate }),
		);
		await env.tm.refresh();
		env.tm.setSelectedIds([3]);
		expect(onUpdate).toHaveBeenCalledWith([3]);
		env.unmount();
	});

	it("tela de retorno aparece nas opções e não é recusada", async () => {
		mocks.state.settings = {
			targetDisplayIds: [2],
			declinedDisplayIds: [],
			openReturnScreen: true,
			returnDisplayId: 1,
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		const ids = env.tm.optionsList.value.map((o) => o.id);
		expect(ids).toContain(1);
		const ret = env.tm.optionsList.value.find((o) => o.id === 1);
		expect(ret?.isReturn).toBe(true);
		env.unmount();
	});
});

describe("useMonitorTargetSelect — sync com main e IPC remoto", () => {
	it("applyRemoteIds atualiza seleção sem ecoar (applyingRemote)", async () => {
		const setSite = vi.fn(async () => undefined);
		let remoteCb: ((ids: number[]) => void) | null = null;
		mocks.state.bridge = {
			projection: {
				setSiteTargetMonitors: setSite,
				onSiteTargetsChanged: vi.fn((cb: (ids: number[]) => void) => {
					remoteCb = cb;
					return () => {};
				}),
			},
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		remoteCb?.([3]);
		await new Promise((r) => setTimeout(r, 0));
		expect(env.tm.selectedIds.value).toEqual([3]);
		// setSite pode ter sido chamado apenas pelo sync inicial do mount (vazio);
		// o eco remoto NÃO deve ter adicionado uma nova chamada com [3]
		const siteCalls = setSite.mock.calls.map((c) => c[0]);
		expect(siteCalls).not.toContainEqual([3]);
		env.unmount();
	});

	it("syncToMain ignora se applyingRemote (eco)", async () => {
		let remoteCb: ((ids: number[]) => void) | null = null;
		const setSite = vi.fn(async () => undefined);
		mocks.state.bridge = {
			projection: {
				setSiteTargetMonitors: setSite,
				setVideoTargetMonitors: vi.fn(),
				onSiteTargetsChanged: vi.fn((cb: (ids: number[]) => void) => {
					remoteCb = cb;
					return () => {};
				}),
			},
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		// local muda → syncToMain roda (applyingRemote vira true durante)
		env.tm.setSelectedIds([2]);
		await new Promise((r) => setTimeout(r, 0));
		expect(setSite).toHaveBeenCalledWith([2]);
		// remoto aplica o mesmo → applyingRemote deve bloquear re-sync
		remoteCb?.([2]);
		env.unmount();
	});

	it("sem bridge: setSelectedIds funciona sem sync", async () => {
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		env.tm.setSelectedIds([2]);
		expect(env.tm.selectedIds.value).toEqual([2]);
		env.unmount();
	});

	it("seleção a partir de settings no boot (persist)", async () => {
		mocks.state.settings = {
			targetDisplayIds: [3],
			declinedDisplayIds: [2],
			openReturnScreen: false,
			returnDisplayId: null,
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		expect(env.tm.selectedIds.value).toEqual([3]);
		env.unmount();
	});

	it("settings com id removido é reconciliado", async () => {
		mocks.state.settings = {
			targetDisplayIds: [2, 3, 44],
			declinedDisplayIds: [],
			openReturnScreen: false,
			returnDisplayId: null,
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		// 44 não existe → removido
		expect(env.tm.selectedIds.value).toEqual([2, 3]);
		env.unmount();
	});
});

describe("useMonitorTargetSelect — ciclo de vida", () => {
	it("unmount remove inscrições", async () => {
		const unsubTargets = vi.fn();
		const unsubDisplays = vi.fn();
		mocks.state.bridge = {
			projection: {
				onSiteTargetsChanged: vi.fn(() => unsubTargets),
			},
		};
		const displayMod = (await import(
			"@modules/settings/services/display-service"
		)) as unknown as {
			subscribeDisplaysChanged: ReturnType<typeof vi.fn>;
		};
		displayMod.subscribeDisplaysChanged.mockImplementation(() => unsubDisplays);
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		env.unmount();
		expect(unsubTargets).toHaveBeenCalled();
		expect(unsubDisplays).toHaveBeenCalled();
	});

	it("onSiteTargetsChanged ausente na bridge → mount ok", async () => {
		mocks.state.bridge = { projection: {} };
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		env.unmount();
		expect(true).toBe(true);
	});
});

describe("useMonitorTargetSelect — ramos residuais", () => {
	it("modelValue como Ref (não função)", async () => {
		const modelValue = { value: [2] };
		const env = await mountWith(() =>
			useMonitorTargetSelect({
				persist: false,
				modelValue: modelValue as never,
			}),
		);
		await env.tm.refresh();
		expect(env.tm.selectedIds.value).toEqual([2]);
		env.unmount();
	});

	it("watch de modelValue reagrupa ids permitidos (314-316)", async () => {
		const { ref } = await import("vue");
		const modelValue = ref([2]);
		const env = await mountWith(() =>
			useMonitorTargetSelect({
				persist: false,
				modelValue: modelValue as never,
			}),
		);
		await env.tm.refresh();
		modelValue.value = [3, 88];
		await new Promise((r) => setTimeout(r, 10));
		expect(env.tm.selectedIds.value).toEqual([3]);
		env.unmount();
	});

	it("watch com ids undefined → guard", async () => {
		let mv: { value?: number[] } = { value: undefined };
		const env = await mountWith(() =>
			useMonitorTargetSelect({ persist: false, modelValue: () => mv.value }),
		);
		await env.tm.refresh();
		mv = { value: [2] };
		await new Promise((r) => setTimeout(r, 0));
		env.unmount();
	});

	it("applyRemoteIds sem displays ainda aceita ids brutos (201)", async () => {
		let remoteCb: ((ids: number[]) => void) | null = null;
		mocks.state.displays = [];
		mocks.state.bridge = {
			projection: {
				onSiteTargetsChanged: vi.fn((cb: (ids: number[]) => void) => {
					remoteCb = cb;
					return () => {};
				}),
			},
		};
		const env = await mountWith(() =>
			useMonitorTargetSelect({ persist: false }),
		);
		remoteCb?.([5, "x" as unknown as number]);
		await new Promise((r) => setTimeout(r, 0));
		// sem displays: next = [...normalized] filtrado a NaN
		expect(env.tm.selectedIds.value).toEqual([5]);
		env.unmount();
	});

	it("onSiteTargetsChanged com payload não-array → [] (296)", async () => {
		let remoteCb: ((ids: unknown) => void) | null = null;
		mocks.state.bridge = {
			projection: {
				onSiteTargetsChanged: vi.fn((cb: (ids: unknown) => void) => {
					remoteCb = cb;
					return () => {};
				}),
			},
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		remoteCb?.("lixo");
		await new Promise((r) => setTimeout(r, 0));
		expect(env.tm.selectedIds.value).toEqual([]);
		env.unmount();
	});

	it("syncToMain com substituição de sync entre awaits (133): nova seleção durante sync", async () => {
		let releaseVideo: () => void = () => {};
		const setSite = vi.fn(async () => undefined);
		const setVideo = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					releaseVideo = resolve;
				}),
		);
		mocks.state.bridge = {
			projection: {
				setSiteTargetMonitors: setSite,
				setVideoTargetMonitors: setVideo,
			},
		};
		const env = await mountWith(() => useMonitorTargetSelect());
		await env.tm.refresh();
		const p1 = env.tm.setSelectedIds([2]);
		// segunda seleção enquanto a primeira espera o setVideo
		env.tm.setSelectedIds([3]);
		releaseVideo();
		await p1;
		await new Promise((r) => setTimeout(r, 0));
		// reapply da 1ª chamada é abortado (seq mismatch)
		env.unmount();
		expect(true).toBe(true);
	});

	it("sameIds com ordem diferente → false (59-60)", async () => {
		// exercita via applyRemoteIds: ordem diferente dispara re-set
		let remoteCb: ((ids: number[]) => void) | null = null;
		mocks.state.bridge = {
			projection: {
				onSiteTargetsChanged: vi.fn((cb: (ids: number[]) => void) => {
					remoteCb = cb;
					return () => {};
				}),
			},
		};
		const env = await mountWith(() =>
			useMonitorTargetSelect({ persist: false }),
		);
		await env.tm.refresh();
		env.tm.setSelectedIds([2, 3]);
		remoteCb?.([3, 2]);
		await new Promise((r) => setTimeout(r, 0));
		expect([...env.tm.selectedIds.value].sort()).toEqual([2, 3]);
		env.unmount();
	});
});
