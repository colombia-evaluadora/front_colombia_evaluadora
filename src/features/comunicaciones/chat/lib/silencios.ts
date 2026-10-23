import type { SilencioDuracion } from "@/features/comunicaciones/chat/api/types"

/**
 * Duraciones de silencio que ofrece la UI (menú de la conversación y panel de configuración de
 * mensajería). 8H y 1S siguen aceptándose en comms-service por compatibilidad, pero la HU pide
 * 1 hora, hasta el final del día (hora Colombia) y hasta reactivar manualmente.
 */
export const SILENCIOS: Array<{ valor: Exclude<SilencioDuracion, "NINGUNA">; etiqueta: string; aviso: string }> = [
  { valor: "1H", etiqueta: "1 hora", aviso: "Notificaciones silenciadas por 1 hora." },
  { valor: "FIN_DIA", etiqueta: "Hasta el final del día", aviso: "Notificaciones silenciadas hasta el final del día." },
  { valor: "SIEMPRE", etiqueta: "Hasta que las active", aviso: "Notificaciones silenciadas hasta que las actives." },
]

const SIEMPRE_DESDE_ANIO = 9000

/** Texto del estado de silencio ("Silenciada hasta las 3:40 p. m." / "hasta que la actives"). */
export function describirSilencio(silenciadoHasta: string | null): string {
  if (!silenciadoHasta) return "Notificaciones activas"
  const hasta = new Date(silenciadoHasta)
  if (hasta.getFullYear() >= SIEMPRE_DESDE_ANIO) return "Silenciada hasta que la actives"
  const fmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  })
  return `Silenciada hasta ${fmt.format(hasta)}`
}
