import type { PaginatedResult } from "@/lib/response-envelope"

/**
 * Paginación armada en el front a partir de listados que traen el total
 * repetido en cada fila (`count(*) OVER()` → `total_count`). Es el caso de
 * casi todos los `/query` de eval-col y de auditoría: el backend devuelve la
 * página como filas planas y el front calcula `pageCount`.
 *
 * Distinto de `unwrapPaginated` (`response-envelope.ts`), que desenvuelve los
 * wrappers `fn_x_listar_paginado` donde el backend ya calcula `page_count`.
 * Ambos producen la misma forma `PaginatedResult` que esperan las tablas.
 */

/**
 * Lee un total que puede llegar como número o como string (los `bigint` de
 * Postgres a veces viajan serializados como texto). Ausente, `null` o no
 * numérico → 0.
 */
export function toTotalCount(value: unknown): number {
  if (value == null || value === "") return 0
  const total = typeof value === "number" ? value : Number(value)
  return Number.isFinite(total) && total > 0 ? total : 0
}

/**
 * `ceil(total / pageSize)` con piso de 1 (la tabla siempre muestra al menos
 * "página 1 de 1", aunque no haya filas). Un `pageSize` inválido (0,
 * negativo, NaN) también devuelve 1 en vez de `Infinity`/`NaN`.
 */
export function toPageCount(totalCount: number, pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize <= 0) return 1
  return Math.max(1, Math.ceil(toTotalCount(totalCount) / pageSize))
}

interface ToPaginatedOptions<TRow, T> {
  pageSize: number
  /** Mapeo fila del backend → modelo de dominio. Sin él, las filas pasan tal cual. */
  map?: (row: TRow) => T
  /** Columna con el total (repetido por fila). Default `total_count`. */
  totalKey?: keyof TRow & string
}

/**
 * Arma `{ rows, pageCount, totalCount }` tomando el total de la primera fila.
 * Lista vacía (o `null`/`undefined`) → `{ rows: [], pageCount: 1, totalCount: 0 }`.
 *
 * Si después hay que filtrar/ordenar en cliente, hacelo sobre `result.rows`:
 * el total sigue siendo el del servidor a propósito (es el que pagina).
 */
export function toPaginated<TRow, T = TRow>(
  rows: readonly TRow[] | null | undefined,
  { pageSize, map, totalKey = "total_count" as keyof TRow & string }: ToPaginatedOptions<TRow, T>,
): PaginatedResult<T> {
  const list = rows ?? []
  const first = list[0] as Record<string, unknown> | undefined
  const totalCount = toTotalCount(first?.[totalKey])
  return {
    rows: map ? list.map(map) : (list as unknown as T[]),
    pageCount: toPageCount(totalCount, pageSize),
    totalCount,
  }
}
