import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateStudyPlanItemRequest } from "@/features/establishment/academic-period/api/types/study-plan"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/mutations/extract-write-result"

// Body PLANO con las llaves de `fn_plan_agregar`
// (`POST /eval-col/grados/:ID/plan-asignaturas`, id_query 72).
async function createStudyPlanItem(
  input: CreateStudyPlanItemRequest
): Promise<{ id: number }> {
  const raw = await api.post<WriteResultResponse>(
    `/eval-col/grados/${input.gradeId}/plan-asignaturas`,
    {
      FK_ASIGNATURA: input.asignaturaId,
      NUMERO_HORA: input.intensidadHoraria,
      INFLUENCIA_AREA: input.influenciaArea,
      NUMERO_CREDITO: input.numeroCreditos,
      INFLUYE_DESEMPENO: input.influyeDesempeno,
      MATRICULA_OBLIGATORIA: input.matriculaObligatoria,
      APROBACION_OBLIGATORIA: input.aprobacionObligatoria,
      FK_FORMATO_CALIF: input.formatoCalificacion || null,
      FK_CRITERIO_NOTA: input.criterioNota || null,
    }
  )
  return { id: extractWriteResultId(raw) }
}

interface UseCreateStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof createStudyPlanItem>
}

export function useCreateStudyPlanItem({ mutationConfig }: UseCreateStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      queryClient.invalidateQueries({ queryKey: ["study-plan-available"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
