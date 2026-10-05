import { useQuery } from "@tanstack/react-query"

import type { MetodologiaOption } from "@/features/establishment/academic-period/api/types/metodologia"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// Catálogo genérico de TLISTA_VALOR (`GET /eval-col/select/MODELO_PEDAGOGICO`).
async function fetchMetodologias(): Promise<MetodologiaOption[]> {
  const rows = await fetchSelectCategory("MODELO_PEDAGOGICO")
  return rows.map((row) => ({ key: row.valor, label: row.nombre }))
}

export function useMetodologiasQuery() {
  return useQuery({
    queryKey: academicPeriodKeys.metodologias(),
    queryFn: fetchMetodologias,
    staleTime: Infinity,
  })
}
