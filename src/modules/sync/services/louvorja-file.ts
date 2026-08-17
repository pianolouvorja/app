/**
 * Exportação/importação do arquivo `.louvorja` no browser/renderer.
 *
 * Browser moderno (Chromium 86+): File System Access API (save/open picker).
 * Electron: usa a bridge `dialog.openFile` do preload para escolher o arquivo
 * de importação; exportação no Electron ainda via download simples.
 *
 * Espelha `sync_file_service.dart` do APK (SAF): o usuário escolhe onde salvar
 * e de onde ler — o app nunca escreve em caminho arbitrário.
 */

import { fileNameFor } from "./louvorja-package";

type WritableLike = {
	write: (chunk: BlobPart) => Promise<void>;
	close: () => Promise<void>;
};

type SaveHandleLike = {
	createWritable: () => Promise<WritableLike>;
};

type OpenHandleLike = {
	getFile: () => Promise<File>;
};

function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

/** Exporta o conteúdo cru do pacote. Retorna false se o usuário cancelou. */
export async function exportLouvorjaFile(raw: string): Promise<boolean> {
	const picker = (
		window as unknown as {
			showSaveFilePicker?: (opts: unknown) => Promise<SaveHandleLike>;
		}
	).showSaveFilePicker;

	if (typeof picker !== "function") {
		// Fallback: download clássico (Electron incluído)
		return downloadFallback(raw);
	}

	try {
		const handle = await picker({
			suggestedName: fileNameFor(new Date()),
			types: [
				{
					description: "Pacote LouvorJA",
					accept: { "application/json": [".louvorja"] },
				},
			],
		});
		const writable = await handle.createWritable();
		await writable.write(new Blob([raw], { type: "application/json" }));
		await writable.close();
		return true;
	} catch (error) {
		if (isAbort(error)) return false;
		return downloadFallback(raw);
	}
}

function downloadFallback(raw: string): boolean {
	try {
		const url = URL.createObjectURL(
			new Blob([raw], { type: "application/json" }),
		);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileNameFor(new Date());
		a.click();
		URL.revokeObjectURL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Importa: devolve o conteúdo cru do arquivo ou null (cancelou/erro).
 */
export async function importLouvorjaFile(): Promise<string | null> {
	const picker = (
		window as unknown as {
			showOpenFilePicker?: (opts: unknown) => Promise<OpenHandleLike[]>;
		}
	).showOpenFilePicker;

	if (typeof picker !== "function") {
		return inputFallback();
	}

	try {
		const [handle] = await picker({
			types: [
				{
					description: "Pacote LouvorJA",
					accept: { "application/json": [".louvorja", ".json"] },
				},
			],
			multiple: false,
		});
		if (!handle) return null;
		const file = await handle.getFile();
		return await file.text();
	} catch (error) {
		if (isAbort(error)) return null;
		return null;
	}
}

function inputFallback(): Promise<string | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".louvorja,.json,application/json";
		input.onchange = () => {
			const file = input.files?.[0];
			if (!file) {
				resolve(null);
				return;
			}
			file
				.text()
				.then(resolve)
				.catch(() => resolve(null));
		};
		// Sem evento cancel confiável cross-browser — resolve null se nada escolhido
		input.click();
	});
}
