import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { catalogoMeta } from "@/lib/offline/query-meta"

export async function fetchPedagogicalApproaches(): Promise<CatalogItem[]> {
  const rows = await fetchSelectCategory("ENFOQUE_PEDAGOGICO")
  return rows.map((row) => ({ id: row.pk_lista_valor, code: row.valor, name: row.nombre }))
}

export const pedagogicalApproachesQueryKey = () => ["curricular-reference-pedagogical-approaches"]

export function usePedagogicalApproachesQuery() {
  return useQuery({
    meta: catalogoMeta(),
    queryKey: pedagogicalApproachesQueryKey(),
    queryFn: fetchPedagogicalApproaches,
    staleTime: Infinity,
  })
}
