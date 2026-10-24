import { fetchArchivoViewUrl } from "@/lib/files"
import type { AdjuntoMensaje, FormatoArchivo, Mensaje } from "@/features/comunicaciones/chat/api/types"

/**
 * Tipos y peso que acepta comms-service para un adjunto (`AdjuntosChat`): la
 * misma lista cerrada de extensiones y el mismo tope. Se valida antes de subir
 * para no mandar al file-service algo que el servidor va a rechazar.
 */
const EXTENSIONES: Record<string, FormatoArchivo> = {
  pdf: "PDF",
  doc: "WORD",
  docx: "WORD",
  xls: "OTRO",
  xlsx: "OTRO",
  ppt: "OTRO",
  pptx: "OTRO",
  txt: "OTRO",
  csv: "OTRO",
  jpg: "IMAGEN",
  jpeg: "IMAGEN",
  png: "IMAGEN",
  gif: "IMAGEN",
  webp: "IMAGEN",
  mp4: "VIDEO",
  webm: "VIDEO",
  mov: "VIDEO",
  // Comprimidos: la columna `adjunto_formato` tiene un CHECK con solo
  // WORD/PDF/IMAGEN/VIDEO/OTRO (V560), así que viajan como OTRO; el ícono de
  // comprimido lo decide el front por la extensión (`esComprimido`).
  zip: "OTRO",
  rar: "OTRO",
  // Audio (notas de voz y archivos de audio): el mismo CHECK no tiene un valor AUDIO, así
  // que viajan como OTRO y el reproductor/ícono lo decide la extensión (`esAudio`). La nota
  // de voz de Chrome/Edge se guarda como .weba (WebM solo audio) para no confundirla con un
  // video .webm; Firefox graba .ogg y Safari .m4a (`nota-de-voz.ts`).
  weba: "OTRO",
  ogg: "OTRO",
  oga: "OTRO",
  opus: "OTRO",
  m4a: "OTRO",
  mp3: "OTRO",
  wav: "OTRO",
}

const COMPRIMIDOS = new Set(["zip", "rar"])
const AUDIOS = new Set(["weba", "ogg", "oga", "opus", "m4a", "mp3", "wav"])

/** MIME con que se reproduce un audio por su extensión (el Blob que se arma para el `<audio>`). */
const MIME_AUDIO: Record<string, string> = {
  weba: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
}

/**
 * MIME que reportan los navegadores para un .zip/.rar según el SO y lo que haya
 * instalado (Windows sin WinRAR suele dar `""` u `octet-stream` para .rar). El
 * genérico `application/octet-stream` (o vacío) solo se acepta porque la
 * extensión ya es .zip/.rar: un .exe/.bat nunca pasa la lista de extensiones.
 */
const MIME_COMPRIMIDOS = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/octet-stream",
  "",
])

export const MAX_ADJUNTO_MB = 20
const MAX_ADJUNTO_BYTES = MAX_ADJUNTO_MB * 1024 * 1024

/** Tope de archivos por mensaje (comms-service `AdjuntosChat.MAX_POR_MENSAJE`, V560). */
export const MAX_ADJUNTOS = 10
/**
 * Peso total por mensaje: todos los archivos viajan en un solo multipart y file-service
 * rechaza el pedido que pasa de `FILES_MAX_REQUEST_SIZE` (30 MB, contando el texto y los
 * separadores del multipart). Se deja margen para no recibir ese error genérico.
 */
export const MAX_TOTAL_MB = 25
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024

export const ACEPTA_DOCUMENTOS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
export const ACEPTA_MULTIMEDIA = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.weba,.ogg,.oga,.opus,.m4a,.mp3,.wav"

function extension(nombre: string) {
  const i = nombre.lastIndexOf(".")
  return i < 0 ? "" : nombre.slice(i + 1).toLowerCase()
}

/** `true` si el nombre es un .zip/.rar (para pintar el ícono de comprimido). */
export function esComprimido(nombre: string | null | undefined) {
  return COMPRIMIDOS.has(extension(nombre ?? ""))
}

/** `true` si el nombre es un audio (nota de voz o archivo de audio): se reproduce inline. */
export function esAudio(nombre: string | null | undefined) {
  return AUDIOS.has(extension(nombre ?? ""))
}

/** MIME de reproducción de un audio por su nombre (`""` si no es audio). */
export function mimeAudio(nombre: string | null | undefined) {
  return MIME_AUDIO[extension(nombre ?? "")] ?? ""
}

export function formatoDeArchivo(archivo: { name: string; type: string }): FormatoArchivo {
  const porExtension = EXTENSIONES[extension(archivo.name)]
  if (porExtension) return porExtension
  if (archivo.type.startsWith("image/")) return "IMAGEN"
  if (archivo.type.startsWith("video/")) return "VIDEO"
  return "OTRO"
}

/** Mensaje de error si el archivo no se puede adjuntar; `null` si sirve. */
export function validarAdjunto(archivo: { name: string; size: number; type?: string }): string | null {
  const ext = extension(archivo.name)
  if (!EXTENSIONES[ext]) {
    return "Ese tipo de archivo no se puede adjuntar. Usa PDF, Word, Excel, PowerPoint, texto, imagen, video, audio, ZIP o RAR."
  }
  if (COMPRIMIDOS.has(ext) && !MIME_COMPRIMIDOS.has((archivo.type ?? "").toLowerCase())) {
    return "El archivo no parece un ZIP o RAR válido."
  }
  if (archivo.size > MAX_ADJUNTO_BYTES) return `El archivo supera el máximo de ${MAX_ADJUNTO_MB} MB.`
  return null
}

/**
 * Suma `nuevos` a los archivos ya elegidos para un mensaje: descarta los que no se pueden
 * adjuntar y los repetidos (mismo nombre y peso), y corta en el tope de cantidad y de peso
 * total. `error` explica el primer descarte (null si entraron todos).
 */
export function agregarAdjuntos<T extends { name: string; size: number; type?: string }>(
  actuales: readonly T[],
  nuevos: readonly T[],
): { archivos: T[]; error: string | null } {
  const archivos = [...actuales]
  let error: string | null = null
  let total = archivos.reduce((s, a) => s + a.size, 0)
  for (const archivo of nuevos) {
    const invalido = validarAdjunto(archivo)
    if (invalido) {
      error ??= `${archivo.name}: ${invalido}`
      continue
    }
    if (archivos.some((a) => a.name === archivo.name && a.size === archivo.size)) continue
    if (archivos.length >= MAX_ADJUNTOS) {
      error ??= `Puedes adjuntar hasta ${MAX_ADJUNTOS} archivos por mensaje.`
      break
    }
    if (total + archivo.size > MAX_TOTAL_BYTES) {
      error ??= `Los archivos de un mensaje no pueden sumar más de ${MAX_TOTAL_MB} MB.`
      continue
    }
    archivos.push(archivo)
    total += archivo.size
  }
  return { archivos, error }
}

/**
 * Archivos del mensaje en orden. `adjuntos` lo trae comms-service desde `tmensaje_adjunto` (V560); los mensajes
 * de antes (o del mock) solo traen `adjunto`.
 */
export function adjuntosDe(m: Pick<Mensaje, "adjunto" | "adjuntos">): AdjuntoMensaje[] {
  if (m.adjuntos && m.adjuntos.length > 0) return m.adjuntos
  return m.adjunto ? [m.adjunto] : []
}

/** Archivos que siguen visibles (sin quitar). */
export function adjuntosVigentes(m: Pick<Mensaje, "adjunto" | "adjuntos">) {
  return adjuntosDe(m).filter((a) => !a.eliminadoEn)
}

/** "1,2 MB" / "350 KB". */
export function pesoLegible(bytes: number | null | undefined) {
  if (bytes == null) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`
}

/**
 * Descarga un adjunto de file-service: acuña un token de vista recién al hacer
 * clic (no se mantiene uno vivo por cada mensaje) y dispara un `<a download>`
 * del mismo origen.
 */
export async function descargarAdjunto(archivoId: number, nombre: string) {
  const { url } = await fetchArchivoViewUrl(archivoId)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.rel = "noopener"
  document.body.append(a)
  a.click()
  a.remove()
}

/** Por qué el autor ya no puede quitar un archivo (comms-service responde 409). */
export const AVISO_YA_DESCARGADO = "Otra persona ya lo descargó: no se puede eliminar."
