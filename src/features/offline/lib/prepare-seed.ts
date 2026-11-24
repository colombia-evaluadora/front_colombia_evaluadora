// Piezas comunes de las tareas de "Preparar" (aparte para no importar en círculo con `prepare-tasks.ts`).
import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import { canAccessPath, getMenuUrls } from "@/features/navigation/lib/route-access"
import type { PrepareContext, PrepareTask } from "@/features/offline/lib/prepare-engine"
import { prepareQuery } from "@/features/offline/lib/prepare-query"
import type { AppQueryMeta } from "@/lib/offline/query-meta"

export interface SeedOptions<T> {
  /** Si falla no cuenta como error (endpoint que depende del rol, dato accesorio). */
  optional?: boolean
  /** Tareas que salen de la respuesta (listas → detalle de cada elemento). */
  then?: (data: T) => PrepareTask[]
}

/**
 * Pide una query con la key/fn/meta de la pantalla. Lo fresco no se pide y lo
 * que el servidor confirma sin cambios (304) no se baja (`prepareQuery`).
 */
export function seed<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  meta: AppQueryMeta,
  { optional, then }: SeedOptions<T> = {},
): PrepareTask {
  return {
    queryKey,
    meta,
    optional,
    expands: then != null,
    run: async (queryClient: QueryClient, ctx: PrepareContext) => {
      const data = await prepareQuery(queryClient, ctx, {
        queryKey,
        meta,
        fetch: () => queryClient.fetchQuery({ queryKey, queryFn, meta, staleTime: 0 }),
      })
      return then?.(data as T)
    },
  }
}

/** Categoría de `TLISTA_VALOR` con la misma key que usan las pantallas. */
export function seedListaValor(categoria: string, options?: SeedOptions<unknown>): PrepareTask {
  const { queryKey, queryFn, meta } = selectCategoryQueryOptions(categoria)
  return seed(queryKey, queryFn, meta, options)
}

/** ¿El menú del usuario (guardado en el cache) abre esta ruta? */
export function menuIncludes(queryClient: QueryClient, pathname: string): boolean {
  const menu = queryClient.getQueryData<{ url: string; items?: { url: string }[] }[]>(navigationKeys.menu)
  if (!menu) return false
  return canAccessPath(pathname, getMenuUrls(menu))
}
