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
      .map((o) => (o.type === "subject" ? o.subjectName : o.areaName))
      .filter((name): name is string => name != null),
  }
}

// `gradeId` pide el override del grado (`fn_criterio_prom_obtener` filtra
// por `FK_GRADO` cuando viene, devolviendo la fila del grado o NULL si no
// hay override y ese grado hereda el del periodo); sin `gradeId` trae el
// criterio por defecto del periodo (filas con `FK_GRADO` NULL).
async function fetchPromotionCriteria(
  academicPeriodId: number,
  gradeId?: number
): Promise<PromotionCriteria | undefined> {
  // `FK_GRADO` (uppercase) matchea `:QUERY.FK_GRADO` del SQL — antes iba como
  // `fkGrado` camelCase y no resolvía; el binder del query-service matchea
  // case-sensitive. Axios omite `null`/`undefined` de la URL, así que cuando
  // no hay gradeId el back recibe NULL y devuelve el criterio por defecto.
  const raw: PromotionCriteriaResponse = await api.get(
    `/eval-col/periodos/${academicPeriodId}/criterio-promocion`,
    {
      params: {
        FK_GRADO: gradeId ?? null,
      },
    }
  )
  const row = raw.rows?.[0]
  // Sin fila = todavía no se configuró el criterio (por defecto del periodo,
  // o el grado no tiene override propio); el form arranca de `EMPTY` (ver
  // tab-promotion-criteria.tsx), no es error.
  return row ? toPromotionCriteria(row) : undefined
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
