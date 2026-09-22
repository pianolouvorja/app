// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * p2p-remote-host — WebRTC 2-QR. Mocks de RTCPeerConnection/DataChannel
 * com estados controláveis e ICE gathering instantâneo.
 */

class FakeDataChannel {
	readyState = "connecting";
	sent: string[] = [];
	onopen: (() => void) | null = null;
	onclose: (() => void) | null = null;
	onmessage: ((ev: { data: string }) => void) | null = null;

	send(data: string) {
		this.sent.push(data);
	}

	close() {
		this.readyState = "closed";
		this.onclose?.();
	}

	openIt() {
		this.readyState = "open";
		this.onopen?.();
	}

	receive(data: unknown) {
		this.onmessage?.({
			data: typeof data === "string" ? data : JSON.stringify(data),
		});
	}
}

class FakePeerConnection {
	static instances: FakePeerConnection[] = [];
	iceGatheringState = "complete";
	localDescription: Record<string, unknown> | null = null;
	onicecandidate = null;

	createdChannel: FakeDataChannel | null = null;

	createDataChannel() {
		this.createdChannel = new FakeDataChannel();
		return this.createdChannel;
	}

	async createOffer() {
		return { type: "offer", sdp: "offer-sdp" };
	}

	async setLocalDescription(desc: unknown) {
		this.localDescription = desc as Record<string, unknown>;
	}

	async setRemoteDescription(desc: unknown) {
		if ((desc as { sdp?: string }).sdp === "bad") {
			throw new Error("bad sdp");
		}
		this.remoteDesc = desc;
	}

	remoteDesc: unknown = null;

	addEventListener() {}

	removeEventListener() {}

	close() {
		this.closed = true;
	}

	closed = false;
}

vi.stubGlobal(
	"RTCPeerConnection",
	FakePeerConnection as unknown as typeof RTCPeerConnection,
);

import { P2pRemoteHost } from "../p2p-remote-host";

beforeEach(() => {
	FakePeerConnection.instances.length = 0;
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("P2pRemoteHost", () => {
	it("createOffer retorna SDP serializado com canal criado", async () => {
		const host = new P2pRemoteHost();
		const offer = await host.createOffer();
		const parsed = JSON.parse(offer);
		expect(parsed.type).toBe("offer");
		expect(parsed.sdp).toBe("offer-sdp");
	});

	it("acceptAnswer válido aplica remote description → true", async () => {
		const host = new P2pRemoteHost();
		await host.createOffer();
		const ok = await host.acceptAnswer(
			JSON.stringify({ type: "answer", sdp: "ok" }),
		);
		expect(ok).toBe(true);
	});

	it("acceptAnswer inválido → false", async () => {
		const host = new P2pRemoteHost();
		await host.createOffer();
		expect(await host.acceptAnswer("nao-json{")).toBe(false);
	});

	it("acceptAnswer com sdp rejeitado → false (catch)", async () => {
		const host = new P2pRemoteHost();
		await host.createOffer();
		expect(
			await host.acceptAnswer(JSON.stringify({ type: "answer", sdp: "bad" })),
		).toBe(false);
	});

	it("acceptAnswer sem offer prévio → false", async () => {
		const host = new P2pRemoteHost();
		expect(await host.acceptAnswer("{}")).toBe(false);
	});

	it("send só funciona com canal aberto; isOpen reflete estado", async () => {
		const host = new P2pRemoteHost();
		expect(host.isOpen).toBe(false);
		host.send({ a: 1 }); // canal null → no-op
		await host.createOffer();
		expect(host.isOpen).toBe(false);
		// pega o canal criado via última instância
		const pc = (host as unknown as { pc: FakePeerConnection }).pc;
		const ch = pc.createdChannel!;
		ch.openIt();
		expect(host.isOpen).toBe(true);
		host.send({ hello: true });
		expect(ch.sent).toEqual([JSON.stringify({ hello: true })]);
	});

	it("onMessage recebe JSON parseado; não-JSON é ignorado", async () => {
		const host = new P2pRemoteHost();
		const received: unknown[] = [];
		host.onMessage = (d) => received.push(d);
		await host.createOffer();
		const pc = (host as unknown as { pc: FakePeerConnection }).pc;
		const ch = pc.createdChannel!;
		ch.receive({ cmd: "play" });
		expect(received).toEqual([{ cmd: "play" }]);
		ch.receive("{quebrado");
		expect(received).toHaveLength(1);
	});

	it("onOpen/onClose disparam com o canal", async () => {
		const host = new P2pRemoteHost();
		const opened = vi.fn();
		const closed = vi.fn();
		host.onOpen = opened;
		host.onClose = closed;
		await host.createOffer();
		const pc = (host as unknown as { pc: FakePeerConnection }).pc;
		const ch = pc.createdChannel!;
		ch.openIt();
		ch.close();
		expect(opened).toHaveBeenCalled();
		expect(closed).toHaveBeenCalled();
	});

	it("createOffer de novo faz cleanup do anterior", async () => {
		const host = new P2pRemoteHost();
		await host.createOffer();
		const first = (host as unknown as { pc: FakePeerConnection }).pc;
		await host.createOffer();
		const second = (host as unknown as { pc: FakePeerConnection }).pc;
		expect(first).not.toBe(second);
		expect(first.closed).toBe(true);
	});

	it("destroy fecha tudo", async () => {
		const host = new P2pRemoteHost();
		await host.createOffer();
		const pc = (host as unknown as { pc: FakePeerConnection }).pc;
		host.destroy();
		expect(pc.closed).toBe(true);
		expect((host as unknown as { channel: unknown }).channel).toBeNull();
	});
});

describe("P2pRemoteHost — waitForIce ramo slow", () => {
	it("ICE em gathering aguarda evento de complete", async () => {
		vi.useFakeTimers();
		try {
			class SlowPC extends FakePeerConnection {
				iceGatheringState = "gathering";
				private listeners: Array<() => void> = [];
				addEventListener(_t: string, cb: () => void) {
					this.listeners.push(cb);
				}
				completeIce() {
					this.iceGatheringState = "complete";
					this.listeners.forEach((cb) => cb());
				}
			}
			vi.stubGlobal(
				"RTCPeerConnection",
				SlowPC as unknown as typeof RTCPeerConnection,
			);
			const host = new P2pRemoteHost();
			const promise = host.createOffer();
			// deixa o waitForIce pendurar o listener
			await vi.advanceTimersByTimeAsync(1);
			const pc = (host as unknown as { pc: SlowPC }).pc;
			pc.completeIce();
			const offer = await promise;
			expect(JSON.parse(offer).type).toBe("offer");
		} finally {
			vi.useRealTimers();
			vi.stubGlobal(
				"RTCPeerConnection",
				FakePeerConnection as unknown as typeof RTCPeerConnection,
			);
		}
	});

	it("ICE que nunca completa cai no timeout de 5s", async () => {
		vi.useFakeTimers();
		try {
			class StuckPC extends FakePeerConnection {
				iceGatheringState = "gathering";
			}
			vi.stubGlobal(
				"RTCPeerConnection",
				StuckPC as unknown as typeof RTCPeerConnection,
			);
			const host = new P2pRemoteHost();
			const promise = host.createOffer();
			await vi.advanceTimersByTimeAsync(5_100);
			const offer = await promise;
			expect(JSON.parse(offer).type).toBe("offer");
		} finally {
			vi.useRealTimers();
			vi.stubGlobal(
				"RTCPeerConnection",
				FakePeerConnection as unknown as typeof RTCPeerConnection,
			);
		}
	});

	it("ICE já completo retorna direto (ramo fast)", async () => {
		const host = new P2pRemoteHost();
		const offer = await host.createOffer();
		expect(JSON.parse(offer).sdp).toBe("offer-sdp");
	});
});
