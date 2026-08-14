import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  EvaluationCriteria,
  MutationResult,
} from "@/features/establishment/academic-period/api/types/evaluation-criteria"

interface UpdateEvaluationCriteriaInput {
  academicPeriodId: number
  values: EvaluationCriteria
}

// Body PLANO con las llaves de `fn_criterio_eval_actualizar`
// (`PUT /eval-col/periodos/:ID/criterio-evaluacion`, id_query 51 — PUT desde
// V65, no PATCH: PATCH no funciona a nivel de plataforma en el SSO).
// `maxRecoveryGrade` no tiene parámetro en el backend todavía → no se manda
// (ver use-evaluation-criteria.ts). `SET_GRADING_SCALE` siempre TRUE: el
// front siempre manda `gradingScale` en cada guardado (confirmado), y la
// función solo re-propaga la escala si de verdad cambió.
function toEvaluationCriteriaRequest(values: EvaluationCriteria) {
  return {
    GRADING_FORMAT: values.gradingFormat,
    GRADING_SCALE: values.gradingScale || null,
    SET_GRADING_SCALE: true,
    PERIOD_CALC_ELEMENTS: values.periodCalculationElements,
    SUBJECT_GRADE_CRITERIA: values.subjectGradeCriteria,
    FINAL_GRADE_CRITERIA: values.finalGradeCriteria,
    AREA_GRADE_CRITERIA: values.areaGradeCriteria,
    STUDENT_WO_GRADES: values.studentWithoutGradesPerformance,
    ROUNDING_MODE: values.roundingMode,
    INITIAL_GRADE: values.initialGrade,
  }
}

function updateEvaluationCriteria({
  academicPeriodId,
  values,
}: UpdateEvaluationCriteriaInput): Promise<MutationResult> {
  return api.put(
    `/eval-col/periodos/${academicPeriodId}/criterio-evaluacion`,
    toEvaluationCriteriaRequest(values)
  )
}

interface UseUpdateEvaluationCriteriaOptions {
  mutationConfig?: MutationConfig<typeof updateEvaluationCriteria>
}

export function useUpdateEvaluationCriteria({
  mutationConfig,
}: UseUpdateEvaluationCriteriaOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEvaluationCriteria,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-criteria"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
