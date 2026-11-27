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
  /** Rótulo corto del valor (p. ej. código DANE del municipio, siglas de la discapacidad). */
  etiqueta?: string | null
  orden?: number
  /** `pk_lista_valor` del valor padre (municipio → departamento, especialidad → carácter…), sso V442. */
  fk_tlista_valor_padre?: number | null
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

/**
 * Valores de `categoria` con su valor padre de `categoriaPadre` ya resuelto.
 * `/select/:CATEGORIA` devuelve solo el pk del padre; el nombre sale de la
 * lista padre, que es otra categoría (sso V104.1). El padre puede ser null si
 * la lista padre está inactiva o el valor no lo tiene.
 */
export async function fetchSelectCategoryWithParent(
  categoria: string,
  categoriaPadre: string
): Promise<{ row: SelectCategoryRow; padre: SelectCategoryRow | null }[]> {
  const [rows, padres] = await Promise.all([fetchSelectCategory(categoria), fetchSelectCategory(categoriaPadre)])
  const padrePorPk = new Map(padres.map((padre) => [padre.pk_lista_valor, padre]))
  return rows.map((row) => ({ row, padre: padrePorPk.get(row.fk_tlista_valor_padre ?? -1) ?? null }))
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
