/**
 * Nota de voz del chat: se graba con `MediaRecorder` y se envía como un adjunto más (mismo
 * multipart, misma lista blanca de `AdjuntosChat`, formato OTRO). Cada navegador graba en un
 * contenedor distinto, así que el MIME se negocia con `isTypeSupported` y la extensión del
 * archivo sale de ese MIME: Chrome/Edge → WebM/Opus (.weba), Firefox → Ogg/Opus (.ogg),
 * Safari → MP4/AAC (.m4a).
 */

/** Duración máxima de una nota (se detiene sola al llegar). */
export const MAX_NOTA_SEGUNDOS = 5 * 60

/** Orden de preferencia: el primero que el navegador soporte. */
export const MIMES_GRABACION = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
] as const

/**
 * MIME a pedirle a `MediaRecorder` (`""` = el que el navegador elija por defecto, cuando no
 * soporta ninguno de la lista o no expone `isTypeSupported`).
 */
export function elegirMimeGrabacion(soporta: ((mime: string) => boolean) | undefined) {
  if (!soporta) return ""
  return MIMES_GRABACION.find((m) => soporta(m)) ?? ""
}

/** Extensión y MIME base del archivo según lo que grabó el navegador. */
export function extensionDeGrabacion(mime: string): { extension: string; tipo: string } {
  const base = mime.split(";")[0].trim().toLowerCase()
  if (base === "audio/ogg" || base === "application/ogg") return { extension: "ogg", tipo: "audio/ogg" }
  if (base === "audio/mp4" || base === "audio/aac" || base === "audio/x-m4a" || base === "video/mp4") {
    return { extension: "m4a", tipo: "audio/mp4" }
  }
  // WebM (o desconocido: Chrome/Edge/Firefox graban WebM por defecto). `.weba` y no `.webm`
  // para que no se pinte como video.
  return { extension: "weba", tipo: "audio/webm" }
}

/** "nota-de-voz-2026-10-23-1530.weba" (hora local). */
export function nombreNotaDeVoz(fecha: Date, extension: string) {
  const d = (n: number) => String(n).padStart(2, "0")
  return `nota-de-voz-${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}-${d(fecha.getDate())}-${d(fecha.getHours())}${d(fecha.getMinutes())}${d(fecha.getSeconds())}.${extension}`
}

/** "0:07" / "4:59". */
export function duracionLegible(segundos: number) {
  const s = Math.max(0, Math.floor(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/** `null` si el navegador puede grabar; si no, por qué (para el aviso). */
export function motivoSinGrabacion(entorno: {
  mediaRecorder: unknown
  getUserMedia: unknown
  contextoSeguro: boolean
}): string | null {
  if (!entorno.contextoSeguro) return "Para grabar notas de voz abre la plataforma con una conexión segura (https)."
  if (!entorno.getUserMedia || !entorno.mediaRecorder) {
    return "Tu navegador no permite grabar notas de voz. Actualízalo o usa Chrome, Edge, Firefox o Safari."
  }
  return null
}

/** Mensaje claro para el error de `getUserMedia` / `MediaRecorder`. */
export function mensajeErrorMicrofono(error: unknown): string {
  const nombre = error instanceof Error || (error && typeof error === "object" && "name" in error)
    ? String((error as { name?: string }).name)
    : ""
  switch (nombre) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return "No diste permiso para usar el micrófono. Habilítalo en la configuración del sitio de tu navegador y vuelve a intentarlo."
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "No encontramos un micrófono conectado."
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "El micrófono está en uso por otra aplicación o no responde."
    case "NotSupportedError":
      return "Tu navegador no permite grabar notas de voz. Actualízalo o usa Chrome, Edge, Firefox o Safari."
    default:
      return "No se pudo grabar la nota de voz. Inténtalo de nuevo."
  }
}
