import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AssignmentSubject } from "@/features/establishment/academic-period/api/types/academic-assignment"

interface AssignmentSubjectRow {
  id: string
  nombre: string
  grado_grupo: string
  jornada: string
  jornada_name: string
  // PK_TFUNCIONARIO que ya tiene este grupo-asignatura en el periodo, o
  // `null` si está libre (V89).
  funcionario_id: number | null
}
interface AssignmentSubjectsResponse {
  rows: AssignmentSubjectRow[]
}

// Pool de asignaturas asignables del periodo: grado × grupo × plan de estudio.
// `GET /eval-col/asignaciones/pool/:ACADEMIC_PERIOD_ID` (`fn_asignacion_pool`,
// id_query 83 — el periodo pasó de query string a path param porque
// `:CONTEXT.USER_ID` resuelto en el filtro de visibilidad hacía que, con
// `ACADEMIC_PERIOD_ID` como query param opcional, algo en el camino lo
// perdiera y el pool volviera vacío contra la API real). El pool trae TODO
// el par grupo-asignatura, asignado o no, más quién lo tiene
// (`funcionario_id`, V89) — `tab-academic-assignments.tsx` decide
// "disponible" (funcionarioId == null) vs "actual de este docente"
// (id ∈ savedIds) en el cliente. Filtrar acá con `soloSinDocente=true`
// ocultaría también las materias del propio docente que se está editando.
async function fetchAssignmentSubjects(
  academicPeriodId: number
): Promise<AssignmentSubject[]> {
  const raw: AssignmentSubjectsResponse = await api.get(
    `/eval-col/asignaciones/pool/${academicPeriodId}`
  )
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    gradoGrupo: row.grado_grupo,
    jornada: row.jornada,
    jornadaName: row.jornada_name,
    funcionarioId: row.funcionario_id != null ? String(row.funcionario_id) : undefined,
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
