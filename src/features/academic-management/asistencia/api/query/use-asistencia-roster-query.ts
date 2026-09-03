import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { RosterEstudiante } from "@/features/academic-management/asistencia/api/types/asistencia"

function fetchRosterGrupo(fkGrupo: number): Promise<RosterEstudiante[]> {
  return api.get<RosterEstudiante[]>("/eval-col/asistencias/roster", { params: { GRUPO: fkGrupo } })
}

export function useAsistenciaRosterQuery(fkGrupo: number | null) {
  return useQuery({
    queryKey: ["asistencia", "roster", fkGrupo],
    queryFn: () => fetchRosterGrupo(fkGrupo!),
    enabled: fkGrupo !== null,
  })
}
