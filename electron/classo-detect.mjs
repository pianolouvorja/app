/**
 * Detector da instalação do LouvorJA Classo (Delphi).
 *
 * Funções PURAS (injetáveis) para testar sem registry/disco real.
 * O main chama detectClassoInstallation() via IPC; nunca escaneia o
 * disco inteiro — só registry (Windows) + paths padrão.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, win32 } from "node:path";

/**
 * Candidatos de diretório de instalação do Classo, em ordem de confiança.
 * Registry é verificado separadamente (apenas Windows real).
 * @returns {string[]}
 */
export function classoCandidatePaths({ programFiles = "C:\\Program Files",
  programFilesX86 = "C:\\Program Files (x86)",
  localAppData = null } = {}) {
  // win32.join garante separador \ mesmo rodando os testes no Linux.
  const candidates = [
    "C:\\LouvorJA",
    win32.join(programFiles, "LouvorJA"),
    win32.join(programFilesX86, "LouvorJA"),
  ];
  if (localAppData) candidates.push(win32.join(localAppData, "LouvorJA"));
  return candidates;
}

/**
 * Uma instalação é confirmada se configPT.ja existe no diretório.
 * @param {string} dir
 * @param {(p: string) => boolean} exists
 */
export function looksLikeClassoInstall(dir, exists = existsSync) {
  return exists(join(dir, "configPT.ja"));
}

/**
 * Descobre subpastas de mídia (MP3/capas/slides) dentro da instalação.
 * Classo real usa estrutura variável; varremos 2 níveis procurando
 * arquivos de áudio e agrupando por diretório-pai (nome de álbum).
 * @param {string} root
 * @param {{readdir?: (p: string) => string[], stat?: (p: string) => {isDirectory(): boolean, size: number}, join?: (...a: string[]) => string, audioExts?: string[]}} io
 * @returns {{ albums: { name: string, dir: string, files: string[], bytes: number }[], totalBytes: number }}
 */
export function scanClassoMedia(root, io = {}) {
  const readdir = io.readdir ?? readdirSync;
  const stat = io.stat ?? statSync;
  const joinPath = io.join ?? join;
  const audioExts = io.audioExts ?? [".mp3", ".wav", ".ogg", ".m4a"];

  const albums = new Map();
  let totalBytes = 0;

  const walk = (dir, depth) => {
    if (depth > 2) return;
    let entries;
    try {
      entries = readdir(dir);
    } catch {
      return; // sem permissão — ignora silenciosamente
    }
    for (const entry of entries) {
      const full = joinPath(dir, entry);
      let st;
      try {
        st = stat(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
      if (!audioExts.includes(ext)) continue;
      const albumName = dir === root ? "." : dir.split(/[\\/]/).pop();
      if (!albums.has(albumName)) {
        albums.set(albumName, { name: albumName, dir, files: [], bytes: 0 });
      }
      const album = albums.get(albumName);
      album.files.push(full);
      album.bytes += st.size;
      totalBytes += st.size;
    }
  };

  walk(root, 0);
  return { albums: [...albums.values()], totalBytes };
}

/**
 * Arquivos de dados importáveis na raiz da instalação.
 * @param {string} root
 * @param {{exists?: (p: string) => boolean, join?: (...a: string[]) => string}} io
 */
export function findClassoDataFiles(root, io = {}) {
  const exists = io.exists ?? existsSync;
  const joinPath = io.join ?? join;
  return {
    liturgiaJa: exists(joinPath(root, "liturgia.ja")) ? joinPath(root, "liturgia.ja") : null,
    itensAgendados: exists(joinPath(root, "itensAgendados.xml"))
      ? joinPath(root, "itensAgendados.xml")
      : null,
    itensAgendadosCategorias: exists(joinPath(root, "itensAgendadosCategorias.xml"))
      ? joinPath(root, "itensAgendadosCategorias.xml")
      : null,
    configPt: joinPath(root, "configPT.ja"),
  };
}

/**
 * Detecção completa. `registryProbe` (opcional) devolve um dir sugerido pelo
 * registro do Windows — injetado pelo main real, mockado nos testes.
 * @param {{registryProbe?: () => string | null, exists?: (p: string) => boolean}} opts
 */
export function detectClassoInstallation(opts = {}) {
  const exists = opts.exists ?? existsSync;
  const registryProbe = opts.registryProbe ?? (() => null);
  // classoCandidates: sobrescreve os paths padrão (usado nos testes em Linux,
  // onde C:\ não existe; no Windows real fica undefined e usa o padrão).
  const candidates = opts.classoCandidates
    ? [...opts.classoCandidates]
    : [...classoCandidatePaths()];
  const fromRegistry = registryProbe();
  if (fromRegistry) candidates.unshift(fromRegistry);

  for (const dir of candidates) {
    if (!looksLikeClassoInstall(dir, exists)) continue;
    return {
      found: true,
      root: dir,
      media: scanClassoMedia(dir, opts.io ?? {}),
      dataFiles: findClassoDataFiles(dir, { exists }),
    };
  }
  return { found: false, root: null, media: { albums: [], totalBytes: 0 }, dataFiles: null };
}

/**
 * Lê o diretório de instalação do Classo do registro do Windows (real).
 * Usa `reg query` (sempre presente no Windows); em outros SO retorna null.
 * Chaves candidatas: HKCU/HKLM\Software\LouvorJA (valor InstallPath ou
 * padrão). Nunca lança — falha de registry = sem sugestão.
 * @returns {string | null}
 */
export function probeClassoRegistry() {
  if (process.platform !== "win32") return null;
  for (const hive of ["HKCU", "HKLM"]) {
    for (const valueName of ["InstallPath", "Path", ""]) {
      try {
        const key = `${hive}\\Software\\LouvorJA`;
        const args = ["query", key];
        if (valueName) args.push("/v", valueName);
        else args.push("/ve");
        const out = execFileSync("reg", args, { encoding: "utf8", timeout: 3000 });
        const match = out.match(/\s(REG_SZ)\s(.+)$/m);
        if (match?.[2]) {
          const dir = match[2].trim();
          if (dir) return dir;
        }
      } catch {
        // chave/valor inexistente — tenta próxima
      }
    }
  }
  return null;
}
