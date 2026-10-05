import type { QueryClient } from "@tanstack/react-query"

import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * Crear/editar/eliminar/importar actividades tiene que refrescar TODO lo que
 * la pantalla principal del Planeador muestra: el rail (`/actividades/mias`),
 * el calendario mensual (`/actividades/calendario`) y las cards de resumen
 * (`/actividades/stats`) — más el listado legado de `size=500` que sigue
 * usando `DialogBibliotecaRecursos` y la programación del form.
 *
 * Todas esas keys cuelgan de `planeadorKeys.actividades.all` (ver
 * `api/query-keys.ts`), así que una sola invalidación por prefijo alcanza sin
 * importar con qué `params` esté cacheada cada una.
 *
 * Historia: antes cada listado tenía una key hermana suelta
 * (`["planeador","actividades-mias",…]`, `-calendario`, `-stats`) y el
 * legado era `["planeador","actividades"]`, que NO las prefijaba. Por eso
 * `delete-actividad.ts` (que invalidaba `["actividad"]`) e
 * `importar-actividades-json.ts` (que invalidaba solo el legado) dejaban el
 * rail, el calendario y los contadores mostrando el estado anterior hasta que
 * expiraba su `staleTime`.
 */
export function invalidarListadosActividades(
  queryClient: QueryClient,
  options?: { detalleId?: number },
): void {
  queryClient.invalidateQueries({ queryKey: planeadorKeys.actividades.all })
  if (options?.detalleId != null) {
    queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(options.detalleId) })
  }
}
