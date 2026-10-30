import type { SilencioDuracion } from "@/features/comunicaciones/chat/api/types"

/**
 * Duraciones de silencio que ofrece la UI, como en WhatsApp: 8 horas, 1 semana y siempre. 1H y
 * FIN_DIA ya no se ofrecen y comms-service las rechaza; las filas que quedaron con ellas se siguen
 * respetando hasta su `silenciadoHasta` y se reportan como 8H.
 */
export const SILENCIOS: Array<{ valor: Exclude<SilencioDuracion, "NINGUNA">; etiqueta: string; aviso: string }> = [
  { valor: "8H", etiqueta: "8 horas", aviso: "Notificaciones silenciadas por 8 horas." },
  { valor: "1S", etiqueta: "1 semana", aviso: "Notificaciones silenciadas por 1 semana." },
  { valor: "SIEMPRE", etiqueta: "Siempre", aviso: "Notificaciones silenciadas siempre." },
]

// comms-service guarda "Siempre" como 9999-12-31 (filtra destinatarios con silenciado_hasta > ahora).
const SIEMPRE_DESDE_ANIO = 9000
const ZONA = "America/Bogota"

const dia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" })
const hora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" })
const fechaMismoAnio = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, day: "numeric", month: "long" })
const fechaOtroAnio = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, day: "numeric", month: "long", year: "numeric" })

/** Días calendario (hora Colombia) entre `ahora` y `fecha`: 0 hoy, 1 mañana. */
function diasEntre(ahora: Date, fecha: Date) {
  const a = Date.parse(dia.format(ahora))
  const b = Date.parse(dia.format(fecha))
  return Math.round((b - a) / 86_400_000)
}

/**
 * Cuándo termina el silencio, en relativo como WhatsApp: "hoy a la(s) 3:40 p. m.",
 * "mañana a la(s) 1:13 a. m.", "el 6 de noviembre a la(s) 9:00 a. m." o "siempre".
 */
export function describirFinSilencio(silenciadoHasta: string, ahora = new Date()): string {
  const hasta = new Date(silenciadoHasta)
  if (hasta.getFullYear() >= SIEMPRE_DESDE_ANIO) return "siempre"
  const h = `a la(s) ${hora.format(hasta)}`
  const d = diasEntre(ahora, hasta)
  if (d <= 0) return `hasta hoy ${h}`
  if (d === 1) return `hasta mañana ${h}`
  const anioIgual = dia.format(ahora).slice(0, 4) === dia.format(hasta).slice(0, 4)
  return `hasta el ${(anioIgual ? fechaMismoAnio : fechaOtroAnio).format(hasta)} ${h}`
}

/** Subtítulo del ítem "Desactivar silencio de notificaciones" ("Silenciadas hasta mañana a la(s) …"). */
export function subtituloSilencio(silenciadoHasta: string, ahora = new Date()): string {
  return `Silenciadas ${describirFinSilencio(silenciadoHasta, ahora)}`
}

/** Texto del estado de silencio para el panel de configuración. */
export function describirSilencio(silenciadoHasta: string | null, ahora = new Date()): string {
  if (!silenciadoHasta) return "Notificaciones activas"
  return `Silenciada ${describirFinSilencio(silenciadoHasta, ahora)}`
}
