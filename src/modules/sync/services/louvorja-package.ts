/**
 * Codec do pacote `.louvorja` — formato ÚNICO entre Desktop (Electron),
 * Web (PWA) e Mobile (APK).
 *
 * Espelha `sync_package.dart` do Flutter (schema 1):
 * - `schema` obrigatório (=1); schema do futuro → erro explícito.
 * - Entidades: `liturgy`, `settings`, `timerPresets` (desconhecidas são
 *   preservadas — forward-compatible).
 * - Conflitos: last-write-wins por entidade (timestamp `modified` ISO-8601).
 */

export const LOUVORJA_SCHEMA_VERSION = 1;

export type LouvorjaSyncEntity = {
	type: string;
	/** ISO-8601. String vazia/inválida = epoch (perde no LWW). */
	modified: string;
	data: Record<string, unknown>;
};

export type LouvorjaSyncPackage = {
	schema: number;
	appVersion?: string;
	platform?: string;
	exportedAt?: string;
	entities: Record<string, LouvorjaSyncEntity>;
};

export function encodeLouvorjaPackage(pkg: LouvorjaSyncPackage): string {
	return JSON.stringify(pkg);
}

function toEpoch(iso: string): number {
	const t = Date.parse(iso);
	return Number.isFinite(t) ? t : 0;
}

export function decodeLouvorjaPackage(raw: string): LouvorjaSyncPackage {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("Pacote .louvorja inválido (JSON malformado)");
	}
	if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Pacote .louvorja inválido (raiz não é objeto)");
	}
	const source = parsed as Record<string, unknown>;
	if (source.schema !== LOUVORJA_SCHEMA_VERSION) {
		throw new Error(
			`Pacote .louvorja com schema incompatível (${String(source.schema)})`,
		);
	}

	const entities: Record<string, LouvorjaSyncEntity> = {};
	const rawEntities = source.entities;
	if (
		rawEntities != null &&
		typeof rawEntities === "object" &&
		!Array.isArray(rawEntities)
	) {
		for (const [key, value] of Object.entries(
			rawEntities as Record<string, unknown>,
		)) {
			if (value == null || typeof value !== "object") continue;
			const ent = value as Record<string, unknown>;
			entities[key] = {
				type: typeof ent.type === "string" ? ent.type : key,
				modified: typeof ent.modified === "string" ? ent.modified : "",
				data:
					ent.data != null &&
					typeof ent.data === "object" &&
					!Array.isArray(ent.data)
						? (ent.data as Record<string, unknown>)
						: {},
			};
		}
	}

	return {
		schema: LOUVORJA_SCHEMA_VERSION,
		appVersion:
			typeof source.appVersion === "string" ? source.appVersion : undefined,
		platform: typeof source.platform === "string" ? source.platform : undefined,
		exportedAt:
			typeof source.exportedAt === "string" ? source.exportedAt : undefined,
		entities,
	};
}

/**
 * LWW entre duas versões da mesma entidade.
 * Empate ou timestamp inválido → prefere `remote` (comportamento do
 * SyncAdapter do APK: importa quando `remote.modified` >= local).
 */
export function mergeEntities(
	local: LouvorjaSyncEntity,
	remote: LouvorjaSyncEntity,
): LouvorjaSyncEntity {
	return toEpoch(remote.modified) >= toEpoch(local.modified) ? remote : local;
}

/** Nome canônico de arquivo: `louvorja-AAAA-MM-DD.louvorja`. */
export function fileNameFor(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `louvorja-${y}-${m}-${d}.louvorja`;
}

export function isValidLouvorjaContent(raw: string): boolean {
	try {
		decodeLouvorjaPackage(raw);
		return true;
	} catch {
		return false;
	}
}
