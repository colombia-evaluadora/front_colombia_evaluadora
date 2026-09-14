import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AssignmentSubject } from "@/features/establishment/academic-period/api/types/academic-assignment"

interface AssignmentSubjectRow {
  id: string
  nombre: string
  grado_grupo: string
  jornada: string
  jornada_name: string
  funcionario_id: number | null
  bloqueado_preescolar: boolean | null
}
interface AssignmentSubjectsResponse {
  rows: AssignmentSubjectRow[]
}

async function fetchAssignmentSubjects(
  academicPeriodId: number
): Promise<AssignmentSubject[]> {
  const raw: AssignmentSubjectsResponse = await api.get(
    `/eval-col/asignaciones/pool/${academicPeriodId}`
  )
  const seen = new Set<string>()
  const rows: AssignmentSubjectRow[] = []
  for (const row of raw.rows ?? []) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    rows.push(row)
  }
  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    gradoGrupo: row.grado_grupo,
    jornada: row.jornada,
    jornadaName: row.jornada_name,
    funcionarioId: row.funcionario_id != null ? String(row.funcionario_id) : undefined,
    bloqueadoPreescolar: row.bloqueado_preescolar ?? false,
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
