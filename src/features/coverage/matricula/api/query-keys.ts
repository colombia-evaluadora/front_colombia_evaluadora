import type { QueryClient } from "@tanstack/react-query"

const all = ["matricula"] as const
const listaAll = [...all, "lista"] as const
const detalleAll = [...all, "detail"] as const

// Los catálogos cuelgan de `all` pero no de lista/detalle: mutar una matrícula no los toca.
export const matriculaKeys = {
  all,
  lista: <P>(params: P) => [...listaAll, params] as const,
  detalle: (id: number | string | undefined) => [...detalleAll, id] as const,
  campuses: () => [...all, "campuses"] as const,
  gradosPorPeriodo: (periodoId: number | null | undefined) => [...all, "grados-por-periodo", periodoId] as const,
  gruposPorGrado: (gradoId: number | null | undefined, shift: string | null | undefined) =>
    [...all, "grupos-por-grado", gradoId, shift] as const,
  fieldConfigAll: [...all, "field-config"] as const,
  fieldConfig: (establecimientoId: number | null = null) => [...all, "field-config", establecimientoId] as const,
  periodoResolver: (sedeId: number | null, jornadaId: number | null) =>
    [...all, "periodo-resolver", sedeId, jornadaId] as const,
} as const

export function invalidarMatriculas(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: listaAll })
  queryClient.invalidateQueries({ queryKey: detalleAll })
}
