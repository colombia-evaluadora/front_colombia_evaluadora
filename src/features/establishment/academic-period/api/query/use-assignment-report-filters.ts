import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ReportFilterOption } from "@/features/establishment/academic-period/api/query/use-study-plan-report-filters"

interface TeacherRow {
  funcionario_id: number
  nombre_completo: string
}
interface TeachersRawResponse {
  rows: TeacherRow[]
}

// Mismo endpoint que `use-assignment-teachers.ts` (`fn_asignacion_docente_listar`),
// sin paginar, solo para alimentar el multi-select de "Docente" del reporte
// de asignación académica.
async function fetchTeacherOptions(academicPeriodId?: number): Promise<ReportFilterOption[]> {
  if (academicPeriodId == null) return []
  const raw: TeachersRawResponse = await api.get(
    `/eval-col/asignaciones/docentes/${academicPeriodId}?pageIndex=0&pageSize=500`
  )
  return (raw.rows ?? []).map((row) => ({ id: row.funcionario_id, nombre: row.nombre_completo }))
}

export const teacherOptionsQueryKey = (academicPeriodId?: number) => [
  "assignment-report",
  "teacher-options",
  academicPeriodId,
]

export function useTeacherOptionsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: teacherOptionsQueryKey(academicPeriodId),
    queryFn: () => fetchTeacherOptions(academicPeriodId),
  })
}
