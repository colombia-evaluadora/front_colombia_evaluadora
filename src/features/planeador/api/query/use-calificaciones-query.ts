import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { CalificacionEstudiante } from "@/features/planeador/api/types/calificacion"

function calificacionesUrl(id: number): string {
  return `/planeador/actividades/${id}/calificaciones`
}

export const calificacionesQueryKey = (id: number) =>
  ["planeador", "actividad", id, "calificaciones"] as const

/**
 * Calificaciones (asistencia + notas) de una actividad. Hoy todo vive en el
 * mock — el backend real no existe todavía — y el handler devuelve un sobre
 * `{rows: [...]}` para mantener paridad con `evalCol.getRows`.
 */
async function fetchCalificaciones(id: number): Promise<CalificacionEstudiante[]> {
  return evalCol.getRows<CalificacionEstudiante>(calificacionesUrl(id))
}

export function useCalificacionesQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? calificacionesQueryKey(id) : ["planeador", "actividad", "none", "calificaciones"],
    queryFn: () => fetchCalificaciones(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
