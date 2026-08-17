import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationPeriod } from "../types/evaluation-period"
import {
  toEvaluationPeriod,
  type EvaluationPeriodListRow,
} from "./use-evaluation-periods"

interface EvaluationPeriodDetailResponse {
  rows: EvaluationPeriodListRow[]
}

// No consumido todavía por ningún componente (los diálogos de edición usan la
// fila que ya trae la tabla) — se agrega para completar el mapeo 1:1 con
// `GET /periodo-evaluacion/detalle/:ID` (`fn_periodo_eval_detalle`). La
// respuesta viene envuelta en `{rows: [...]}` (confirmado por ThunderClient),
// igual que el listado, no como objeto plano.
async function fetchEvaluationPeriod(id: number): Promise<EvaluationPeriod> {
  const raw: EvaluationPeriodDetailResponse = await api.get(
    `/eval-col/periodo-evaluacion/detalle/${id}`
  )
  const row = raw.rows?.[0]
  if (!row) throw new Error("Periodo de evaluación no encontrado.")
  return toEvaluationPeriod(row)
}

export const evaluationPeriodQueryKey = (id: number) => ["evaluation-period", id]

export function useEvaluationPeriodQuery(id: number | undefined) {
  return useQuery({
    queryKey: evaluationPeriodQueryKey(id ?? 0),
    queryFn: () => fetchEvaluationPeriod(id as number),
    enabled: id != null,
  })
}
