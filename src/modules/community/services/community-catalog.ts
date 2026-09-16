/**
 * Catálogo da Comunidade — coletâneas PÚBLICAS (read-only).
 * F0 do Ranking/Gamificação (SPEC validada 16/09).
 *
 * A listagem pública vem do GET /v1/custom/collections SEM sessão:
 * a API já filtra `visibility='public'` para requisições anônimas
 * (custom.routes.ts). Este serviço NUNCA envia credenciais e NUNCA
 * expõe email — só author_name.
 */

export type CommunityCollectionSummary = {
	id: number;
	name: string;
	description: string | null;
	coverUrl: string | null;
	authorName: string | null;
	musicsCount: number;
	updatedAt: string | null;
};

function communityBaseUrl(): string {
	// Mesma regra do custom-catalog.ts: default é a API de produção
	// (sem env, caminho relativo dá 404 no desktop).
	const base =
		import.meta.env.VITE_PALCO_API_URL ?? "https://api.pianolouvorja.com.br";
	return `${base.replace(/\/$/, "")}/v1/custom`;
}

function asString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/** Ordena por updated_at DESC (mais recentes primeiro); null vai pro fim. */
export function sortByRecentFirst(
	collections: CommunityCollectionSummary[],
): CommunityCollectionSummary[] {
	return [...collections].sort((a, b) => {
		const ta = a.updatedAt ? Date.parse(a.updatedAt.replace(" ", "T")) : 0;
		const tb = b.updatedAt ? Date.parse(b.updatedAt.replace(" ", "T")) : 0;
		return tb - ta;
	});
}

/**
 * Lista coletâneas públicas da comunidade.
 * Requisição deliberadamente ANÔNIMA (usuário deslogado também vê — B7).
 * Qualquer falha → lista vazia (nunca lança).
 */
export async function listCommunityCollections(): Promise<
	CommunityCollectionSummary[]
> {
	let rows: Array<Record<string, unknown>> = [];
	try {
		const response = await fetch(`${communityBaseUrl()}/collections`);
		if (!response.ok) return [];
		const json = (await response.json()) as { data?: unknown };
		if (!Array.isArray(json.data)) return [];
		rows = json.data as Array<Record<string, unknown>>;
	} catch {
		return [];
	}

	const collections = rows.map((row) => ({
		id: Number(row.id_collection),
		name: asString(row.name) ?? "",
		description: asString(row.description),
		coverUrl: asString(row.cover_url),
		authorName: asString(row.author_name),
		musicsCount: Number.isFinite(Number(row.musics_count))
			? Number(row.musics_count)
			: 0,
		updatedAt: asString(row.updated_at),
	}));

	return sortByRecentFirst(collections);
}
