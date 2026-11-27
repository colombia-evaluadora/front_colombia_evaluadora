import { catalogoMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import {
  fetchSelectCategoryWithParent,
  LISTA_VALOR_STALE_TIME,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

/** Naturaleza jurídica con su sector, que el formulario muestra derivado de ella. */
export interface OwnershipType extends CatalogItem {
  sector?: string | null
}

/**
 * Lista valor NATURALEZA_JURIDICA (sso V104.1): el sector (Oficial / No
 * Oficial) es su valor padre en la lista SECTOR. El `id` es el
 * `pk_lista_valor` que guarda `TESTABLECIMIENTO.FK_TPROPIEDAD_JURIDICA`.
 */
export async function fetchOwnershipTypes(): Promise<OwnershipType[]> {
  const rows = await fetchSelectCategoryWithParent("NATURALEZA_JURIDICA", "SECTOR")
  return rows.map(({ row, padre }) => ({
    id: row.pk_lista_valor,
    code: row.valor,
    name: row.nombre,
    sector: padre?.nombre ?? null,
  }))
}

export function useOwnershipTypesQuery() {
  return useQuery({
    staleTime: LISTA_VALOR_STALE_TIME,
    queryKey: ["catalogs", "ownership-types"],
    meta: catalogoMeta(),
    queryFn: fetchOwnershipTypes,
  })
}
