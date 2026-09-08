/**
 * Decodifica bytes de arquivo de texto.
 * UTF-8 estrito primeiro; se falhar (ANSI/Windows-1252 comum em .txt do
 * Bloco de notas/Excel), cai para windows-1252 — evita � em acentos.
 */
export function decodeTextFileBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}
