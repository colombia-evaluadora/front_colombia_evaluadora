import { fetchArchivoViewUrl } from "@/lib/files"
import type { FormatoArchivo } from "@/features/comunicaciones/chat/api/types"

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
}

export const MAX_ADJUNTO_MB = 20
const MAX_ADJUNTO_BYTES = MAX_ADJUNTO_MB * 1024 * 1024

export const ACEPTA_DOCUMENTOS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
export const ACEPTA_MULTIMEDIA = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov"

function extension(nombre: string) {
  const i = nombre.lastIndexOf(".")
  return i < 0 ? "" : nombre.slice(i + 1).toLowerCase()
}

export function formatoDeArchivo(archivo: { name: string; type: string }): FormatoArchivo {
  const porExtension = EXTENSIONES[extension(archivo.name)]
  if (porExtension) return porExtension
  if (archivo.type.startsWith("image/")) return "IMAGEN"
  if (archivo.type.startsWith("video/")) return "VIDEO"
  return "OTRO"
}

/** Mensaje de error si el archivo no se puede adjuntar; `null` si sirve. */
export function validarAdjunto(archivo: { name: string; size: number }): string | null {
  if (!EXTENSIONES[extension(archivo.name)]) {
    return "Ese tipo de archivo no se puede adjuntar. Usa PDF, Word, Excel, PowerPoint, texto, imagen o video."
  }
  if (archivo.size > MAX_ADJUNTO_BYTES) return `El archivo supera el máximo de ${MAX_ADJUNTO_MB} MB.`
  return null
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
