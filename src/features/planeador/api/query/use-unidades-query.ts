import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

const UNIDAD_LIST_URL = "/planeador/unidad/query"

export const unidadesQueryKey = () => ["planeador", "unidades"] as const

function fetchUnidades(): Promise<UnidadTematica[]> {
  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway.
  return evalCol.getRows<UnidadTematica>(UNIDAD_LIST_URL)
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

function unidadDetalleUrl(id: string): string {
  return `/planeador/unidad/detalle/${id}`
}

export const unidadDetalleQueryKey = (id: string) =>
  ["planeador", "unidad", id] as const

/**
 * Detalle de una unidad. El mock responde `{rows: [unidad]}` para mantener
 * paridad con el resto del microservicio; si no existe se lanza para que el
 * panel muestre su estado de error.
 */
async function fetchUnidadDetalle(id: string): Promise<UnidadTematica> {
  const rows = await evalCol.getRows<UnidadTematica>(unidadDetalleUrl(id))
  const first = rows[0]
  if (!first) {
    throw new Error(`No se encontró la unidad ${id}.`)
  }
  return first
}

export function useUnidadDetalleQuery(id: string | undefined) {
  return useQuery({
    queryKey: id ? unidadDetalleQueryKey(id) : ["planeador", "unidad", "none"],
    queryFn: () => fetchUnidadDetalle(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}
