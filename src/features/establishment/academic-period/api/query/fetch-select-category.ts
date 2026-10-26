import { useQuery, type QueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { catalogoMeta } from "@/lib/offline/query-meta"

// Fila de `GET /eval-col/select/:CATEGORIA`.
export interface SelectCategoryRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
  /** Predeterminado de la lista (a lo sumo uno, V102). */
  predeterminado?: boolean
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

const toPredeterminado = (rows: SelectCategoryRow[]) => rows.find((row) => row.predeterminado) ?? null

/** Fila predeterminada de la categoría; null si la lista no tiene (el select queda en "Seleccione"). */
export function usePredeterminadoQuery(categoria: string) {
  return useQuery({ ...selectCategoryQueryOptions(categoria), select: toPredeterminado })
}

/** Tras editar en Listas valor: ambos sistemas de catálogo. */
export function invalidateListaValor(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["select-category"] })
  queryClient.invalidateQueries({ queryKey: ["catalogs"] })
}
