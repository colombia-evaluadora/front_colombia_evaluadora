import type { QueryClient } from "@tanstack/react-query"

import { esCalificacionesDeActividad, planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * Las lecturas del Planeador que dependen de la asistencia: la asistencia
 * decide `tieneAsistencia` (la celda gris) y `fechaAsistencia` (el
 * `BODY.FECHA` de calificar/observar), así que registrarla o editarla desde
 * el módulo de Asistencia deja al Planeador mostrando el estado anterior
 * hasta que se recargue la página.
 *
 * Las dos son de otra pantalla, así que en general están inactivas: esto no
 * dispara un refetch inmediato, las marca stale para que la próxima vez que
 * se monten pidan datos frescos.
 */
export function invalidarPlaneadorPorAsistencia(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
  // Calificaciones de CUALQUIER actividad: el id va en el medio de la key,
  // así que no hay prefijo común — se filtra por posición.
  queryClient.invalidateQueries({
    predicate: ({ queryKey }) => esCalificacionesDeActividad(queryKey),
  })
}
