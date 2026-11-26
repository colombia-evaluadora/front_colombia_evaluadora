import { catalogoMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import {
  fetchSelectCategory,
  LISTA_VALOR_STALE_TIME,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

/**
 * Lista valor DISCAPACIDAD (sso V104.1; su padre es TIPO_DISCAPACIDAD). El
 * `id` es el `pk_lista_valor` que guardan `FK_TDISCAPACIDAD*`.
 */
export async function fetchDisabilityTypes(): Promise<CatalogItem[]> {
  const rows = await fetchSelectCategory("DISCAPACIDAD")
  return rows.map((row) => ({ id: row.pk_lista_valor, code: row.valor, name: row.nombre }))
}

/** `enabled: false` cuando la pantalla trae su propio catálogo (inscripción pública, sin sesión). */
export function useDisabilityTypesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    staleTime: LISTA_VALOR_STALE_TIME,
    queryKey: ["catalogs", "disability-types"],
    meta: catalogoMeta(),
    queryFn: fetchDisabilityTypes,
  })
}
