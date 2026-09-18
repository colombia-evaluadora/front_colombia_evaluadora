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
 * - `embed`     → el visor del propio repositorio dentro de un iframe (Google
 *                 Drive, Docs/Sheets/Slides). Ver `resolveEmbedRepositorio`.
 * - `web`       → screenshot vía `@microlink/react` (`fetchFromApi`) o el
 *                 componente `<Microlink>` como fallback. Es el caso "no
 *                 reconozco nada" (sitio genérico, intranet).
 */
export type RecursoPreviewKind =
  | "youtube"
  | "video"
  | "audio"
  | "image"
  | "documento"
  | "embed"
  | "web"

export interface RecursoPreviewResolved {
  kind: RecursoPreviewKind
  /** `youtube`: id del video. Resto: URL (normalizada, p. ej. Dropbox con
   *  `raw=1` para bajar el archivo real en vez del HTML de preview). */
  value: string
  /** Solo `documento`: extensión detectada con punto (`.pdf`, `.docx`), para
   *  que el componente elija mammoth vs iframe vs screenshot. */
  fileType?: string
  /** Solo `embed`: nombre del repositorio ("Google Drive"), para rotular el
   *  botón de "abrir allá" — un iframe que el proveedor rechace queda en
   *  blanco y sin salida si no se ofrece la alternativa. */
  proveedor?: string
  /** Solo `embed`: la URL original, que es la que hay que abrir en una
   *  pestaña nueva. La de embeber no siempre sirve fuera del iframe. */
  urlOriginal?: string
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

/**
 * Enlaces de repositorio: el visor del propio proveedor, embebido.
 *
 * El problema con Drive y compañía es que la URL **no dice qué hay del otro
 * lado**: `drive.google.com/file/d/1a2b3c/view` puede ser un PDF, una foto,
 * un video o un audio, y averiguarlo desde el navegador es imposible — la API
 * de Drive pide credenciales y el archivo en sí no se puede leer por CORS.
 *
 * La salida no es adivinar sino delegar: Drive tiene su propio visor y sabe
 * perfectamente qué es cada archivo. Cambiando `/view` por `/preview` se
 * obtiene una URL pensada para meter en un iframe, y ese visor resuelve los
 * cuatro casos —PDF paginado, imagen, reproductor de video, reproductor de
 * audio— sin que nosotros tengamos que distinguirlos. Lo mismo para
 * Documentos, Hojas de cálculo y Presentaciones.
 *
 * Lo que hay que saber antes de confiar en esto:
 *
 * - **Depende de los permisos del archivo.** Si está compartido con "cualquiera
 *   con el enlace", se ve. Si es privado, el iframe muestra la pantalla de
 *   inicio de sesión de Google o un error — no hay forma de detectarlo desde
 *   acá (un iframe de otro dominio no deja inspeccionar su contenido), y por
 *   eso el componente siempre ofrece "abrir en Google Drive".
 * - **No cubre OneDrive ni SharePoint.** Sus enlaces cortos (`1drv.ms`) hay
 *   que resolverlos siguiendo una redirección que el navegador no puede leer
 *   por CORS, y los largos varían por tenant. Caen al preview web, que al
 *   menos muestra la captura y el enlace.
 * - **Dropbox no pasa por acá**: sus URLs sí traen el nombre del archivo, así
 *   que `?raw=1` + la extensión ya lo resuelven mejor, con nuestro propio
 *   visor en vez del ajeno.
 */
function resolveEmbedRepositorio(url: URL): RecursoPreviewResolved | null {
  const host = normalizeHost(url.hostname)
  const original = url.toString()

  if (host === "drive.google.com") {
    // Dos formas de nombrar el mismo archivo: /file/d/<id>/… y ?id=<id>
    // (que es la que generan "compartir" viejo, `open` y `uc`).
    const porRuta = url.pathname.match(/^\/file\/d\/([^/]+)/)
    const id = porRuta ? porRuta[1] : url.searchParams.get("id")
    if (id) {
      return {
        kind: "embed",
        value: `https://drive.google.com/file/d/${id}/preview`,
        proveedor: "Google Drive",
        urlOriginal: original,
      }
    }
    // Carpeta compartida: no hay archivo que previsualizar, pero Drive
    // publica una vista de listado embebible. Ver la carpeta es mejor que
    // una captura de la pantalla de login.
    const carpeta = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([^/]+)/)
    if (carpeta) {
      return {
        kind: "embed",
        value: `https://drive.google.com/embeddedfolderview?id=${carpeta[1]}#grid`,
        proveedor: "Google Drive",
        urlOriginal: original,
      }
    }
    return null
  }

  if (host === "docs.google.com") {
    const match = url.pathname.match(
      /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/,
    )
    if (match) {
      return {
        kind: "embed",
        value: `https://docs.google.com/${match[1]}/d/${match[2]}/preview`,
        proveedor: "Google Docs",
        urlOriginal: original,
      }
    }
    return null
  }

  return null
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

  // El repositorio se consulta ANTES de caer a `web`, pero DESPUÉS de mirar
  // la extensión: si la URL ya dice que es un `.pdf`, nuestro propio visor es
  // mejor que el del proveedor — no depende de permisos ni de que su iframe
  // esté disponible.
  if (!VIDEO_EXTS.has(ext) && !AUDIO_EXTS.has(ext) && !IMAGE_EXTS.has(ext) && !DOC_EXTS.has(ext)) {
    const embed = resolveEmbedRepositorio(effectiveUrl)
    if (embed) return embed
  }
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
