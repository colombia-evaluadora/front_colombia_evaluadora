import type { TipoDestinatario } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"

/**
 * Columna "Tipos" de M.1.LIS.1: abreviada (Est, Acud, Func) y con el nombre completo en el texto
 * emergente. Los cargos del chat (docentes, directivos, administrativos) cuentan como funcionarios.
 */
const GRUPO: Record<TipoDestinatario, "Est" | "Acud" | "Func"> = {
  ESTUDIANTES: "Est",
  PADRES: "Acud",
  ACUDIENTES: "Acud",
  DOCENTES: "Func",
  DIRECTIVOS: "Func",
  ADMINISTRATIVOS: "Func",
  FUNCIONARIOS: "Func",
}

const COMPLETO = { Est: "Estudiantes", Acud: "Acudientes", Func: "Funcionarios" } as const
const ORDEN = ["Est", "Acud", "Func"] as const

function grupos(tipos: TipoDestinatario[]) {
  const presentes = new Set(tipos.map((t) => GRUPO[t]).filter(Boolean))
  return ORDEN.filter((g) => presentes.has(g))
}

/** "Est,Acud"; "Toda" si llega a los tres tipos; "—" sin tipos. */
export function tiposAbreviados(tipos: TipoDestinatario[]): string {
  const g = grupos(tipos)
  if (g.length === 0) return "—"
  if (g.length === ORDEN.length) return "Toda"
  return g.join(",")
}

export function tiposCompletos(tipos: TipoDestinatario[]): string {
  const g = grupos(tipos)
  if (g.length === ORDEN.length) return "Toda la comunidad educativa"
  return g.map((x) => COMPLETO[x]).join(", ")
}
