import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  AsistenciaSesionEstudiantesParams,
  RosterEstudiante,
} from "@/features/academic-management/asistencia/api/types/asistencia"

async function fetchEstudiantesSesion(params: AsistenciaSesionEstudiantesParams): Promise<RosterEstudiante[]> {
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
