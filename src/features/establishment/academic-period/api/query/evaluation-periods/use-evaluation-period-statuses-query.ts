import { useQuery } from "@tanstack/react-query"

import type {
  EvaluationPeriodStatus,
  EvaluationPeriodStatusOption,
} from "../../types/evaluation-period"
import { fetchSelectCategory } from "../fetch-select-category"

// Catálogo genérico de TLISTA_VALOR
// (`GET /eval-col/select/ESTADOPERIODOEVALUACION`).
async function fetchEvaluationPeriodStatuses(): Promise<
  EvaluationPeriodStatusOption[]
> {
  const rows = await fetchSelectCategory("ESTADOPERIODOEVALUACION")
  return rows.map((row) => ({
    id: row.pk_lista_valor,
    key: row.valor as EvaluationPeriodStatus,
    label: row.nombre,
  }))
}

export const evaluationPeriodStatusesQueryKey = () => [
  "evaluation-period-statuses",
]

export function useEvaluationPeriodStatusesQuery() {
  return useQuery({
    queryKey: evaluationPeriodStatusesQueryKey(),
    queryFn: fetchEvaluationPeriodStatuses,
    staleTime: Infinity,
  })
}