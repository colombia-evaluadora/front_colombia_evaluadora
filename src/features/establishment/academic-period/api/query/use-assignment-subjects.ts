import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AssignmentSubject } from "@/features/establishment/academic-period/api/types/academic-assignment"

interface AssignmentSubjectRow {
  id: string
  nombre: string
  grado_grupo: string
  jornada: string
  jornada_name: string
}
interface AssignmentSubjectsResponse {
  rows: AssignmentSubjectRow[]
}

// Pool de asignaturas asignables del periodo: grado × grupo × plan de estudio.
// `GET /eval-col/asignaciones/pool` (`fn_asignacion_pool`, id_query 83).
async function fetchAssignmentSubjects(
  academicPeriodId: number
): Promise<AssignmentSubject[]> {
  const raw: AssignmentSubjectsResponse = await api.get(
    `/eval-col/asignaciones/pool?academicPeriodId=${academicPeriodId}`
  )
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    gradoGrupo: row.grado_grupo,
    jornada: row.jornada,
    jornadaName: row.jornada_name,
  }))
}

export const assignmentSubjectsQueryKey = (academicPeriodId: number) => [
  "assignment-subjects",
  academicPeriodId,
]

export function useAssignmentSubjectsQuery(academicPeriodId: number | undefined) {
  return useQuery({
    queryKey: assignmentSubjectsQueryKey(academicPeriodId ?? 0),
    queryFn: () => fetchAssignmentSubjects(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}
