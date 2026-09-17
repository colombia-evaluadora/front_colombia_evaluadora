import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateStudyPlanItemRequest,
} from "@/features/establishment/academic-period/api/types/study-plan"
interface UpdateStudyPlanItemInput {
  codigo: number
  gradeId: number
  values: UpdateStudyPlanItemRequest
}

async function updateStudyPlanItem({
  codigo,
  values,
}: UpdateStudyPlanItemInput): Promise<MutationResult> {
  return api.put(`/eval-col/plan-asignaturas/${codigo}`, {
    FK_ASIGNATURA: values.asignaturaId,
    NUMERO_HORA: values.intensidadHoraria,
    INFLUENCIA_AREA: values.influenciaArea,
    NUMERO_CREDITO: values.numeroCreditos,
    INFLUYE_DESEMPENO: values.influyeDesempeno,
    MATRICULA_OBLIGATORIA: values.matriculaObligatoria,
    APROBACION_OBLIGATORIA: values.aprobacionObligatoria,
    FK_FORMATO_CALIF: values.formatoCalificacion || null,
    FK_CRITERIO_NOTA: values.criterioNota || null,
  })
}

interface UseUpdateStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof updateStudyPlanItem>
}

export function useUpdateStudyPlanItem({ mutationConfig }: UseUpdateStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      queryClient.invalidateQueries({ queryKey: ["study-plan-available"] })
      queryClient.invalidateQueries({ queryKey: ["assignment-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
