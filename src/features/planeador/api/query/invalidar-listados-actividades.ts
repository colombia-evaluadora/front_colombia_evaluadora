import type { QueryClient } from "@tanstack/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"

/**
 * Crear/editar/eliminar una actividad tiene que refrescar TODO lo que la
 * pantalla principal del Planeador muestra: el rail (`/actividades/mias`), el
 * calendario mensual (`/actividades/calendario`) y las cards de resumen
 * (`/actividades/stats`) — más el listado legado de `size=500` que sigue
 * usando `DialogBibliotecaRecursos`.
 *
 * Los tres primeros no tienen su propio `xxxQueryKeyPrefix()` exportado (sus
 * `xxxQueryKey(params)` piden `params` completos — `fechaDesde`/`fechaHasta`
 * son obligatorios en el de calendario, así que no se les puede pasar `{}`
 * para armar un prefijo). Se invalida por el prefijo literal en vez de
 * llamarlos: TanStack Query matchea por defecto contra el PRINCIPIO de la
 * key (`["planeador","actividades-mias"]` alcanza sin importar qué `params`
 * tenga la query real cacheada).
 *
 * Antes de este helper, `create-actividad.ts`/`update-actividad.ts` solo
 * invalidaban el listado legado y `delete-actividad.ts` invalidaba
 * `["actividad"]` (sin la "es"), que no matchea la key real de ninguno:
 * guardar o eliminar una actividad dejaba el rail, el calendario y los
 * contadores mostrando el estado anterior hasta que su `staleTime` (30s)
 * expirara solo.
 */
export function invalidarListadosActividades(
  queryClient: QueryClient,
  options?: { detalleId?: number },
): void {
  queryClient.invalidateQueries({ queryKey: ["planeador", "actividades-mias"] })
  queryClient.invalidateQueries({ queryKey: ["planeador", "actividades-calendario"] })
  queryClient.invalidateQueries({ queryKey: ["planeador", "actividades-stats"] })
  queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
  if (options?.detalleId != null) {
    queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(options.detalleId) })
  }
}
