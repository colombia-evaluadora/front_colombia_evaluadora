import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import { normalizeActividad } from "@/features/planeador/lib/normalize-actividad"

function actividadDetalleUrl(id: number): string {
  return `/planeador/actividades/${id}`
}

export const actividadDetalleQueryKey = (id: number) =>
  ["planeador", "actividad", id] as const

/**
 * Detalle de una actividad. El mock responde `{rows: [actividad]}` para
 * mantener paridad con el resto del microservicio; `getRows` desenvuelve y
 * acá se toma la primera fila. Si no existe, se lanza un error para que el
 * `<ErrorBoundary>` / toast del interceptor se encargue.
 */
async function fetchActividadDetalle(id: number): Promise<Actividad> {
  const rows = await evalCol.getRows<Actividad>(actividadDetalleUrl(id))
  const first = rows[0]
  if (!first) {
    throw new Error(`No se encontró la actividad ${id}.`)
  }
  return normalizeActividad(first)
}

export function useActividadDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? actividadDetalleQueryKey(id) : ["planeador", "actividad", "none"],
    queryFn: () => fetchActividadDetalle(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
