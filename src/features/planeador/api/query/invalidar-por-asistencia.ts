import type { QueryClient } from "@tanstack/react-query"

import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"

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
  queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
  // `["planeador", "actividad", <id>, "calificaciones", <fecha?>]` — el id va
  // en el medio, así que no hay prefijo común: se filtra por posición.
  queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === "planeador" && queryKey[1] === "actividad" && queryKey[3] === "calificaciones",
  })
}
