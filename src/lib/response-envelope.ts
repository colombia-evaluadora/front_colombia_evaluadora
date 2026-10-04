import { env } from "@/config/env"

/**
 * El motor de ejecución de queries del SSO envuelve TODO resultado SELECT
 * en `{ rows: [...] }`, sin importar qué devuelva el SQL registrado (una
 * sola fila calculada vía `SELECT fn_x(...) AS alias`, un detalle por id,
 * un listado completo, etc. — confirmado contra la tabla `query` real).
 * El mock (MSW) nunca produce esta forma: ya devuelve directamente lo que
 * el front espera. Por eso todas las funciones de este archivo son no-ops
 * mientras `env.ENABLE_API_MOCKING` esté activo — el "parseo" solo aplica
 * hablando con el backend real.
 */
export interface RowsEnvelope<T> {
  rows: T[]
}

/** Endpoints que listan N filas tal cual (catálogos, SETOF sin paginar). */
export function unwrapRows<T>(response: RowsEnvelope<T> | T[]): T[] {
  if (env.ENABLE_API_MOCKING) return response as T[]
  return (response as RowsEnvelope<T>).rows
}

/**
 * Endpoints de una sola fila: detalle por id, o el resultado de una
 * mutación registrada como `SELECT fn_x(...) AS alias` (que siempre
 * vuelve como una única fila con esa columna). Un array vacío del lado
 * real es un bug de la query registrada, no un "no encontrado" legítimo
 * (eso ya lo señaliza el 404 HTTP) — por eso tira en vez de devolver
 * `undefined` silenciosamente.
 *
 * Nota para los callers: `api.get/post/put/patch<T>` ya resuelve al body
 * desenvuelto y está tipado así (`Promise<T>`, ver el `declare module
 * "axios"` y el response interceptor en api-client.ts). Pedile directamente
 * la forma real que llega del backend, p. ej.
 * `api.get<RowsEnvelope<Row> | Row>(...)`, y pasá el resultado acá.
 */
export function unwrapRow<T>(response: RowsEnvelope<T> | T): T {
  if (env.ENABLE_API_MOCKING) return response as T
  const rows = (response as RowsEnvelope<T>).rows
  if (!rows || rows.length === 0) {
    throw new Error("La respuesta del backend no trajo ninguna fila")
  }
  return rows[0]
}

/**
 * Forma real de cada fila que devuelven los wrappers `fn_x_listar_paginado`
 * (`fn_est_listar_paginado`, `fn_sed_listar_paginado`,
 * `fn_usu_empleados_listar_paginado`, ...): una única fila con `rows`
 * (JSONB array, mismas columnas que el `_listar` correspondiente),
 * `total_count`, `page_count`, `page_index`, `page_size`.
 */
interface RealPaginatedRow<TRow> {
  rows: TRow[]
  total_count: number
  page_count: number
  page_index: number
  page_size: number
}

/** Forma que ya esperan los hooks del front (mock y post-parseo real). */
export interface PaginatedResult<TRow> {
  rows: TRow[]
  pageCount: number
  totalCount: number
}

/**
 * Desenvuelve la respuesta de un listado paginado real: `{ rows: [{ rows,
 * total_count, page_count, ... }] }` → `{ rows, pageCount, totalCount }`.
 * En mock, no-op (el mock ya responde con la segunda forma).
 */
export function unwrapPaginated<TRow>(response: unknown): PaginatedResult<TRow> {
  if (env.ENABLE_API_MOCKING) {
    return response as PaginatedResult<TRow>
  }
  const row = unwrapRow(response as RowsEnvelope<RealPaginatedRow<TRow>>)
  return {
    rows: row.rows,
    pageCount: row.page_count,
    totalCount: row.total_count,
  }
}
