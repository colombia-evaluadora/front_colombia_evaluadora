import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationPeriod } from "../types/evaluation-period"
import {
  toEvaluationPeriod,
  type EvaluationPeriodListRow,
} from "./use-evaluation-periods"

// No consumido todavía por ningún componente (los diálogos de edición usan la
// fila que ya trae la tabla) — se agrega para completar el mapeo 1:1 con
// `GET /periodo-evaluacion/detalle/:ID` (`fn_periodo_eval_detalle`).
function fetchEvaluationPeriod(id: number): Promise<EvaluationPeriod> {
  return api
    .get<EvaluationPeriodListRow>(`/eval-col/periodo-evaluacion/detalle/${id}`)
    .then(toEvaluationPeriod)
}

export const evaluationPeriodQueryKey = (id: number) => ["evaluation-period", id]

export function useEvaluationPeriodQuery(id: number | undefined) {
  return useQuery({
    queryKey: evaluationPeriodQueryKey(id ?? 0),
    queryFn: () => fetchEvaluationPeriod(id as number),
    enabled: id != null,
  })
}
