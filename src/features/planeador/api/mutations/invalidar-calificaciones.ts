import type { QueryClient } from "@tanstack/react-query"

import { esCalificacionesDeActividad, planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * X2 del plan offline: calificar celda, bulk y observar deben refrescar
 * `actividad.calificaciones(id)` además de la planilla, o la vista de
 * calificación de la actividad (modo `grades` del panel) sigue mostrando el
 * valor previo hasta que vence el `staleTime`.
 *
 * Con `actividadId` se invalida exactamente esa actividad (una vez). Las
 * mutaciones por celda solo conocen `pkTactividadEstudiante`: sin id se cae al
 * predicado posicional `esCalificacionesDeActividad` (el id va en el medio de
 * la key, no hay prefijo común), que es más amplio pero nunca deja datos viejos.
 */
export function invalidarCalificacionesActividad(queryClient: QueryClient, actividadId?: number | null) {
  if (actividadId != null) {
    return queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.calificaciones(actividadId) })
  }
  return queryClient.invalidateQueries({ predicate: (q) => esCalificacionesDeActividad(q.queryKey) })
}
