/**
 * Clasifica la URL de un `Recurso` para decidir cómo previsualizarlo en
 * `planeador-recurso-preview-page.tsx`: como video de YouTube (vía
 * `react-youtube`), como documento (PDF/imagen/office vía
 * `@cyntler/react-doc-viewer`) o, si no se puede reconocer el tipo real
 * (p. ej. un link de Google Drive sin nombre de archivo en el path), como
 * enlace externo simple (sin intentar renderizarlo inline).
 */
export type RecursoPreviewKind = "youtube" | "documento" | "enlace"

export interface RecursoPreviewResolved {
  kind: RecursoPreviewKind
  /** "youtube": el id del video. "documento": la URL (normalizada, p. ej.
   *  Dropbox con `raw=1` para bajar el archivo real). "enlace": la URL tal
   *  cual, solo para mostrarla/abrirla. */
  value: string
  /** Solo "documento": extensión detectada con el punto (`.pdf`), por si
   *  la URL no la trae en el path (p. ej. quedó detrás de un `?`). */
  fileType?: string
}

// Extensiones que `DocViewer` sabe renderizar sin depender de un servicio
// externo (Office/`doc`,`docx`,`ppt`,… sí lo usa, pero corre igual dentro
// de la librería). Ver su README, sección "Supported file types".
const DOC_VIEWER_EXTENSIONS = new Set([
  "bmp", "csv", "odt", "doc", "docx", "gif", "htm", "html", "jpg", "jpeg",
  "pdf", "png", "ppt", "pptx", "tiff", "tif", "txt", "xls", "xlsx", "mp4", "webp",
])

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "")
}

function extractYoutubeId(url: URL): string | null {
  const host = normalizeHost(url.hostname)
  if (host === "youtu.be") return url.pathname.slice(1) || null
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") return url.searchParams.get("v")
    const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)
    if (match) return match[1]
  }
  return null
}

/** Dropbox sirve el HTML de la página de preview por default (`dl=0`); con
 *  `raw=1` devuelve el archivo real, que es lo que necesita `DocViewer`. */
function normalizeDropboxUrl(url: URL): URL {
  const next = new URL(url.toString())
  next.searchParams.delete("dl")
  next.searchParams.set("raw", "1")
  return next
}

function getExtension(pathname: string): string {
  const match = pathname.match(/\.([a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : ""
}

export function resolveRecursoPreview(rawUrl: string): RecursoPreviewResolved | null {
  const url = safeParseUrl(rawUrl)
  if (!url) return null

  const youtubeId = extractYoutubeId(url)
  if (youtubeId) return { kind: "youtube", value: youtubeId }

  const host = normalizeHost(url.hostname)
  const esDropbox = host === "dropbox.com" || host.endsWith(".dropbox.com")
  const effectiveUrl = esDropbox ? normalizeDropboxUrl(url) : url

  const ext = getExtension(effectiveUrl.pathname)
  if (DOC_VIEWER_EXTENSIONS.has(ext)) {
    return { kind: "documento", value: effectiveUrl.toString(), fileType: `.${ext}` }
  }

  // Sin extensión reconocible (típico de un link de Google Drive, que no
  // trae el nombre del archivo en el path) — se muestra como enlace
  // externo en vez de arriesgar un render roto.
  return { kind: "enlace", value: rawUrl }
}

/** Label legible del origen del enlace, para el fallback "Abrir en…". */
export function recursoHostLabel(rawUrl: string): string {
  const url = safeParseUrl(rawUrl)
  if (!url) return "el enlace"
  const host = normalizeHost(url.hostname)
  if (host === "drive.google.com") return "Google Drive"
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) return "Dropbox"
  return host
}
