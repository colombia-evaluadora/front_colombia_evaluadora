import type { EscalaValoracion } from "@/features/coverage/matricula/api/types/notas-homologadas"

/** Notas con coma decimal y un decimal, como en las planillas (3,8). */
export const formatNota = (nota: number) =>
  nota.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Acepta coma o punto; NaN si no es un número. */
export const parseNota = (texto: string) => (texto.trim() ? Number(texto.trim().replace(",", ".")) : NaN)

export const valoracionEnEscala = (nota: number, escala: EscalaValoracion) =>
  escala.desempenos.find((d) => nota >= d.desde && nota <= d.hasta + 0.049)?.nombre ?? ""

/** yyyy-MM-dd → dd/MM/yyyy */
export const formatFecha = (fecha: string) => fecha.split("-").reverse().join("/")
