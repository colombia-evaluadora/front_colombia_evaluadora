import { useQuery } from "@tanstack/react-query"

import type {
  AcademicPeriodStatus,
  AcademicPeriodStatusOption,
} from "../types/academic-period"
import { fetchSelectCategory } from "./fetch-select-category"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// Catálogo genérico de TLISTA_VALOR (`GET /eval-col/select/ESTADOPERIODO`).
async function fetchAcademicPeriodStatuses(): Promise<
  AcademicPeriodStatusOption[]
> {
  const rows = await fetchSelectCategory("ESTADOPERIODO")
  return rows.map((row) => ({
    id: row.pk_lista_valor,
    key: row.valor as AcademicPeriodStatus,
    label: row.nombre,
  }))
}

export function useAcademicPeriodStatusesQuery() {
  return useQuery({
    queryKey: academicPeriodKeys.academicPeriodStatuses(),
    queryFn: fetchAcademicPeriodStatuses,
    staleTime: Infinity,
  })
}
