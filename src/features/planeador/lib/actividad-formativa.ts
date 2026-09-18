import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { PlanillaColumna } from "@/features/planeador/api/types/planilla"

/**
 * ¿La actividad va por observación en vez de nota?
 *
 * Lo decide el backend (`fn_actividad_es_formativa`, V243): la unidad de la
 * actividad tiene un referente curricular NO evaluativo. El front no lo
 * deduce — probamos con el instrumento y es falso, porque una actividad
 * evaluativa sin instrumento definido también lo tiene nulo y `observar` la
 * rechaza con 22023. Desde V442 el detalle lo expone como `es_formativa`.
 *
 * `undefined` (mock, o el listado, que no lo trae) se trata como NO formativa,
 * igual que hace el backend con una actividad sin unidad.
 */
export function esActividadFormativa(actividad: Actividad): boolean {
  return actividad.esFormativa === true
}

/** Misma bandera, ya resuelta por columna en la Planilla. */
export function esColumnaFormativa(columna: PlanillaColumna): boolean {
  return columna.esFormativa
}
