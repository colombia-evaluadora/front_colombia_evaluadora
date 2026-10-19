import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  EvaluationCriteria,
  MutationResult,
} from "@/features/establishment/academic-period/api/types/evaluation-criteria"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface UpdateEvaluationCriteriaInput {
  academicPeriodId: number
  values: EvaluationCriteria
}

// Body plano de `fn_criterio_eval_actualizar` (id_query 51). SET_GRADING_SCALE siempre
// TRUE: se manda la escala en cada guardado y la función solo la re-propaga si cambió.
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
    MAX_RECOVERY_GRADE: values.maxRecoveryGrade,
  }
}

function updateEvaluationCriteria({
  academicPeriodId,
  values,
}: UpdateEvaluationCriteriaInput): Promise<MutationResult> {
  const body = toEvaluationCriteriaRequest(values)
  return api.put(`/eval-col/periodos/${academicPeriodId}/criterio-evaluacion`, body)
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
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.evaluationCriteria.all })
      // `fn_escala_listar` convierte las notas según el formato del periodo.
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.ratingScales.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
