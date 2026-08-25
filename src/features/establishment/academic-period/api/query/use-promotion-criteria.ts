import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { PromotionCriteria } from "@/features/establishment/academic-period/api/types/promotion-criteria"

// Elemento de `mandatory_subjects` (jsonb) tal como lo arma
// `fn_criterio_prom_obtener` — ya trae el nombre resuelto, no solo el id.
interface MandatorySubjectRow {
  id: number
  type: "subject" | "area"
  subjectId: number | null
  subjectName: string | null
  areaId: number | null
  areaName: string | null
}

// Fila cruda de `GET /eval-col/periodos/:ID/criterio-promocion`
// (`fn_criterio_prom_obtener`, id_query 48). `:ID` = academic period id,
// `FK_GRADO` = opcional, filtra al override del grado cuando viene seteado;
// sin él la función devuelve el criterio por defecto del periodo (filas con
// `grade_id` NULL — ver `fn_criterio_prom_obtener` en el SQL).
interface PromotionCriteriaRow {
  id: number
  academic_period_id: number
  grade_id: number | null
  curriculum_node: string
  max_failed_recovery: number
  asignatura_obligatoria: "S" | "N"
  apply_average_approval: "S" | "N"
  base_percentage: number
  minimum_subject_percentage: number
  max_failed_for_average: number
  absence_percentage: number
  max_leveled_subjects: number
  mandatory_subjects: MandatorySubjectRow[]
}

interface PromotionCriteriaResponse {
  rows: PromotionCriteriaRow[]
}

export function toPromotionCriteria(row: PromotionCriteriaRow): PromotionCriteria {
  return {
    curriculumNode: row.curriculum_node,
    maxFailedRecovery: row.max_failed_recovery,
    absencePercentage: row.absence_percentage,
    maxLeveledSubjects: row.max_leveled_subjects,
    applyAverageApproval: row.apply_average_approval === "S",
    basePercentage: row.base_percentage,
    minimumSubjectPercentage: row.minimum_subject_percentage,
    maxFailedForAverage: row.max_failed_for_average,
    requiredSubjects: (row.mandatory_subjects ?? [])
      .map((o) => (o.type === "subject" ? o.subjectId : o.areaId))
      .filter((id): id is number => id != null),
  }
}

async function fetchPromotionCriteria(
  academicPeriodId: number,
  gradeId?: number
): Promise<PromotionCriteria | null> {
  const raw: PromotionCriteriaResponse = await api.get(
    `/eval-col/periodos/${academicPeriodId}/criterio-promocion`,
    {
      params: {
        FK_GRADO: gradeId ?? null,
      },
    }
  )
  const row = raw.rows?.[0]
  return row ? toPromotionCriteria(row) : null
}

export const promotionCriteriaQueryKey = (
  academicPeriodId: number,
  gradeId?: number
) => ["promotion-criteria", academicPeriodId, gradeId]

export function usePromotionCriteriaQuery(
  academicPeriodId: number | undefined,
  gradeId?: number
) {
  return useQuery({
    queryKey: promotionCriteriaQueryKey(academicPeriodId ?? 0, gradeId),
    queryFn: () => fetchPromotionCriteria(academicPeriodId as number, gradeId),
    enabled: academicPeriodId != null,
  })
}
