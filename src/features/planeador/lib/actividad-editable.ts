import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * Regla 37 del backend (sso `fn_actividad_motivo_no_editable`, V496.1): con
 * al menos un resultado capturado —nota, observación o captura de
 * instrumento— la actividad (recuperación incluida) ya no se edita, y tampoco
 * si es la base de una recuperación. El backend lo rechaza con 23503 en el
 * PUT/PATCH de la actividad, sus materiales/instrumento/adaptaciones/
 * estudiantes/criterios/evidencias y al vincular/desvincular la unidad.
 * Calificar, observar, soportes, estado del resultado, validación del
 * coordinador y eliminar siguen su propio camino.
 */
export const MENSAJE_ACTIVIDAD_NO_EDITABLE =
  "No puedes editar esta actividad porque ya tiene calificaciones u observaciones registradas."

/**
 * Motivo por el que la actividad no se puede editar, o `undefined` si se
 * puede. El detalle (`GET /planeador/actividades/:id`, sso V553) trae el
 * motivo exacto; las filas de `/actividades/mias` no, así que ahí se infiere
 * de `evaluados` (mismo conteo que usa el backend). Una actividad que solo es
 * base de una recuperación se detecta recién con el detalle.
 */
export function motivoNoEditable(
  actividad: Pick<Actividad, "motivoNoEditable" | "evaluados"> | null | undefined,
): string | undefined {
  if (!actividad) return undefined
  if (actividad.motivoNoEditable) return actividad.motivoNoEditable
  return (actividad.evaluados ?? 0) > 0 ? MENSAJE_ACTIVIDAD_NO_EDITABLE : undefined
}
