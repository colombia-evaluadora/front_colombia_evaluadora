import type { QueryClient } from "@tanstack/react-query"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import { esCalificacionesDeActividad, esDetalleDeActividad, planeadorKeys } from "@/features/planeador/api/query-keys"

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

/**
 * Regla 37: el primer resultado (nota, observación, "No presentó") bloquea la
 * edición de la actividad. El detalle y los listados traen ese bloqueo
 * (`motivoNoEditable`: el lápiz del panel y de la card, la pantalla de
 * edición), así que se refrescan mientras la actividad todavía se vea
 * editable. Ya bloqueada, otra calificación no lo cambia: no se vuelven a
 * pedir en cada celda.
 *
 * Sin `actividadId` se marcan todos los detalles (solo el detalle, no lo que
 * cuelga de él) y los listados.
 */
export function refrescarBloqueoEdicion(queryClient: QueryClient, actividadId?: number | null) {
  if (actividadId == null) {
    return Promise.all([
      queryClient.invalidateQueries({ predicate: (q) => esDetalleDeActividad(q.queryKey) }),
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividades.all }),
    ])
  }
  const detalle = queryClient.getQueryData<Pick<Actividad, "motivoNoEditable">>(
    planeadorKeys.actividad.detalle(actividadId),
  )
  if (detalle?.motivoNoEditable) return Promise.resolve()
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(actividadId), exact: true }),
    queryClient.invalidateQueries({ queryKey: planeadorKeys.actividades.all }),
  ])
}
