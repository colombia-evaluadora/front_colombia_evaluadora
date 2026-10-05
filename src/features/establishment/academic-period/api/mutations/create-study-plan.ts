import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateStudyPlanItemRequest } from "@/features/establishment/academic-period/api/types/study-plan"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/mutations/extract-write-result"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

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
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.studyPlans.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.studyPlanAvailable.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentSubjects.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.teacherAssignments.all })
      // En preescolar el backend arma el horario solo al guardar el plan (V437).
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.horario.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
