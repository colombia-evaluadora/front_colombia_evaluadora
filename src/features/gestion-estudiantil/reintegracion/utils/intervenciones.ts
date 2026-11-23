import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { IntervencionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"

/** Caracteres de «Compromisos» que caben en la columna antes de truncar con «…». */
export const COMPROMISOS_MAX_VISIBLE = 90

/** «Compromisos: …» con el texto truncado; vacío si no hay compromisos. */
export function resumenCompromisos(texto: string | null | undefined): string {
  const limpio = (texto ?? "").trim().replace(/\s+/g, " ")
  if (!limpio) return ""
  const corto = limpio.length > COMPROMISOS_MAX_VISIBLE ? `${limpio.slice(0, COMPROMISOS_MAX_VISIBLE).trimEnd()}…` : limpio
  return `Compromisos: ${corto}`
}

/** «Programada para el …» mientras no se realiza; «Realizada el …» después. */
export const realizacionDe = (i: Pick<IntervencionRow, "fecha_realizacion" | "fecha_programada">) =>
  i.fecha_realizacion
    ? `Realizada el ${formatFecha(i.fecha_realizacion)}`
    : i.fecha_programada
      ? `Programada para el ${formatFecha(i.fecha_programada)}`
      : "—"

export const fechaDeIntervencion = (i: Pick<IntervencionRow, "fecha_realizacion" | "fecha_programada">) =>
  i.fecha_realizacion ?? i.fecha_programada ?? ""
