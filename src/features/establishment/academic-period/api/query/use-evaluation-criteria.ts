import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// Fila cruda de `GET /eval-col/periodos/:ID/criterio-evaluacion`
// (`fn_criterio_eval_obtener`, id_query 50) — snake_case, tal como declara la
// función (`RETURNS TABLE(...)`). `maxRecoveryGrade` no tiene columna en el
// backend todavía (sin parámetro ni retorno en la función); queda fuera de
// este mapeo y el form la maneja localmente.
interface EvaluationCriteriaRow {
  academic_period_id: number
  grading_format: number
  grading_scale: number | null
  period_calculation_elements: number
  subject_grade_criteria: number
  final_grade_criteria: number
  area_grade_criteria: number
  student_without_grades_performance: number
  rounding_mode: number
  initial_grade: number
}

interface EvaluationCriteriaResponse {
  rows: EvaluationCriteriaRow[]
}

function toEvaluationCriteria(row: EvaluationCriteriaRow): EvaluationCriteria {
  return {
    gradingFormat: String(row.grading_format),
    gradingScale:
      row.grading_scale == null ? undefined : String(row.grading_scale),
    periodCalculationElements: String(row.period_calculation_elements),
    subjectGradeCriteria: String(row.subject_grade_criteria),
    finalGradeCriteria: String(row.final_grade_criteria),
    areaGradeCriteria: String(row.area_grade_criteria),
    studentWithoutGradesPerformance: String(
      row.student_without_grades_performance
    ),
    // Sin columna en el backend todavía (ni parámetro ni retorno en
    // `fn_criterio_eval_obtener`/`fn_criterio_eval_actualizar`); el form la
    // sigue mostrando, pero arranca vacía y no se manda al guardar (ver
    // `toEvaluationCriteriaRequest` en update-evaluation-criteria.ts).
    maxRecoveryGrade: "",
    roundingMode: String(row.rounding_mode),
    initialGrade: String(row.initial_grade),
  }
}

async function fetchEvaluationCriteria(
  academicPeriodId: number
): Promise<EvaluationCriteria> {
  const raw: EvaluationCriteriaResponse = await api.get(
    `/eval-col/periodos/${academicPeriodId}/criterio-evaluacion`
  )
  const row = raw.rows?.[0]
  if (!row) throw new Error("Criterios de evaluación no encontrados.")
  return toEvaluationCriteria(row)
}

export const evaluationCriteriaQueryKey = (academicPeriodId: number) => [
  "evaluation-criteria",
  academicPeriodId,
]

export function useEvaluationCriteriaQuery(
  academicPeriodId: number | undefined
) {
  return useQuery({
    queryKey: evaluationCriteriaQueryKey(academicPeriodId ?? 0),
    queryFn: () => fetchEvaluationCriteria(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}
