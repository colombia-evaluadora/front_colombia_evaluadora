import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { catalogoMeta } from "@/lib/offline/query-meta"

export async function fetchEvaluationTypes(): Promise<CatalogItem[]> {
  const rows = await fetchSelectCategory("TIPO_EVALUACION")
  return rows.map((row) => ({ id: row.pk_lista_valor, code: row.valor, name: row.nombre }))
}

export const evaluationTypesQueryKey = () => ["curricular-reference-evaluation-types"]

export function useEvaluationTypesQuery() {
  return useQuery({
    meta: catalogoMeta(),
    queryKey: evaluationTypesQueryKey(),
    queryFn: fetchEvaluationTypes,
    staleTime: Infinity,
  })
}
