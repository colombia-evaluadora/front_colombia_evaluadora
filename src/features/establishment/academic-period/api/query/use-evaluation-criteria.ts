import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// Fila cruda de `GET /eval-col/periodos/:ID/criterio-evaluacion`
// (`fn_criterio_eval_obtener`, id_query 50) — snake_case, tal como declara la
// función (`RETURNS TABLE(...)`). El back resuelve cada FK contra
// `TLISTA_VALOR.NOMBRE` y devuelve ambos campos (`*_name`). El front usa el
// nombre como valor del select (mismo patrón que `enfasis_nombre` en
// asignaturas) — evita lookup paralelo y matchea con `fn_criterio_eval_actualizar`
// que también acepta el nombre.
interface EvaluationCriteriaRow {
  academic_period_id: number
  grading_format: number | null
  grading_format_name: string | null
  grading_scale: number | null
  grading_scale_name: string | null
  period_calculation_elements: number | null
  period_calculation_elements_name: string | null
  subject_grade_criteria: number | null
  subject_grade_criteria_name: string | null
  final_grade_criteria: number | null
  final_grade_criteria_name: string | null
  area_grade_criteria: number | null
  area_grade_criteria_name: string | null
  student_without_grades_performance: number | null
  student_without_grades_performance_name: string | null
  rounding_mode: number | null
  rounding_mode_name: string | null
  initial_grade: number | string
}

interface EvaluationCriteriaResponse {
  rows: EvaluationCriteriaRow[]
}

function toEvaluationCriteria(row: EvaluationCriteriaRow): EvaluationCriteria {
  // Helper para los FKs basados en TLISTA_VALOR: cuando el back no configuró
  // el criterio (FK null), devolvemos string vacío para que el select muestre
  // "Seleccionar" en vez de un valor inválido. El save siempre manda estos
  // strings a `fn_criterio_eval_actualizar`, que los parsea como BIGINT.
  const pickId = (fk: number | null): string =>
    fk != null ? String(fk) : ""

  return {
    gradingFormat: pickId(row.grading_format),
    gradingScale:
      row.grading_scale != null ? String(row.grading_scale) : undefined,
    periodCalculationElements: pickId(row.period_calculation_elements),
    subjectGradeCriteria: pickId(row.subject_grade_criteria),
    finalGradeCriteria: pickId(row.final_grade_criteria),
    areaGradeCriteria: pickId(row.area_grade_criteria),
    studentWithoutGradesPerformance: pickId(
      row.student_without_grades_performance
    ),
    // `Number(...) || 0` cubre null/undefined/NaN del back — el form espera
    // un número siempre (el schema exige `min(0)`). `gradingScale` es la
    // única excepción que puede quedar `undefined` (no todas las
    // establecimientos tienen escala creada — ver tab-evaluation-criteria.tsx).
    maxRecoveryGrade: Number(row.initial_grade) || 0,
    roundingMode: pickId(row.rounding_mode),
    initialGrade: Number(row.initial_grade) || 0,
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

export function useEvaluationCriteriaQuery(academicPeriodId: number | undefined) {
  return useQuery({
    queryKey: evaluationCriteriaQueryKey(academicPeriodId ?? 0),
    queryFn: () => fetchEvaluationCriteria(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}
