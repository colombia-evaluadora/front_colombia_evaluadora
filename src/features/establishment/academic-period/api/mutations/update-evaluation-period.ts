import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { EvaluationPeriodFormValues } from "../schema"
import type { UpdateEvaluationPeriodRequest } from "@/features/establishment/academic-period/api/types/evaluation-period"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "../utils/extract-write-result"
import { invalidateEvaluationPeriodRelated } from "./invalidate"

interface UpdateEvaluationPeriodInput {
  // PK real (path); `fn_periodo_eval_actualizar` no recibe `fk_periodo`.
  id: number
  // Se acepta pero no se usa: no reasigna el periodo académico.
  academicPeriodId?: number
  values: EvaluationPeriodFormValues
}

function toUpdateEvaluationPeriodRequest(
  values: EvaluationPeriodFormValues
): UpdateEvaluationPeriodRequest {
  return {
    // La abreviación hace de código (Sección 5.1).
    CODIGO: values.abreviacion,
    NOMBRE: values.nombre,
    ABREVIACION: values.abreviacion,
    FECHA_INICIO: values.startDate,
    FECHA_FIN: values.endDate,
    PORCENTAJE: values.peso,
  }
}

// Devuelve `{rows: [{fn_periodo_eval_actualizar: <id>}]}`.
async function updateEvaluationPeriod({
  id,
  values,
}: UpdateEvaluationPeriodInput): Promise<number> {
  const raw: WriteResultResponse = await api.put(
    `/eval-col/periodo-evaluacion/editar/${id}`,
    toUpdateEvaluationPeriodRequest(values)
  )
  return extractWriteResultId(raw)
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
      invalidateEvaluationPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
