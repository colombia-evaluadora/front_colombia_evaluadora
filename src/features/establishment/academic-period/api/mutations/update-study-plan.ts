import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateStudyPlanItemRequest,
} from "@/features/establishment/academic-period/api/types/study-plan"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
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
