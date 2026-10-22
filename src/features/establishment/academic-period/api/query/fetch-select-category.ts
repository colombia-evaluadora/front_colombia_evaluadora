import type { QueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { catalogoMeta } from "@/lib/offline/query-meta"

// Fila de `GET /eval-col/select/:CATEGORIA`.
export interface SelectCategoryRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

interface SelectCategoryResponse {
  rows: SelectCategoryRow[]
}

export async function fetchSelectCategory(
  categoria: string
): Promise<SelectCategoryRow[]> {
  const raw: SelectCategoryResponse = await api.get(
    `/eval-col/select/${categoria}`
  )
  return raw.rows ?? []
}

/** Caduca para que lo editado en Listas valor llegue a otros usuarios. */
export const LISTA_VALOR_STALE_TIME = 5 * 60 * 1000

export const selectCategoryQueryKey = (categoria: string) => ["select-category", categoria] as const

/** Única definición de query de una categoría; cada feature mapea con `select`. */
export const selectCategoryQueryOptions = (categoria: string) => ({
  meta: catalogoMeta(),
  queryKey: selectCategoryQueryKey(categoria),
  queryFn: () => fetchSelectCategory(categoria),
  staleTime: LISTA_VALOR_STALE_TIME,
})

/** Tras editar en Listas valor: ambos sistemas de catálogo. */
export function invalidateListaValor(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["select-category"] })
  queryClient.invalidateQueries({ queryKey: ["catalogs"] })
}
