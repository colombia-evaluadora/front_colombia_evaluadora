import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { CalificacionEstudiante } from "@/features/planeador/api/types/calificacion"

function calificacionesUrl(id: string): string {
  return `/planeador/actividad/calificaciones/${id}`
}

export const calificacionesQueryKey = (id: string) =>
  ["planeador", "actividad", id, "calificaciones"] as const

/**
 * Calificaciones (asistencia + notas) de una actividad. Hoy todo vive en el
 * mock — el backend real no existe todavía — y el handler devuelve un sobre
 * `{rows: [...]}` para mantener paridad con `evalCol.getRows`.
 */
async function fetchCalificaciones(id: string): Promise<CalificacionEstudiante[]> {
  return evalCol.getRows<CalificacionEstudiante>(calificacionesUrl(id))
}

export function useCalificacionesQuery(id: string | undefined) {
  return useQuery({
    queryKey: id ? calificacionesQueryKey(id) : ["planeador", "actividad", "none", "calificaciones"],
    queryFn: () => fetchCalificaciones(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}