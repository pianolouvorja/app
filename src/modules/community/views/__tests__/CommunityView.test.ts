// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// vi.mock é HOISTED: refs aos mocks precisam de vi.hoisted (sino do load morrer silencioso)
const mocks = vi.hoisted(() => {
	return {
		getNotifications: vi.fn(async () => []),
		markAllRead: vi.fn(async () => undefined),
		listCommunityCollectionsPage: vi.fn(async () => ({
			items: [],
			page: 1,
			lastPage: 1,
			total: 0,
		})),
		getWeeklyTasks: vi.fn(async () => null),
		getSeasonalEvent: vi.fn(async () => null),
		getSession: vi.fn(() => ({ token: "tok-123", user: { id: 4 } })),
	};
});

vi.mock("../../services/notifications", () => ({
	getNotifications: mocks.getNotifications,
	markAllRead: mocks.markAllRead,
}));
vi.mock("../../services/community-catalog", () => ({
	listCommunityCollectionsPage: mocks.listCommunityCollectionsPage,
	saveCommunityCopy: vi.fn(),
	sortByRecentFirst: (xs: unknown[]) => xs,
}));
vi.mock("../../services/weekly-tasks", () => ({
	getWeeklyTasks: mocks.getWeeklyTasks,
	completeWeeklyTask: vi.fn(),
}));
vi.mock("../../services/ranking", () => ({
	getRanking: vi.fn(async () => ({ data: [] })),
	registerUse: vi.fn(async () => true),
	reportCollection: vi.fn(async () => true),
}));
vi.mock("../../services/seasonal-event", () => ({
	getSeasonalEvent: mocks.getSeasonalEvent,
}));
vi.mock("@modules/media/services/auth-client", () => ({
	getAuthSession: mocks.getSession,
}));
vi.mock("@design-system/index", () => ({
	GlassCard: {
		name: "GlassCard",
		template: '<div class="glass-card-mock"><slot /></div>',
	},
}));
vi.mock("vue-router", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("vue-i18n", () => ({
	useI18n: () => ({ t: (k: string) => k, locale: { value: "pt-BR" } }),
	createI18n: () => ({ global: { locale: "pt-BR", t: (k: string) => k } }),
}));

import CommunityView from "../CommunityView.vue";

const NOTIFS = [
	{
		id: 1,
		type: "music_promoted",
		title: "Promovida",
		body: "Sua musica foi promovida!",
		created_at: "2026-09-16T12:00:00Z",
	},
	{
		id: 2,
		type: "badge_granted",
		title: "Badge",
		body: "Nova badge",
		created_at: "2026-09-16T13:00:00Z",
	},
];

// jsdom não implementa scrollTo em Element
beforeEach(() => {
	Element.prototype.scrollTo = (() => {}) as unknown as typeof Element.prototype.scrollTo;
});

async function mountView() {
	const wrapper = mount(CommunityView);
	await flushPromises();
	await flushPromises();
	return wrapper;
}

describe("CommunityView — carregamento popula estado (regressão do bug do sino)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getNotifications.mockResolvedValue(NOTIFS);
		mocks.getSession.mockReturnValue({ token: "tok-123", user: { id: 4 } });
	});

	it("popula notifications a partir do service (antes: dados eram descartados)", async () => {
		const wrapper = await mountView();
		expect(wrapper.vm.notifications).toHaveLength(2);
		expect(wrapper.vm.notifications[0].id).toBe(1);
		expect(mocks.getNotifications).toHaveBeenCalledTimes(1);
	});

	it("isLogged = true quando há sessão com token", async () => {
		const wrapper = await mountView();
		expect(wrapper.vm.isLogged).toBe(
			true,
		);
	});

	it("sem sessão: isLogged = false e o sino NÃO renderiza", async () => {
		mocks.getSession.mockReturnValue(null);
		const wrapper = await mountView();
		expect(wrapper.vm.isLogged).toBe(
			false,
		);
		expect(wrapper.find(".community-view__bell").exists()).toBe(false);
	});

	it("renderiza o sino quando logado", async () => {
		const wrapper = await mountView();
		expect(wrapper.find(".community-view__bell").exists()).toBe(true);
	});

	it("coleções paginadas populam o grid (24 por página)", async () => {
		mocks.listCommunityCollectionsPage.mockResolvedValue({
			items: [{ id: 9, name: "X", musicsCount: 1, authorName: "A" }],
			page: 2,
			lastPage: 5,
			total: 100,
		});
		const wrapper = await mountView();
		expect(wrapper.vm.collections).toHaveLength(1);
		expect(wrapper.vm.page).toBe(2);
		expect(wrapper.vm.lastPage).toBe(5);
	});
});

describe("NotificationsDropdown — interação (regressão do armed-gate)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Element.prototype.scrollTo = (() => {}) as unknown as typeof Element.prototype.scrollTo;
		mocks.getNotifications.mockResolvedValue(NOTIFS);
		mocks.getSession.mockReturnValue({ token: "tok-123", user: { id: 4 } });
	});

	it("badge mostra o número de não lidas", async () => {
		const wrapper = await mountView();
		expect(wrapper.find(".community-view__bell-badge").text()).toBe("2");
	});

	it("clique no sino abre o dropdown; clique de novo (toggle) fecha", async () => {
		const wrapper = await mountView();
		const bell = wrapper.find(".community-view__bell");
		await bell.trigger("click");
		expect(
			wrapper.findComponent({ name: "NotificationsDropdown" }).exists(),
		).toBe(true);
		await bell.trigger("click");
		expect(
			wrapper.findComponent({ name: "NotificationsDropdown" }).exists(),
		).toBe(false);
	});

	it("mark-read: limpa as notificações (badge some)", async () => {
		const wrapper = await mountView();
		await wrapper.find(".community-view__bell").trigger("click");
		wrapper
			.findComponent({ name: "NotificationsDropdown" })
			.vm.$emit("mark-read");
		await flushPromises();
		expect(
			wrapper.vm.notifications,
		).toEqual([]);
		expect(wrapper.find(".community-view__bell-badge").exists()).toBe(false);
	});

	it("close: fecha SEM marcar como lida (notificações preservadas)", async () => {
		const wrapper = await mountView();
		await wrapper.find(".community-view__bell").trigger("click");
		wrapper
			.findComponent({ name: "NotificationsDropdown" })
			.vm.$emit("close");
		await flushPromises();
		expect(
			wrapper.vm.notifications,
		).toHaveLength(2);
		expect(mocks.markAllRead).not.toHaveBeenCalled();
		expect(
			wrapper.findComponent({ name: "NotificationsDropdown" }).exists(),
		).toBe(false);
	});

	it("botão 'marcar lidas' chama service 1x, limpa estado e fecha (markAndClose)", async () => {
		const wrapper = await mountView();
		await wrapper.find(".community-view__bell").trigger("click");
		// Teleport to="body": buscar o botão no document, não no wrapper
		const markBtn = document.body.querySelector(".notif-dropdown__mark");
		expect(markBtn).not.toBeNull();
		markBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();
		expect(mocks.markAllRead).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.notifications).toEqual([]);
		expect(
			wrapper.findComponent({ name: "NotificationsDropdown" }).exists(),
		).toBe(false);
	});
});
