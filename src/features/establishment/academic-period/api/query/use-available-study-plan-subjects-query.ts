import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AvailableStudyPlanSubject } from "../types/study-plan"

interface AvailableStudyPlanSubjectRow {
  id: number
  nombre: string
  area_id: number
  area_nombre: string
}
interface AvailableStudyPlanSubjectsResponse {
  rows: AvailableStudyPlanSubjectRow[]
}

// `GET /eval-col/grados/:ID/plan-disponibles` (`fn_plan_asignaturas_disponibles_listar`,
// id_query 78) — asignaturas del periodo del grado que aún no están en su
// plan de estudio.
async function fetchAvailableStudyPlanSubjects(
  gradeId: number
): Promise<AvailableStudyPlanSubject[]> {
  const raw: AvailableStudyPlanSubjectsResponse = await api.get(
    `/eval-col/grados/${gradeId}/plan-disponibles`
  )
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    areaId: row.area_id,
    areaNombre: row.area_nombre,
  }))
}

export const availableStudyPlanSubjectsQueryKey = (
  gradeId?: number,
  academicPeriodId?: number
) => ["study-plan-available", gradeId, academicPeriodId]

export function useAvailableStudyPlanSubjectsQuery(
  gradeId?: number,
  academicPeriodId?: number
) {
  return useQuery({
    queryKey: availableStudyPlanSubjectsQueryKey(gradeId, academicPeriodId),
    queryFn: () => fetchAvailableStudyPlanSubjects(gradeId as number),
    enabled: gradeId != null,
  })
}
