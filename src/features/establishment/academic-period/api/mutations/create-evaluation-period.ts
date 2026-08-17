import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { EvaluationPeriodFormValues } from "../schema"
import type { CreateEvaluationPeriodRequest } from "../types/evaluation-period"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "./extract-write-result"

interface CreateEvaluationPeriodInput extends EvaluationPeriodFormValues {
  academicPeriodId?: number
}

export function toCreateEvaluationPeriodRequest(
  values: CreateEvaluationPeriodInput
): CreateEvaluationPeriodRequest {
  // Body PLANO con las llaves de `fn_periodo_eval_crear`. El usuario sale de
  // `:CONTEXT.USER_ID` → no se manda.
  return {
    FK_PERIODO: values.academicPeriodId ?? 0,
    CODIGO: values.codigo,
    NOMBRE: values.nombre,
    ABREVIACION: values.abreviacion,
    FECHA_INICIO: values.startDate,
    FECHA_FIN: values.endDate,
    FK_ESTADO: values.estadoId,
    PORCENTAJE: values.peso,
  }
}

// `fn_periodo_eval_crear` devuelve `{rows: [{fn_periodo_eval_crear: <id>}]}`
// (confirmado por ThunderClient), no un envelope `{status, message}`.
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
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
