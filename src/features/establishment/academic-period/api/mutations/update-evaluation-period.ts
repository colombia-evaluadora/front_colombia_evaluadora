import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { EvaluationPeriodFormValues } from "../../schema"
import type {
  MutationResult,
  UpdateEvaluationPeriodRequest,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

interface UpdateEvaluationPeriodInput {
  // PK real (path); `fn_periodo_eval_actualizar` no recibe `fk_periodo`.
  id: number
  // El popover de creación también arma este `academicPeriodId`; se acepta
  // para no tocar el dialog, pero la actualización no lo usa (no reasigna
  // el periodo académico).
  academicPeriodId?: number
  values: EvaluationPeriodFormValues
}

function toUpdateEvaluationPeriodRequest(
  values: EvaluationPeriodFormValues
): UpdateEvaluationPeriodRequest {
  return {
    CODIGO: values.codigo,
    NOMBRE: values.nombre,
    ABREVIACION: values.abreviacion,
    FECHA_INICIO: values.startDate,
    FECHA_FIN: values.endDate,
    FK_ESTADO: values.estadoId,
    PORCENTAJE: values.peso,
  }
}

function updateEvaluationPeriod({
  id,
  values,
}: UpdateEvaluationPeriodInput): Promise<MutationResult> {
  return api.put(
    `/eval-col/periodo-evaluacion/editar/${id}`,
    toUpdateEvaluationPeriodRequest(values)
  )
}

interface UseUpdateEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof updateEvaluationPeriod>
}

export function useUpdateEvaluationPeriod({
  mutationConfig,
}: UseUpdateEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
