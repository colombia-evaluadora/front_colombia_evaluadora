import type { QueryClient } from "@tanstack/react-query"

import { invalidarInformes } from "@/features/academic-management/reports/api/query/invalidar-informes"
import { esDetalleDeActividad, planeadorKeys } from "@/features/planeador/api/query-keys"

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
  // La actividad también se ve desde su unidad (tabla de vinculadas y
  // disponibles, totales de peso/puntaje) y como columna de la planilla:
  // eliminarla dejaba ambas mostrando la actividad borrada hasta recargar.
  queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.all })
  queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.all })
  queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.all })
  // Editar, eliminar o importar actividades mueve la nota de la asignatura:
  // la tabla y las alertas de Informes (cambios y planillas pendientes).
  invalidarInformes(queryClient)
}

/**
 * Vincular, desvincular o cambiar el peso/puntaje de una actividad dentro de
 * una unidad cambia datos que se leen desde los dos lados:
 *
 * - La unidad: su detalle, la tabla de actividades vinculadas y las
 *   disponibles (huérfanas) de TODAS las unidades — al vincular, la actividad
 *   deja de ser huérfana para cualquier otra unidad, y si se movía de unidad
 *   la anterior también cambia. Por eso `unidad.all` y no solo
 *   `unidad.detalle(unidadId)`; más el listado de unidades (`unidades.all`).
 * - La actividad: el detalle (`actividad.detalle(id)`, que muestra la unidad,
 *   su peso y su instrumento) y los listados del Planeador (rail, calendario
 *   y cards, todos bajo `actividades.all`). Antes solo se invalidaba la
 *   unidad y el detalle de la actividad seguía mostrando el vínculo viejo
 *   hasta recargar.
 * - Con "Promedio simple" o "Suma de puntos" el backend recalcula el % de
 *   las demás actividades de la unidad, cuyos ids no se conocen acá: se
 *   marcan todos los detalles de actividad (solo el detalle; solo se vuelve
 *   a pedir el que esté montado).
 *
 * Todas las keys salen de `planeadorKeys` y son prefijo real de las de
 * lectura (`api/query-keys.ts`).
 */
export function invalidarVinculoActividadUnidad(queryClient: QueryClient, actividadId: number): void {
  queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.all })
  queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.all })
  queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(actividadId) })
  queryClient.invalidateQueries({ predicate: (q) => esDetalleDeActividad(q.queryKey) })
  queryClient.invalidateQueries({ queryKey: planeadorKeys.actividades.all })
  // La nota de la asignatura puede cambiar: tabla y alertas de Informes.
  invalidarInformes(queryClient)
}

/**
 * Crear, editar o eliminar una unidad temática. Eliminar es el caso más
 * amplio: el backend da de baja la unidad y desvincula sus actividades, así
 * que cambia todo lo que muestra la unidad o sus actividades:
 *
 * - Unidades: listado (`unidades.all`), tabs por referente (`unidades.tabs()`
 *   es prefijo de las tabs con alcance) y todo lo que cuelga de cualquier
 *   unidad (`unidad.all`: detalle, actividades vinculadas/disponibles,
 *   criterios, configuración…).
 * - Actividades: rail, calendario, cards y programación (`actividades.all`),
 *   las tabs (`actividades.tabs()`, fuera de `actividades.all` a propósito) y
 *   `actividad.all` — detalle, instrumento y contextos de configuración de
 *   las actividades vinculadas, cuyos ids no se conocen acá. Solo se vuelve a
 *   pedir lo montado; lo demás queda marcado (también en la cache offline
 *   persistida, ver `query-persister.ts`).
 * - Planilla (`planilla.all`): las columnas se agrupan por unidad.
 * - Informes: la nota de la asignatura cambia.
 *
 * Bug de QA: borrar una unidad solo invalidaba `unidades.*` e Informes; el
 * calendario, el rail, las cards y el detalle de las actividades vinculadas
 * seguían mostrando la unidad borrada hasta recargar.
 */
export function invalidarUnidad(queryClient: QueryClient): void {
  for (const queryKey of [
    planeadorKeys.unidades.all,
    planeadorKeys.unidades.tabs(),
    planeadorKeys.unidad.all,
    planeadorKeys.actividades.all,
    planeadorKeys.actividades.tabs(),
    planeadorKeys.actividad.all,
    planeadorKeys.planilla.all,
  ]) {
    queryClient.invalidateQueries({ queryKey })
  }
  invalidarInformes(queryClient)
}
