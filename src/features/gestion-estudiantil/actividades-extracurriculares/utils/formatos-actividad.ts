import { format } from "date-fns"

import type { ActividadDetalle } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

/** `yyyy-mm-dd` → `Date` local (sin el corrimiento de zona horaria de `new Date("yyyy-mm-dd")`). */
export function fechaIsoADate(iso: string | null | undefined): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "")
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}

/** `Date` → `yyyy-mm-dd` para el backend. */
export const dateAFechaIso = (d: Date) => format(d, "yyyy-MM-dd")

/** Horas con 1 decimal y coma: `2,0`, `0,5`. */
export const formatHoras = (h: number | null | undefined) => (h == null ? "" : h.toFixed(1).replace(".", ","))

/** Entero positivo o `null` si el texto no lo es (cupo). */
export function enteroPositivo(texto: string): number | null {
  const t = texto.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= 1 ? n : null
}

/** «N de M cupos» (sin cupo, «N inscritos»). */
export function textoCupos(a: Pick<ActividadDetalle, "inscritos" | "cupo">) {
  return a.cupo != null ? `${a.inscritos} de ${a.cupo} cupos` : `${a.inscritos} inscritos`
}

/** Hoy, si cae dentro de [inicio, fin] (inclusive); si no, undefined. */
export function hoySiEnRango(inicio: Date | undefined, fin: Date | undefined): Date | undefined {
  const t = new Date()
  const hoy = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  if (inicio && hoy < inicio) return undefined
  if (fin && hoy > fin) return undefined
  return hoy
}

/** Texto de horas -> número, aceptando coma decimal; null si no es un número. */
export function numeroDecimal(texto: string): number | null {
  const t = texto.trim().replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

/** Tiene como mucho un decimal. */
export const unDecimal = (n: number) => Math.abs(Math.round(n * 10) / 10 - n) < 1e-9

/** Fecha larga en español: 13 de noviembre de 2026. */
export function formatFechaLarga(iso: string | null | undefined): string {
  const d = fechaIsoADate(iso)
  return d ? d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : ""
}

/** Número con coma decimal y sin ceros sobrantes: 80, 86,5. */
export const formatNumero = (n: number) => String(n).replace(".", ",")
