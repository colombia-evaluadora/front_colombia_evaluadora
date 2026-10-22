import type { QueryClient } from "@tanstack/react-query"

import {
  fetchSelectCategory,
  selectCategoryQueryOptions,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Resuelve un `pk_lista_valor` desde el texto del form. `match` elige contra
 * qué columna comparar; `normalize` traduce la fila y reemplaza a `match`.
 */
export interface ResolveCatalogIdOptions {
  match?: "nombre" | "valor" | "valorOrNombre"
  normalize?: (row: SelectCategoryRow) => string | undefined
}

/** Versión síncrona sobre filas ya cargadas (p. ej. resoluciones en lote). */
export function findCatalogId(
  rows: readonly SelectCategoryRow[],
  nombre: string | null | undefined,
  { match = "nombre", normalize }: ResolveCatalogIdOptions = {},
): number | undefined {
  if (!nombre) return undefined
  const row = rows.find((r) => {
    if (normalize) return normalize(r) === nombre
    if (match === "valor") return r.valor === nombre
    if (match === "valorOrNombre") return r.valor === nombre || r.nombre === nombre
    return r.nombre === nombre
  })
  return row?.pk_lista_valor
}

/**
 * Pk de `nombre` en `categoria`, o `undefined`. Sin `queryClient` pide el
 * catálogo en cada llamada, así nunca manda un pk viejo.
 */
export async function resolveCatalogId(
  queryClient: QueryClient | undefined,
  categoria: string,
  nombre: string | null | undefined,
  opts?: ResolveCatalogIdOptions,
): Promise<number | undefined> {
  if (!nombre) return undefined
  const rows = queryClient
    ? await queryClient.fetchQuery(selectCategoryQueryOptions(categoria))
    : await fetchSelectCategory(categoria)
  return findCatalogId(rows, nombre, opts)
}
