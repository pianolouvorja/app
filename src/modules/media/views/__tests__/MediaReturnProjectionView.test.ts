// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";
import mediaLocale from "../../locales/pt-BR";
/**
 * MediaReturnProjectionView — palco "retorno" com transições entre frases,
 * barra de progresso e preview da próxima frase. Mesma fonte standalone do
 * MediaProjectionView (storage + BroadcastChannel).
 */
import {
	MEDIA_RUNTIME_CHANNEL,
	MEDIA_RUNTIME_STORAGE_KEY,
} from "../../services/media-runtime";
import MediaReturnProjectionView from "../MediaReturnProjectionView.vue";

const i18n = createI18n({
	legacy: false,
	locale: "pt-BR",
	messages: { "pt-BR": mediaLocale },
});

function runtimePayload(over: Record<string, unknown> = {}) {
	return {
		active: true,
		title: "Santíssimo",
		subtitle: "Athus Santos",
		lyric: "Santo, Santo, Santo",
		imageUrl: null,
		imagePosition: null,
		isCover: false,
		slideIndex: 0,
		slideCount: 8,
		nextLyric: "Digno é o Cordeiro",
		nextIsCover: false,
		progressRatio: 0.2,
		slideProgressRatio: 0.4,
		...over,
	};
}

async function mountView() {
	const w = mount(MediaReturnProjectionView, { global: { plugins: [i18n] } });
	// onMounted aplica o runtime pós-primeiro render
	await w.vm.$nextTick();
	await w.vm.$nextTick();
	return w;
}

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

describe("MediaReturnProjectionView", () => {
	it("inativa: não mostra frase nem título", async () => {
		localStorage.setItem(
			MEDIA_RUNTIME_STORAGE_KEY,
			JSON.stringify(runtimePayload({ active: false })),
		);
		const w = await mountView();
		expect(w.text()).not.toContain("Santo, Santo, Santo");
		expect(w.text()).not.toContain("Santíssimo");
		w.unmount();
	});

	it("ativa com letra: mostra a frase atual", async () => {
		localStorage.setItem(
			MEDIA_RUNTIME_STORAGE_KEY,
			JSON.stringify(runtimePayload()),
		);
		const w = await mountView();
		expect(w.text()).toContain("Santo, Santo, Santo");
		w.unmount();
	});

	it("ativa com próxima frase: mostra preview do next", async () => {
		localStorage.setItem(
			MEDIA_RUNTIME_STORAGE_KEY,
			JSON.stringify(runtimePayload()),
		);
		const w = await mountView();
		expect(w.text()).toContain("Digno é o Cordeiro");
		w.unmount();
	});

	it("capa: mostra o título como frase", async () => {
		localStorage.setItem(
			MEDIA_RUNTIME_STORAGE_KEY,
			JSON.stringify(runtimePayload({ isCover: true, lyric: "" })),
		);
		const w = await mountView();
		expect(w.text()).toContain("Santíssimo");
		w.unmount();
	});

	it("storage event atualiza a frase", async () => {
		const w = await mountView();
		expect(w.text()).not.toContain("Santo, Santo, Santo");
		window.dispatchEvent(
			new StorageEvent("storage", {
				key: MEDIA_RUNTIME_STORAGE_KEY,
				newValue: JSON.stringify(runtimePayload()),
			}),
		);
		await w.vm.$nextTick();
		expect(w.text()).toContain("Santo, Santo, Santo");
		w.unmount();
	});

	it("storage event com JSON inválido não quebra", async () => {
		const w = await mountView();
		window.dispatchEvent(
			new StorageEvent("storage", {
				key: MEDIA_RUNTIME_STORAGE_KEY,
				newValue: "{quebrado",
			}),
		);
		await w.vm.$nextTick();
		expect(w.find(".media-return").exists()).toBe(true);
		w.unmount();
	});

	it("storage event de outra chave é ignorado", async () => {
		localStorage.setItem(
			MEDIA_RUNTIME_STORAGE_KEY,
			JSON.stringify(runtimePayload()),
		);
		const w = await mountView();
		window.dispatchEvent(
			new StorageEvent("storage", {
				key: "outra",
				newValue: '{"active":false}',
			}),
		);
		await w.vm.$nextTick();
		expect(w.text()).toContain("Santo, Santo, Santo");
		w.unmount();
	});

	it("BroadcastChannel atualiza a frase", async () => {
		const w = await mountView();
		const ch = new BroadcastChannel(MEDIA_RUNTIME_CHANNEL);
		ch.postMessage(runtimePayload({ lyric: "Frase Via Channel" }));
		await vi.waitFor(() => expect(w.text()).toContain("Frase Via Channel"));
		ch.close();
		w.unmount();
	});
});
