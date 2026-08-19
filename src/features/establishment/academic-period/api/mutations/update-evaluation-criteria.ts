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
// `SET_GRADING_SCALE` siempre TRUE: el front siempre manda `gradingScale` en
// cada guardado (confirmado), y la función solo re-propaga la escala si de
// verdad cambió.
//
// `MAX_RECOVERY_GRADE`: `p_max_recovery_grade` ya existe en
// `fn_criterio_eval_actualizar` (guarda en PORCENTAJE_MAXIMO_RECUPERACION,
// ver V79) — antes no se mandaba, así que ese campo nunca se guardaba pese a
// que el back ya lo soporta. Si el id_query 51 en `public.query` todavía no
// castea este BODY hacia el parámetro, hace falta actualizarlo ahí también
// (mismo tipo de drift que se encontró en `initial_grade`/GET).
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
  console.log("[criterio-evaluacion save] body", body)
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
      queryClient.invalidateQueries({ queryKey: ["evaluation-criteria"] })
      // Cambiar el formato de calificación cambia cómo `fn_escala_listar`
      // reconvierte nota_minima/maxima/equivalente (relativas al formato del
      // periodo) — sin invalidar esto, la pestaña de escalas seguía
      // mostrando los valores viejos hasta un refresh manual.
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
