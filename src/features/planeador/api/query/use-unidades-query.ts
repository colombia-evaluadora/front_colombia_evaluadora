import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

const UNIDAD_LIST_URL = "/planeador/unidades"

// Mismo criterio que `use-actividades-query.ts`: el contrato real exige
// `size`/`offset` explícitos en la query string de los listados paginados.
const PAGE_SIZE = 500

export const unidadesQueryKey = () => ["planeador", "unidades"] as const

function fetchUnidades(): Promise<UnidadTematica[]> {
  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway.
  return evalCol.getRows<UnidadTematica>(`${UNIDAD_LIST_URL}?size=${PAGE_SIZE}&offset=0`)
}

export function useUnidadesQuery() {
  return useQuery({
    queryKey: unidadesQueryKey(),
    queryFn: fetchUnidades,
    // Mantiene la lista anterior mientras se revalida — evita el flash a
    // "Sin unidades" al volver a la pestaña.
    placeholderData: (previous) => previous,
    staleTime: 1000 * 30,
  })
}

function unidadDetalleUrl(id: number): string {
  return `/planeador/unidades/${id}`
}

export const unidadDetalleQueryKey = (id: number) =>
  ["planeador", "unidad", id] as const

/**
 * Detalle de una unidad. El mock responde `{rows: [unidad]}` para mantener
 * paridad con el resto del microservicio; si no existe se lanza para que el
 * panel muestre su estado de error.
 */
async function fetchUnidadDetalle(id: number): Promise<UnidadTematica> {
  const rows = await evalCol.getRows<UnidadTematica>(unidadDetalleUrl(id))
  const first = rows[0]
  if (!first) {
    throw new Error(`No se encontró la unidad ${id}.`)
  }
  return first
}

export function useUnidadDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? unidadDetalleQueryKey(id) : ["planeador", "unidad", "none"],
    queryFn: () => fetchUnidadDetalle(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
