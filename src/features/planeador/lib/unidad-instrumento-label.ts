import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"

/**
 * Rótulo de la pestaña ("Unidad temática"/"Proyecto pedagógico"/…) que le
 * corresponde a un grado — mismo criterio de resolución que
 * `planeador-unidades-page.tsx` (filtrar por `gradoIds` de la fila de
 * `GET /planeador/unidades/tabs`). Con un solo `instrumento` disponible (el
 * caso más común, un docente de un solo nivel) siempre cae al genérico
 * "Unidad temática" — no hay ambigüedad que resolver.
 */
export function useUnidadInstrumentoLabel(gradoId: number | undefined): string {
  const { data: tabs } = useUnidadesTabsQuery()
  if (gradoId == null || !tabs || tabs.length <= 1) return "Unidad temática"
  return tabs.find((tab) => tab.gradoIds.includes(gradoId))?.instrumento ?? "Unidad temática"
}

/**
 * Artículo definido para anteponer al rótulo en un mensaje ("la Unidad
 * temática", "el Proyecto pedagógico"). Aproximación por prefijo: de los
 * dos valores reales confirmados (colección Postman
 * `planeador-flujo-unidad-actividad`) "Proyecto pedagógico" es masculino;
 * cualquier otro rótulo que aparezca a futuro ("Unidad temática", "Valores",
 * …) se trata como femenino por default — no hay un catálogo de género
 * gramatical que consultar.
 */
export function articuloDefinido(instrumento: string): "la" | "el" {
  return instrumento.toLowerCase().startsWith("proyecto") ? "el" : "la"
}

/**
 * Mensaje de éxito al crear/editar una unidad, con el rótulo dinámico en
 * vez de "Unidad temática" fijo. El participio ("creado"/"actualizado")
 * queda invariable —es la construcción impersonal "se ha creado", no un
 * adjetivo que concuerde con el sustantivo— así que solo el artículo
 * cambia según el género de `instrumento`.
 */
export function mensajeUnidadGuardada(accion: "creado" | "actualizado", instrumento: string): string {
  return `Se ha ${accion} con éxito ${articuloDefinido(instrumento)} ${instrumento}.`
}
