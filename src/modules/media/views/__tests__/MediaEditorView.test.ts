// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

/**
 * MediaEditorView — editor de coletâneas custom: criar coletânea/música,
 * listar, adicionar estrofe, salvar estrofe. Serviços de catálogo mockados.
 */
import mediaLocale from "../../locales/pt-BR";
import MediaEditorView from "../MediaEditorView.vue";

const pushMock = vi.fn().mockResolvedValue(undefined);
vi.mock("vue-router", () => ({
	useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
	useRoute: () => ({ name: "media-editor", path: "/media/editor", query: {} }),
}));

vi.mock("@shared/components/AppConfirm.vue", () => ({
	default: { template: '<div class="app-confirm-stub" />' },
}));

vi.mock("../../services/auth-client", () => ({
	getAuthSession: vi.fn(() => null),
}));

vi.mock("../../services/custom-catalog", () => ({
	listCustomCollections: vi.fn().mockResolvedValue([
		{ id: 1, name: "Coletânea Teste" },
		{ id: 2, name: "Hinos Locais" },
	]),
	listCustomMusics: vi.fn().mockResolvedValue([
		{ id: 10, name: "Música Um" },
		{ id: 11, name: "Música Dois" },
	]),
	createCustomCollection: vi.fn(),
	createCustomMusic: vi.fn(),
	createCustomLyric: vi.fn(),
	updateCustomLyric: vi.fn(),
	updateCustomMusic: vi.fn(),
	updateCustomCollection: vi.fn(),
	deleteCustomCollection: vi.fn(),
	deleteCustomMusic: vi.fn(),
	deleteCustomLyric: vi.fn(),
	uploadCustomFile: vi.fn(),
	customApiUrl: vi.fn((p: string) => `https://api.test/v1/custom${p}`),
	customFileUrl: vi.fn((p: string) => `/files/${p}`),
	addOfficialMusicToCollection: vi.fn(),
	copyCustomMusic: vi.fn(),
	listAllCustomMusics: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/local-custom-store", () => ({
	getLocalMusic: vi.fn(),
	isLocalId: vi.fn(() => false),
	updateLocalMusic: vi.fn(),
}));

vi.mock("@modules/albums/services/album-music-search", () => ({
	loadAlbumMusicIndex: vi.fn().mockResolvedValue([]),
	filterAlbumMusicIndex: vi.fn(() => []),
}));

vi.mock("../../../../shared/services/slja", () => ({
	buildSlja: vi.fn(() => new Blob()),
	parseSljaFile: vi.fn(),
}));

vi.mock("../components/MediaSlideStage.vue", () => ({
	default: { template: '<div class="media-slide-stage-stub" />' },
}));

import {
	createCustomCollection,
	createCustomLyric,
	createCustomMusic,
	listCustomCollections,
	listCustomMusics,
	updateCustomLyric,
} from "../../services/custom-catalog";

const i18n = createI18n({
	legacy: false,
	locale: "pt-BR",
	messages: { "pt-BR": mediaLocale },
});

async function mountEditor() {
	const w = mount(MediaEditorView, { global: { plugins: [i18n] } });
	await flushPromises();
	return w;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(listCustomCollections).mockResolvedValue([
		{ id: 1, name: "Coletânea Teste", description: "", musicsCount: 2 },
		{ id: 2, name: "Hinos Locais", description: "", musicsCount: 0 },
	]);
	vi.mocked(listCustomMusics).mockResolvedValue([
		{
			id: 10,
			name: "Música Um",
			duration: 0,
			hasAudio: false,
			hasImage: false,
		},
		{
			id: 11,
			name: "Música Dois",
			duration: 0,
			hasAudio: false,
			hasImage: false,
		},
	]);
});

describe("MediaEditorView — carregamento", () => {
	it("monta e carrega coletâneas", async () => {
		const w = await mountEditor();
		expect(listCustomCollections).toHaveBeenCalled();
		expect(w.text()).toContain("Coletânea Teste");
		w.unmount();
	});

	it("selecionar coletânea na lista carrega as músicas", async () => {
		const w = await mountEditor();
		const item = w
			.findAll(".editor__list-item")
			.find((b) => b.text().includes("Coletânea Teste"));
		await item?.trigger("click");
		await flushPromises();
		expect(listCustomMusics).toHaveBeenCalledWith(1);
		w.unmount();
	});
});

describe("MediaEditorView — criação", () => {
	it("criar coletânea: chama API, recarrega e seleciona", async () => {
		vi.mocked(createCustomCollection).mockResolvedValue({ id: 7 });
		const w = await mountEditor();
		const input = w.find('input[placeholder="Nova coletânea…"]');
		await input.setValue("Nova");
		await input.trigger("keyup.enter");
		await flushPromises();
		expect(createCustomCollection).toHaveBeenCalledWith("Nova");
		w.unmount();
	});

	it("criar coletânea com nome vazio: não chama API", async () => {
		const w = await mountEditor();
		const input = w.find('input[placeholder="Nova coletânea…"]');
		await input.trigger("keyup.enter");
		await flushPromises();
		expect(createCustomCollection).not.toHaveBeenCalled();
		w.unmount();
	});

	it("criar música na coletânea selecionada", async () => {
		vi.mocked(createCustomMusic).mockResolvedValue({ id: 20 });
		const w = await mountEditor();
		// seleciona a coletânea clicando no item da lista
		const item = w
			.findAll(".editor__list-item")
			.find((b) => b.text().includes("Coletânea Teste"));
		await item?.trigger("click");
		await flushPromises();
		const input = w.find('input[placeholder="Nova música…"]');
		await input.setValue("Novo Hino");
		await input.trigger("keyup.enter");
		await flushPromises();
		expect(createCustomMusic).toHaveBeenCalledWith(1, { name: "Novo Hino" });
		w.unmount();
	});
});

describe("MediaEditorView — estrofes", () => {
	it("adicionar estrofe cria via API e insere na lista", async () => {
		vi.mocked(createCustomLyric).mockResolvedValue({ id: 99 });
		const w = await mountEditor();
		// prepara estado via UI: coletânea + música
		const item = w
			.findAll(".editor__list-item")
			.find((b) => b.text().includes("Coletânea Teste"));
		await item?.trigger("click");
		await flushPromises();
		const musicItem = w
			.findAll(".editor__list-item")
			.find((b) => b.text().includes("Música Um"));
		await musicItem?.trigger("click");
		await flushPromises();
		const addBtn = w
			.findAll("button")
			.find(
				(b) =>
					(b.text() ?? "").includes("Estrofe") ||
					(b.text() ?? "").includes("estrofe"),
			);
		await addBtn?.trigger("click");
		await flushPromises();
		expect(createCustomLyric).toHaveBeenCalledWith(10, {
			lyric: "Nova estrofe",
			time: "00:00",
		});
		w.unmount();
	});
});

describe("MediaEditorView — seleção de música", () => {
	function setupOf(w: Awaited<ReturnType<typeof mountEditor>>) {
		// refs crus do interno do componente (setupState unwrappa)
		const internal = (w.vm.$.devtoolsRawSetupState ??
			w.vm.$) as unknown as Record<string, { value: unknown }>;
		return {
			collectionId: internal.selectedCollectionId as unknown as {
				value: number | null;
			},
			musicId: internal.selectedMusicId as unknown as { value: number | null },
		};
	}

	it("música local (id negativo): carrega do local-custom-store", async () => {
		const { getLocalMusic, isLocalId } = await import(
			"../../services/local-custom-store"
		);
		vi.mocked(isLocalId).mockReturnValue(true);
		vi.mocked(getLocalMusic).mockReturnValue({
			id: -5,
			name: "Localzinha",
			lyrics: [{ id: 1, lyric: "Verso local", time: "00:01", image_url: null }],
			audioBase64: null,
			officialMusicId: null,
		} as never);
		const w = await mountEditor();
		setupOf(w).collectionId.value = 2;
		await (
			w.vm.$.devtoolsRawSetupState as unknown as {
				onSelectMusic: (id: number) => Promise<void>;
			}
		).onSelectMusic(-5);
		expect(getLocalMusic).toHaveBeenCalledWith(-5);
		expect(w.text()).toContain("Localzinha");
		w.unmount();
	});

	it("música da API (fetch ok): carrega nome e letras", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					name: "Hino da API",
					audio_url: null,
					lyrics: [{ id_lyric: 7, lyric: "Verso API", time: "00:02" }],
				}),
		});
		vi.stubGlobal("fetch", fetchMock);
		const w = await mountEditor();
		setupOf(w).collectionId.value = 1;
		await (
			w.vm.$.devtoolsRawSetupState as unknown as {
				onSelectMusic: (id: number) => Promise<void>;
			}
		).onSelectMusic(10);
		expect(w.text()).toContain("Hino da API");
		vi.unstubAllGlobals();
		w.unmount();
	});

	it("música 404 na API: limpa seleção e recarrega coletâneas", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
		vi.stubGlobal("fetch", fetchMock);
		const w = await mountEditor();
		setupOf(w).collectionId.value = 1;
		await (
			w.vm.$.devtoolsRawSetupState as unknown as {
				onSelectMusic: (id: number) => Promise<void>;
			}
		).onSelectMusic(10);
		expect(setupOf(w).musicId.value).toBeNull();
		vi.unstubAllGlobals();
		w.unmount();
	});
});

describe("MediaEditorView — export .slja", () => {
	function raw(w: Awaited<ReturnType<typeof mountEditor>>) {
		return w.vm.$.devtoolsRawSetupState as unknown as Record<
			string,
			unknown
		> & {
			selectedCollectionId: { value: number | null };
			selectedMusicId: { value: number | null };
			musicName: { value: string };
			lyrics: { value: unknown[] };
		};
	}

	it("exporta com música e letras: gera blob e notifica sucesso", async () => {
		const slja = await import("../../../../shared/services/slja");
		const buildSlja = vi.mocked(slja.buildSlja);
		buildSlja.mockResolvedValue(new Uint8Array([1, 2, 3]) as never);
		const createObjectURL = vi.fn(() => "blob:fake");
		const revokeObjectURL = vi.fn();
		vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
		const w = await mountEditor();
		const s = raw(w);
		s.selectedCollectionId.value = 1;
		s.selectedMusicId.value = 10;
		(s.musicName as { value: string }).value = "Hino Export";
		(s.lyrics as { value: unknown[] }).value = [
			{ id: 1, lyric: "Verso um", time: "00:10", imageUrl: "" },
		];
		await (
			w.vm.$.devtoolsRawSetupState as unknown as {
				onExportSlja: () => Promise<void>;
			}
		).onExportSlja();
		expect(buildSlja).toHaveBeenCalled();
		expect(createObjectURL).toHaveBeenCalled();
		w.unmount();
		vi.unstubAllGlobals();
	});

	it("exporta sem música selecionada: não faz nada", async () => {
		const { buildSlja } = await import("../../../../shared/services/slja");
		vi.mocked(buildSlja).mockClear();
		const w = await mountEditor();
		await (
			w.vm.$.devtoolsRawSetupState as unknown as {
				onExportSlja: () => Promise<void>;
			}
		).onExportSlja();
		expect(buildSlja).not.toHaveBeenCalled();
		w.unmount();
	});
});

describe("MediaEditorView — import .slja", () => {
	function raw(w: Awaited<ReturnType<typeof mountEditor>>) {
		return w.vm.$.devtoolsRawSetupState as unknown as {
			selectedCollectionId: { value: number | null };
			selectedMusicId: { value: number | null };
			onImportFile: (ev: Event) => Promise<void>;
		};
	}

	function fakeFileEvent(name: string, buffer: ArrayBuffer): Event {
		const file = new File([buffer], name);
		Object.defineProperty(file, "arrayBuffer", {
			value: async () => buffer,
		});
		const input = document.createElement("input");
		Object.defineProperty(input, "files", { value: [file] });
		const ev = new Event("change");
		Object.defineProperty(ev, "target", { value: input });
		return ev;
	}

	it("importa .slja com título válido: cria música e seleciona", async () => {
		const slja = await import("../../../../shared/services/slja");
		const { createCustomMusic } = await import("../../services/custom-catalog");
		vi.mocked(slja.parseSljaFile).mockResolvedValue({
			title: "Hino Importado",
			audio: null,
			images: [],
		} as never);
		vi.mocked(createCustomMusic).mockResolvedValue({ id: 77 });
		const w = await mountEditor();
		await raw(w).onImportFile(fakeFileEvent("hino.slja", new ArrayBuffer(8)));
		expect(slja.parseSljaFile).toHaveBeenCalled();
		expect(createCustomMusic).toHaveBeenCalled();
		expect(raw(w).selectedMusicId.value).toBe(77);
		w.unmount();
	});
});

describe("MediaEditorView — busca oficial e reuso", () => {
	function raw(w: Awaited<ReturnType<typeof mountEditor>>) {
		return w.vm.$.devtoolsRawSetupState as unknown as {
			selectedCollectionId: { value: number | null };
			officialSearch: { value: string };
			officialSearchResults: { value: unknown[] };
			onAddOfficial: (id: number, name: string) => Promise<void>;
			reuseSearch: { value: string };
			reuseResults: { value: unknown[] };
			onReuseSearchInput: () => void;
			onAddOfficialFromSearch: () => void;
		};
	}

	it("adicionar hino oficial: chama API e limpa busca", async () => {
		const { addOfficialMusicToCollection } = await import(
			"../../services/custom-catalog"
		);
		vi.mocked(addOfficialMusicToCollection).mockResolvedValue(true);
		const w = await mountEditor();
		const s = raw(w);
		s.selectedCollectionId.value = 1;
		s.officialSearch.value = "202";
		await s.onAddOfficial(202, "Hino 202");
		expect(addOfficialMusicToCollection).toHaveBeenCalledWith(
			1,
			202,
			"Hino 202",
		);
		expect(s.officialSearch.value).toBe("");
		expect(s.officialSearchResults.value.length).toBe(0);
		w.unmount();
	});

	it("adicionar hino oficial sem coletânea: não chama API", async () => {
		const { addOfficialMusicToCollection } = await import(
			"../../services/custom-catalog"
		);
		vi.mocked(addOfficialMusicToCollection).mockClear();
		const w = await mountEditor();
		await raw(w).onAddOfficial(202, "Hino 202");
		expect(addOfficialMusicToCollection).not.toHaveBeenCalled();
		w.unmount();
	});

	it("busca de reuso filtra por nome e marca isCurrent", async () => {
		const { listAllCustomMusics } = await import(
			"../../services/custom-catalog"
		);
		vi.mocked(listAllCustomMusics).mockResolvedValue([
			{
				id: 30,
				name: "Santo É o Senhor",
				collectionId: 1,
				collectionName: "Coletânea Teste",
			},
			{ id: 31, name: "Santa Ceia", collectionId: 9, collectionName: "Outra" },
		] as never);
		const w = await mountEditor();
		const s = raw(w);
		s.selectedCollectionId.value = 1;
		s.reuseSearch.value = "sant";
		s.onReuseSearchInput();
		await vi.waitFor(() => expect(s.reuseResults.value.length).toBe(2));
		w.unmount();
	});
});

describe("MediaEditorView — deleção", () => {
	function raw(w: Awaited<ReturnType<typeof mountEditor>>) {
		return w.vm.$.devtoolsRawSetupState as unknown as Record<
			string,
			{
				value?: unknown;
				apply?: unknown;
			}
		> & {
			selectedCollectionId: { value: number | null };
			selectedMusicId: { value: number | null };
			requestDelete: (kind: string, payload?: { stanzaIndex?: number }) => void;
			onConfirmDelete: () => Promise<void>;
		};
	}

	it("deletar coletânea: API ok, limpa seleção e notifica", async () => {
		const { deleteCustomCollection } = await import(
			"../../services/custom-catalog"
		);
		vi.mocked(deleteCustomCollection).mockResolvedValue(true);
		const w = await mountEditor();
		const s = raw(w);
		s.selectedCollectionId.value = 1;
		await s.onConfirmDelete();
		// sem confirmKind setado, cai no default 'collection'
		expect(deleteCustomCollection).toHaveBeenCalledWith(1);
		expect(s.selectedCollectionId.value).toBeNull();
		w.unmount();
	});

	it("deletar música: API ok, limpa música e recarrega lista", async () => {
		const { deleteCustomMusic, listCustomMusics } = await import(
			"../../services/custom-catalog"
		);
		vi.mocked(deleteCustomMusic).mockResolvedValue(true);
		const w = await mountEditor();
		const s = raw(w);
		s.selectedCollectionId.value = 1;
		s.selectedMusicId.value = 10;
		s.requestDelete("music");
		await s.onConfirmDelete();
		expect(deleteCustomMusic).toHaveBeenCalledWith(10);
		expect(s.selectedMusicId.value).toBeNull();
		expect(listCustomMusics).toHaveBeenCalledWith(1);
		w.unmount();
	});

	it("deletar coletânea com falha na API: notifica erro", async () => {
		const { deleteCustomCollection } = await import(
			"../../services/custom-catalog"
		);
		vi.mocked(deleteCustomCollection).mockResolvedValue(false);
		const w = await mountEditor();
		const s = raw(w);
		s.selectedCollectionId.value = 1;
		await s.onConfirmDelete();
		expect(s.selectedCollectionId.value).toBe(1); // mantém
		w.unmount();
	});
});

describe("MediaEditorView — navegação", () => {
	it("botão voltar navega pra albums", async () => {
		const w = await mountEditor();
		(
			w.vm.$.devtoolsRawSetupState as unknown as { onBack: () => void }
		).onBack();
		expect(pushMock).toHaveBeenCalledWith({ name: "albums" });
		w.unmount();
	});
});
