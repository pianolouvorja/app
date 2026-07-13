/** Remove prefix de pasta pública (`/musics/`, `/images/`, `/covers/`). */
export function toRelativeMediaPath(urlPath: string): string {
  return urlPath.replace(/^\/(musics|images|covers)\//, '')
}

/** URL HTTP do arquivo remoto (capas ainda não baixadas). */
export function resolveRemoteFileUrl(urlPath: string): string {
  const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath
  const base = import.meta.env.VITE_URL_FILES ?? 'https://api.louvorja.com.br/file'
  return `${base}/${cleanPath}`
}
