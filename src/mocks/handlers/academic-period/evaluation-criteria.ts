import { http, HttpResponse, delay } from "msw"

import {
  DEFAULT_EVALUATION_CRITERIA,
  evaluationCriteriaDb,
} from "@/mocks/db/academic-period/evaluation-criteria"
import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// `fn_criterio_eval_obtener`/`fn_criterio_eval_actualizar` — el path/body
// reales (ver `use-evaluation-criteria.ts`/`update-evaluation-criteria.ts`),
// no el `/api/evaluation-criteria/:id` viejo que este mock tenía antes. Sin
// esto la pantalla de Criterio de evaluación caía en el mismo bug que
// Criterio de promoción: la request no matcheaba ningún handler, pasaba de
// largo al backend real vía el proxy de Vite, y el 401 por el JWT de mock
// deslogueaba a toda la app.
function toRow(academicPeriodId: number, criteria: EvaluationCriteria) {
  return {
    academic_period_id: academicPeriodId,
    grading_format: Number(criteria.gradingFormat) || 0,
    // Sin catálogo FORMATO_CALIFICACION mockeado en select-catalog.ts
    // (ninguna de las categorías de criterios de evaluación lo está todavía),
    // no hay de dónde resolver el nombre acá — se deja `null`, igual que
    // devolvería el back para un FK que no matchea ningún TLISTA_VALOR.
    grading_format_name: null,
    grading_scale: criteria.gradingScale ? Number(criteria.gradingScale) : null,
    period_calculation_elements: Number(criteria.periodCalculationElements) || 0,
    subject_grade_criteria: Number(criteria.subjectGradeCriteria) || 0,
    final_grade_criteria: Number(criteria.finalGradeCriteria) || 0,
    area_grade_criteria: Number(criteria.areaGradeCriteria) || 0,
    student_without_grades_performance:
      Number(criteria.studentWithoutGradesPerformance) || 0,
    rounding_mode: Number(criteria.roundingMode) || 0,
    initial_grade: Number(criteria.initialGrade) || 0,
  }
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
      const body = (await request.json()) as {
        GRADING_FORMAT: string
        GRADING_SCALE: string | null
        PERIOD_CALC_ELEMENTS: string
        SUBJECT_GRADE_CRITERIA: string
        FINAL_GRADE_CRITERIA: string
        AREA_GRADE_CRITERIA: string
        STUDENT_WO_GRADES: string
        ROUNDING_MODE: string
        INITIAL_GRADE: number
      }
      evaluationCriteriaDb[academicPeriodId] = {
        gradingFormat: body.GRADING_FORMAT,
        gradingScale: body.GRADING_SCALE ?? undefined,
        periodCalculationElements: body.PERIOD_CALC_ELEMENTS,
        subjectGradeCriteria: body.SUBJECT_GRADE_CRITERIA,
        finalGradeCriteria: body.FINAL_GRADE_CRITERIA,
        areaGradeCriteria: body.AREA_GRADE_CRITERIA,
        studentWithoutGradesPerformance: body.STUDENT_WO_GRADES,
        maxRecoveryGrade: 0,
        roundingMode: body.ROUNDING_MODE,
        initialGrade: body.INITIAL_GRADE,
      }
      return HttpResponse.json({ status: "ok", message: "Criterios de evaluación guardados." })
    }
  ),
]
