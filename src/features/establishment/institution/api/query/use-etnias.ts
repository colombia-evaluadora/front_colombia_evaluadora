import { catalogoMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import {
  fetchSelectCategoryWithParent,
  LISTA_VALOR_STALE_TIME,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

/**
 * Lista valor RESGUARDO, con su etnia como valor padre (lista ETNIA, sso
 * V104.1). El campo que persiste la matrícula es `ETNIA_RESGUARDO`
 * (`fk_tresguardo`), así que cada opción es un resguardo (su
 * `pk_lista_valor`) y se rotula "Etnia - Resguardo", como el catálogo viejo.
 */
export async function fetchEtnias(): Promise<CatalogItem[]> {
  const rows = await fetchSelectCategoryWithParent("RESGUARDO", "ETNIA")
  return rows.map(({ row, padre }) => ({
    id: row.pk_lista_valor,
    code: row.valor,
    name: padre ? `${padre.nombre} - ${row.nombre}` : row.nombre,
  }))
}

/** `enabled: false` cuando la pantalla trae su propio catálogo (inscripción pública, sin sesión). */
export function useEtniasQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    staleTime: LISTA_VALOR_STALE_TIME,
    queryKey: ["catalogs", "etnias"],
    meta: catalogoMeta(),
    queryFn: fetchEtnias,
  })
}
