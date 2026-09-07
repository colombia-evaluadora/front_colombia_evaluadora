import { useQueries, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  AsistenciaSesionEstudiantesParams,
  RosterEstudiante,
} from "@/features/academic-management/asistencia/api/types/asistencia"

export async function fetchEstudiantesSesion(
  params: AsistenciaSesionEstudiantesParams,
): Promise<RosterEstudiante[]> {
  const raw = await api.get<{ rows: RosterEstudiante[] } | RosterEstudiante[]>(
    "/eval-col/asistencias/sesion/estudiantes",
    { params },
  )
  return Array.isArray(raw) ? raw : (raw.rows ?? [])
}

export function useAsistenciaRosterQuery(params: AsistenciaSesionEstudiantesParams | null) {
  return useQuery({
    queryKey: ["asistencia", "sesion-estudiantes", params],
    queryFn: () => fetchEstudiantesSesion(params!),
    enabled: params !== null,
  })
}

export function useAsistenciaRosterPorBloquesQuery(
  base: Omit<AsistenciaSesionEstudiantesParams, "BLOQUE">,
  bloques: number[],
) {
  const queries = useQueries({
    queries: bloques.map((bloque) => {
      const params: AsistenciaSesionEstudiantesParams = { ...base, BLOQUE: bloque }
      return {
        queryKey: ["asistencia", "sesion-estudiantes", params],
        queryFn: () => fetchEstudiantesSesion(params),
      }
    }),
  })

  const isPending = queries.some((q) => q.isPending)
  const isError = queries.some((q) => q.isError)
  const porBloque = new Map<number, RosterEstudiante[]>()
  bloques.forEach((bloque, index) => {
    const data = queries[index]?.data
    if (data) porBloque.set(bloque, data)
  })
  const refetch = () => Promise.all(queries.map((q) => q.refetch()))

  return { porBloque, isPending, isError, refetch }
}
