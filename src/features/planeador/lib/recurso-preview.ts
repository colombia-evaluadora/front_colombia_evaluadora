/**
 * Clasifica la URL de un `Recurso` para decidir cómo previsualizarlo en
 * `recurso-preview.tsx`:
 *
 * - `youtube`   → reproductor embebido (`react-player`)
 * - `video`     → reproductor directo para `.mp4`, `.webm`, `.mov`, `.m4v`
 * - `audio`     → `<audio controls>` para `.mp3`, `.wav`, `.ogg`, `.m4a`…
 * - `image`     → `<img>` plano para extensiones de imagen
 * - `documento` → mammoth para `.docx`/`.doc` (parseo client-side), iframe
 *                 del browser para `.pdf`. Otros formatos caen al preview web.
 * - `web`       → screenshot vía `@microlink/react` (`fetchFromApi`) o el
 *                 componente `<Microlink>` como fallback. Es el caso "no
 *                 reconozco la extensión" (Drive sin nombre en la URL, sitio
 *                 genérico, intranet).
 */
export type RecursoPreviewKind =
  | "youtube"
  | "video"
  | "audio"
  | "image"
  | "documento"
  | "web"

export interface RecursoPreviewResolved {
  kind: RecursoPreviewKind
  /** `youtube`: id del video. Resto: URL (normalizada, p. ej. Dropbox con
   *  `raw=1` para bajar el archivo real en vez del HTML de preview). */
  value: string
  /** Solo `documento`: extensión detectada con punto (`.pdf`, `.docx`), para
   *  que el componente elija mammoth vs iframe vs screenshot. */
  fileType?: string
}

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v"])

/**
 * Lo que un `<audio>` puede reproducir sin plugins. `m4a` y `aac` son el
 * mismo contenedor AAC y son lo que graba un celular; `opus` es lo que
 * sale de WhatsApp, que en la práctica es de donde más audios llegan.
 *
 * Ningún navegador los soporta todos —Safari no toca `.ogg`/`.opus`— y eso
 * no se puede saber desde acá: el elemento dispara `error` al intentar y el
 * componente muestra el aviso con la opción de descargar. Listarlos igual es
 * lo correcto: reconocer la extensión es decir "esto es audio", no prometer
 * que este navegador puede con ella.
 */
const AUDIO_EXTS = new Set([
  "mp3", "wav", "ogg", "oga", "opus", "m4a", "aac", "flac", "weba",
])

const IMAGE_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "tif",
])

// `documento` cubre todo lo que NO es video ni imagen pero sí es un archivo
// reconocible. El renderer (`recurso-preview.tsx`) decide por `fileType` qué
// hacer: mammoth para `.docx`, iframe para `.pdf`, screenshot para el resto.
const DOC_EXTS = new Set([
  "pdf", "doc", "docx", "odt", "rtf",
  "xls", "xlsx", "csv",
  "ppt", "pptx",
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

/** Dropbox sirve el HTML de preview por default; con `raw=1` devuelve el
 *  archivo real, que es lo que necesita mammoth/iframe para mostrar bytes. */
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

export function resolveRecursoPreview(
  rawUrl: string,
  fuente?: string,
): RecursoPreviewResolved | null {
  // `blob:` URLs no se pueden parsear con `new URL()` (no tienen host/path
  // significativo) y tampoco traen la extensión del archivo en el path. El
  // form (`form-editar-actividad.tsx`) las genera con `URL.createObjectURL`
  // para los recursos tipo "Archivo" y guarda el nombre original en
  // `fuente` — usamos eso para detectar el tipo de archivo. Si tampoco
  // `fuente` trae extensión reconocible, devolvemos `null` para que el
  // componente muestre el estado vacío.
  if (rawUrl.startsWith("blob:")) {
    const ext = getExtension(fuente ?? "")
    if (VIDEO_EXTS.has(ext)) return { kind: "video", value: rawUrl }
    if (AUDIO_EXTS.has(ext)) return { kind: "audio", value: rawUrl }
    if (IMAGE_EXTS.has(ext)) return { kind: "image", value: rawUrl }
    if (DOC_EXTS.has(ext)) {
      return { kind: "documento", value: rawUrl, fileType: `.${ext}` }
    }
    return null
  }

  const url = safeParseUrl(rawUrl)
  if (!url) return null

  const youtubeId = extractYoutubeId(url)
  if (youtubeId) return { kind: "youtube", value: youtubeId }

  const host = normalizeHost(url.hostname)
  const esDropbox = host === "dropbox.com" || host.endsWith(".dropbox.com")
  const effectiveUrl = esDropbox ? normalizeDropboxUrl(url) : url

  const ext = getExtension(effectiveUrl.pathname)
  if (VIDEO_EXTS.has(ext)) {
    return { kind: "video", value: effectiveUrl.toString() }
  }
  if (AUDIO_EXTS.has(ext)) {
    return { kind: "audio", value: effectiveUrl.toString() }
  }
  if (IMAGE_EXTS.has(ext)) {
    return { kind: "image", value: effectiveUrl.toString() }
  }
  if (DOC_EXTS.has(ext)) {
    return {
      kind: "documento",
      value: effectiveUrl.toString(),
      fileType: `.${ext}`,
    }
  }

  // Sin extensión reconocible (link de Drive sin nombre en la URL, sitio
  // web genérico): screenshot vía Microlink.
  return { kind: "web", value: rawUrl }
}

/**
 * Lo que acepta el `<input type="file">` de un recurso "Archivo".
 *
 * Son los cuatro que el previsualizador sabe mostrar inline: imagen, audio,
 * video y PDF. No es una validación —el `accept` del navegador se puede
 * esquivar, y quien decide de verdad es `file-service`—, es guía: filtra el
 * diálogo de "Abrir" para que no se elija un `.zip` cuya vista previa
 * después no va a existir.
 */
export const RECURSO_ARCHIVO_ACCEPT = "image/*,audio/*,video/*,application/pdf"

/** Label legible del origen del enlace, para el fallback "Abrir en…". */
export function recursoHostLabel(rawUrl: string): string {
  const url = safeParseUrl(rawUrl)
  if (!url) return "el enlace"
  const host = normalizeHost(url.hostname)
  if (host === "drive.google.com") return "Google Drive"
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) return "Dropbox"
  return host
}
