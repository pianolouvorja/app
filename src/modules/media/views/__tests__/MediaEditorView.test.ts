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

vi.mock("../../../shared/services/slja", () => ({
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
