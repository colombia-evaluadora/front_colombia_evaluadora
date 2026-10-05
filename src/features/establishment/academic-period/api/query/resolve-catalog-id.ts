import type { QueryClient } from "@tanstack/react-query"

import {
  fetchSelectCategory,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Resolver un `pk_lista_valor` de `TLISTA_VALOR` a partir del texto que tiene
 * el front (nombre visible, código `valor` o una etiqueta canónica de UI).
 *
 * Los `fn_*_crear`/`_actualizar` piden FKs numéricas (`FK_TLV_*`,
 * `FK_GRADO_SIGUIENTE`, `tipoEscala`…), pero los forms trabajan con el texto
 * del `<Select>`. Cada `resolveXxxId(nombre)` del planeador y de periodos
 * académicos repetía lo mismo: `GET /eval-col/select/:CATEGORIA`, buscar la
 * primera fila que calce y devolver su pk. Lo único que cambia es CÓMO se
 * compara, y eso queda como opción:
 *
 * - `match: "nombre"` (default): igualdad exacta contra `row.nombre`
 *   (TIPO_ACTIVIDAD, TIPO_EVIDENCIA, MODALIDAD).
 * - `match: "valor"`: igualdad exacta contra el código estable `row.valor`.
 * - `match: "valorOrNombre"`: `row.valor === x || row.nombre === x`
 *   (GRADOS, MODELO_PEDAGOGICO, TIPO_VALORACION).
 * - `normalize(row)`: traduce la fila a la etiqueta canónica que usa el form
 *   (match por substring de `nombre`, diccionario de códigos, etc.) y se
 *   compara contra eso. Si se pasa, reemplaza a `match`.
 */
export interface ResolveCatalogIdOptions {
  match?: "nombre" | "valor" | "valorOrNombre"
  normalize?: (row: SelectCategoryRow) => string | undefined
}

/** Query key del catálogo crudo; solo se usa si el llamador pasa `queryClient`. */
export const selectCategoryQueryKey = (categoria: string) => ["select-category", categoria] as const

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
 * Busca el pk de `nombre` en la categoría `categoria`. Vacío o sin match →
 * `undefined` (el llamador decide si eso es `null` en el body o un error).
 *
 * Sin `queryClient` pide el catálogo en cada llamada (comportamiento
 * histórico de todos los `resolveXxxId`: se resuelve justo antes de guardar,
 * así un cambio de catálogo nunca deja un pk viejo). Con `queryClient` lo
 * cachea con `staleTime: Infinity` bajo `selectCategoryQueryKey(categoria)`.
 */
export async function resolveCatalogId(
  queryClient: QueryClient | undefined,
  categoria: string,
  nombre: string | null | undefined,
  opts?: ResolveCatalogIdOptions,
): Promise<number | undefined> {
  if (!nombre) return undefined
  const rows = queryClient
    ? await queryClient.fetchQuery({
        queryKey: selectCategoryQueryKey(categoria),
        queryFn: () => fetchSelectCategory(categoria),
        staleTime: Infinity,
      })
    : await fetchSelectCategory(categoria)
  return findCatalogId(rows, nombre, opts)
}
