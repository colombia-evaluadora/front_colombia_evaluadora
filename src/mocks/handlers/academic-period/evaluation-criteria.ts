import { http, HttpResponse, delay } from "msw"

import {
  DEFAULT_EVALUATION_CRITERIA,
  evaluationCriteriaDb,
  evaluationCriteriaName,
} from "@/mocks/db/academic-period/evaluation-criteria"
import { parseGradingRange } from "@/features/establishment/academic-period/utils/grading-range"
import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// `fn_criterio_eval_obtener`/`fn_criterio_eval_actualizar` — el path/body
// reales (ver `use-evaluation-criteria.ts`/`update-evaluation-criteria.ts`).
// Sin handler la request salía al back real y el 401 del JWT de mock cerraba
// la sesión.
function toRow(academicPeriodId: number, criteria: EvaluationCriteria) {
  const fk = (value: string) => (value ? Number(value) : null)
  return {
    academic_period_id: academicPeriodId,
    grading_format: fk(criteria.gradingFormat),
    grading_format_name: evaluationCriteriaName(criteria.gradingFormat),
    grading_scale: criteria.gradingScale ? Number(criteria.gradingScale) : null,
    period_calculation_elements: fk(criteria.periodCalculationElements),
    subject_grade_criteria: fk(criteria.subjectGradeCriteria),
    final_grade_criteria: fk(criteria.finalGradeCriteria),
    area_grade_criteria: fk(criteria.areaGradeCriteria),
    student_without_grades_performance: fk(criteria.studentWithoutGradesPerformance),
    rounding_mode: fk(criteria.roundingMode),
    initial_grade: criteria.initialGrade,
    max_recovery_grade: criteria.maxRecoveryGrade,
    rating_scale_mode: fk(criteria.ratingScaleMode),
    recovery_mode: fk(criteria.recoveryMode),
    recovery_percentage: criteria.recoveryPercentage,
  }
}

interface WriteBody {
  GRADING_FORMAT: string
  GRADING_SCALE: string | null
  PERIOD_CALC_ELEMENTS: string
  SUBJECT_GRADE_CRITERIA: string
  FINAL_GRADE_CRITERIA: string
  AREA_GRADE_CRITERIA: string
  STUDENT_WO_GRADES: string
  ROUNDING_MODE: string
  INITIAL_GRADE: number
  MAX_RECOVERY_GRADE: number
  RATING_SCALE_MODE: string
  RECOVERY_MODE: string
  RECOVERY_PERCENTAGE: number | null
}

// Reglas 45 y 48 tal como las aplicaría `fn_criterio_eval_actualizar`.
function validate(body: WriteBody): string | null {
  const { min, max } = parseGradingRange(evaluationCriteriaName(body.GRADING_FORMAT) ?? undefined)
  const out = (nota: string) =>
    `La ${nota} debe estar entre ${min} y ${max} del Formato de calificación.`
  if (body.INITIAL_GRADE < min || body.INITIAL_GRADE > max) return out("Nota inicial")
  if (body.MAX_RECOVERY_GRADE < min || body.MAX_RECOVERY_GRADE > max) {
    return out("Nota máxima de recuperación")
  }
  if (body.MAX_RECOVERY_GRADE < body.INITIAL_GRADE) {
    return "La Nota máxima de recuperación no puede ser menor que la Nota inicial."
  }
  if (evaluationCriteriaName(body.RECOVERY_MODE) === "Ponderar") {
    const p = body.RECOVERY_PERCENTAGE
    if (p == null || p < 1 || p > 100) return "El % de recuperación debe estar entre 1 y 100."
  }
  return null
}

export const evaluationCriteriaHandlers = [
  http.get(
    "/api/eval-col/periodos/:academicPeriodId/criterio-evaluacion",
    async ({ params }) => {
      await delay(200)
      const academicPeriodId = Number(params.academicPeriodId)
      const criteria = evaluationCriteriaDb[academicPeriodId] ?? DEFAULT_EVALUATION_CRITERIA
      return HttpResponse.json({ rows: [toRow(academicPeriodId, criteria)] })
    }
  ),

  http.put(
    "/api/eval-col/periodos/:academicPeriodId/criterio-evaluacion",
    async ({ params, request }) => {
      await delay(400)
      const academicPeriodId = Number(params.academicPeriodId)
      const body = (await request.json()) as WriteBody
      const error = validate(body)
      if (error) return HttpResponse.json({ status: "error", message: error }, { status: 409 })
      const weighted = evaluationCriteriaName(body.RECOVERY_MODE) === "Ponderar"
      evaluationCriteriaDb[academicPeriodId] = {
        gradingFormat: body.GRADING_FORMAT,
        gradingScale: body.GRADING_SCALE ?? undefined,
        periodCalculationElements: body.PERIOD_CALC_ELEMENTS,
        subjectGradeCriteria: body.SUBJECT_GRADE_CRITERIA,
        finalGradeCriteria: body.FINAL_GRADE_CRITERIA,
        areaGradeCriteria: body.AREA_GRADE_CRITERIA,
        studentWithoutGradesPerformance: body.STUDENT_WO_GRADES,
        maxRecoveryGrade: body.MAX_RECOVERY_GRADE,
        roundingMode: body.ROUNDING_MODE,
        initialGrade: body.INITIAL_GRADE,
        ratingScaleMode: body.RATING_SCALE_MODE,
        recoveryMode: body.RECOVERY_MODE,
        recoveryPercentage: weighted ? body.RECOVERY_PERCENTAGE : null,
      }
      return HttpResponse.json({ status: "ok", message: "Criterios de evaluación guardados." })
    }
  ),
]
