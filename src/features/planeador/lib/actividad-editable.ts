import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { OutboxOp } from "@/lib/offline/outbox/types"

/**
 * Regla 37 del backend (sso `fn_actividad_motivo_no_editable`, V496.1): con
 * al menos un resultado capturado —nota, observación, "No presentó" o captura
 * de instrumento— la actividad (recuperación incluida) ya no se edita, y
 * tampoco si es la base de una recuperación. El backend lo rechaza con 23503
 * (409) en el PUT/PATCH de la actividad, sus materiales/instrumento/
 * adaptaciones/estudiantes/criterios/evidencias, al vincular/desvincular la
 * unidad y al cambiar su peso en la unidad. Calificar, observar, soportes,
 * estado del resultado, validación del coordinador y eliminar siguen su
 * propio camino.
 */
export const MENSAJE_ACTIVIDAD_NO_EDITABLE =
  'No puedes editar esta actividad porque ya tiene calificaciones, observaciones o "No presentó" registrados.'

/**
 * Calificaciones u observaciones hechas sin red que todavía están en la
 * outbox: el servidor aún no las ve (el detalle dice "editable"), pero al
 * sincronizar la actividad quedaría calificada con una definición que el
 * docente cambió después.
 */
export const MENSAJE_RESULTADOS_SIN_SINCRONIZAR =
  "No puedes editar esta actividad porque tiene calificaciones u observaciones guardadas en este equipo que aún no se sincronizan."

/**
 * Motivo por el que la actividad no se puede editar, o `undefined` si se
 * puede. El detalle (`GET /planeador/actividades/:id`) y los listados
 * (`/actividades/mias`, `/unidades/:id/actividades`, sso V553/V492.4) traen el
 * motivo exacto; si una respuesta vieja no lo trae se infiere de `evaluados`
 * (cuenta notas y observaciones de formativas, no todo lo que bloquea).
 */
export function motivoNoEditable(
  actividad: Pick<Actividad, "motivoNoEditable" | "evaluados"> | null | undefined,
): string | undefined {
  if (!actividad) return undefined
  if (actividad.motivoNoEditable) return actividad.motivoNoEditable
  return (actividad.evaluados ?? 0) > 0 ? MENSAJE_ACTIVIDAD_NO_EDITABLE : undefined
}

/** `motivo_no_editable`/`editable` de una fila del backend (detalle o listados). */
export function motivoNoEditableDeFila(row: {
  motivo_no_editable?: string | null
  editable?: "S" | "N" | null
}): string | undefined {
  return row.motivo_no_editable?.trim() || (row.editable === "N" ? MENSAJE_ACTIVIDAD_NO_EDITABLE : undefined)
}

/** Ops de la planilla que, al sincronizar, dejan un resultado en la actividad. */
const KINDS_RESULTADO = new Set([
  "planilla.calificar",
  "planilla.calificar-bulk",
  "planilla.observacion",
  "planilla.estado-resultado",
])

/** Estados de una op que todavía van a llegar al servidor (`rejected` no: el servidor la rechazó). */
const ESTADOS_PENDIENTES = new Set(["pending", "inflight", "retry", "blocked", "conflict"])

/**
 * Cuántas calificaciones/observaciones/"No presentó" de ESTA actividad
 * esperan en la outbox. Quitar el "No presentó" (`PENDIENTE`) no deja
 * resultado, así que no cuenta.
 */
export function resultadosSinSincronizar(ops: readonly OutboxOp[], actividadId: number): number {
  return ops.filter((op) => {
    if (!KINDS_RESULTADO.has(op.kind) || !ESTADOS_PENDIENTES.has(op.status)) return false
    const payload = op.payload as { actividadId?: number | null; estado?: string } | null
    if (payload?.actividadId !== actividadId) return false
    return !(op.kind === "planilla.estado-resultado" && payload.estado === "PENDIENTE")
  }).length
}
