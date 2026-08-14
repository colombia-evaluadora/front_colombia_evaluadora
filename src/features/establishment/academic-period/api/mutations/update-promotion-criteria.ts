import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  PromotionCriteria,
} from "@/features/establishment/academic-period/api/types/promotion-criteria"
import { resolveObligatorias } from "@/features/establishment/academic-period/api/mutations/resolve-required-subjects"

interface UpdatePromotionCriteriaInput {
  academicPeriodId: number
  // Con `gradeId`, guarda el override del grado en vez del criterio por
  // defecto del periodo (`fn_criterio_prom_guardar` toma ambos; `FK_GRADO`
  // NULL = fila del periodo). Ver V70: la fila del catálogo no mandaba este
  // argumento en absoluto y la llamada tiraba error de Postgres siempre,
  // period-level incluido — corregido ahí, no acá.
  gradeId?: number
  values: PromotionCriteria
}

// Body PLANO con las llaves de `fn_criterio_prom_guardar`
// (`PUT /eval-col/periodos/:ID/criterio-promocion`, id_query 47 — ya
// registrada como PUT, no PATCH). `ASIGNATURA_OBLIGATORIA` no tiene campo en
// el form: se deriva de si `requiredSubjects` no está vacío.
async function toPromotionCriteriaRequest(
  academicPeriodId: number,
  gradeId: number | undefined,
  values: PromotionCriteria
) {
  const obligatorias = await resolveObligatorias(
    academicPeriodId,
    values.curriculumNode,
    values.requiredSubjects
  )
  return {
    FK_GRADO: gradeId,
    NODO_CURRICULAR: values.curriculumNode,
    CANTIDAD_NIVELAR: values.maxFailedRecovery,
    ASIGNATURA_OBLIGATORIA: obligatorias.length > 0 ? "S" : "N",
    APROBACION_PROMEDIO: values.applyAverageApproval ? "S" : "N",
    DESEMPENHO_MIN_GENERAL: values.basePercentage,
    DESEMPENHO_MINIMO: values.minimumSubjectPercentage,
    MAX_ASIG_PROMEDIO: values.maxFailedForAverage,
    MINIMO_INASISTENCIAS: values.absencePercentage,
    MAX_ASIG_NIVELAR_PROM: values.maxLeveledSubjects,
    OBLIGATORIAS: obligatorias,
  }
}

async function updatePromotionCriteria({
  academicPeriodId,
  gradeId,
  values,
}: UpdatePromotionCriteriaInput): Promise<MutationResult> {
  const body = await toPromotionCriteriaRequest(academicPeriodId, gradeId, values)
  return api.put(
    `/eval-col/periodos/${academicPeriodId}/criterio-promocion`,
    body
  )
}

interface UseUpdatePromotionCriteriaOptions {
  mutationConfig?: MutationConfig<typeof updatePromotionCriteria>
}

export function useUpdatePromotionCriteria({
  mutationConfig,
}: UseUpdatePromotionCriteriaOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePromotionCriteria,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["promotion-criteria"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
