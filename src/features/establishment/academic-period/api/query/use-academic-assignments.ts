import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { AcademicAssignment } from "@/features/establishment/academic-period/api/types/academic-assignment"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

export interface AcademicAssignmentRow {
  id: number
  funcionario_id: string | number
  docente: string
  grado_id: number
  grado: string
  grupo_id: number
  grupo: string
  asignatura_id: number
  asignatura: string
  estado: "A" | "I"
  automatica: boolean
}

export const toAcademicAssignment = (row: AcademicAssignmentRow): AcademicAssignment => ({
  id: row.id,
  funcionarioId: String(row.funcionario_id),
  docente: row.docente,
  gradeId: row.grado_id,
  grado: row.grado,
  groupId: row.grupo_id,
  grupo: row.grupo,
  subjectId: row.asignatura_id,
  asignatura: row.asignatura,
  status: row.estado,
  automatica: Boolean(row.automatica),
})

// `GET /eval-col/asignaciones/listar/:periodId`: todas las asignaciones del
// período, incluidas las automáticas del Responsable de grupo (Regla 108).
// Se traen completas: la búsqueda, los filtros y la paginación son del front,
// y el diálogo las necesita para avisar la asignación única (Regla 69).
async function fetchAcademicAssignments(academicPeriodId: number): Promise<AcademicAssignment[]> {
  const rows = await evalCol.getRows<AcademicAssignmentRow>(
    `/asignaciones/listar/${academicPeriodId}`,
  )
  return rows.map(toAcademicAssignment)
}

export function useAcademicAssignmentsQuery(academicPeriodId: number | undefined) {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.academicAssignments.byPeriod(academicPeriodId ?? 0),
    queryFn: () => fetchAcademicAssignments(academicPeriodId!),
    enabled: academicPeriodId != null,
  })
}
