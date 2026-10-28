import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { EvaluationPeriodFormValues } from "../schema"
import type { CreateEvaluationPeriodRequest } from "../types/evaluation-period"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "../utils/extract-write-result"
import { invalidateEvaluationPeriodRelated } from "./invalidate"

interface CreateEvaluationPeriodInput extends EvaluationPeriodFormValues {
  academicPeriodId?: number
}

export function toCreateEvaluationPeriodRequest(
  values: CreateEvaluationPeriodInput
): CreateEvaluationPeriodRequest {
  // Body plano de `fn_periodo_eval_crear`; el usuario sale del contexto.
  return {
    FK_PERIODO: values.academicPeriodId ?? 0,
    // La abreviación hace de código (Sección 5.1).
    CODIGO: values.abreviacion,
    NOMBRE: values.nombre,
    ABREVIACION: values.abreviacion,
    FECHA_INICIO: values.startDate,
    FECHA_FIN: values.endDate,
    PORCENTAJE: values.peso,
  }
}

// Devuelve `{rows: [{fn_periodo_eval_crear: <id>}]}`.
async function createEvaluationPeriod(
  input: CreateEvaluationPeriodInput
): Promise<number> {
  const raw: WriteResultResponse = await api.post(
    "/eval-col/periodo-evaluacion",
    toCreateEvaluationPeriodRequest(input)
  )
  return extractWriteResultId(raw)
}

interface UseCreateEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof createEvaluationPeriod>
}

export function useCreateEvaluationPeriod({
  mutationConfig,
}: UseCreateEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateEvaluationPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
