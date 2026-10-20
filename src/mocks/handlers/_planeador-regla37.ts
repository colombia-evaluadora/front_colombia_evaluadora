import { HttpResponse } from "msw"

import { motivoNoEditableMock } from "@/mocks/db/planeador"

/**
 * Regla 37 (sso `fn_actividad_validar_editable`): con resultados (o siendo
 * base de una recuperación) el real rechaza toda escritura de la actividad
 * —PUT, evidencias, criterios, materiales, instrumento, adaptaciones,
 * estudiantes, vincular/desvincular y peso en la unidad— con 409 (23503 →
 * `FK_NOT_FOUND` en el query-service) y el motivo en `message`. `null` si se
 * puede escribir. Helper compartido por los handlers del planeador.
 */
export function rechazoNoEditable(actividadId: number) {
  const motivo = motivoNoEditableMock(actividadId)
  return motivo
    ? HttpResponse.json({ status: 409, code: "FK_NOT_FOUND", message: motivo }, { status: 409 })
    : null
}

/** `editable`/`motivo_no_editable` de una fila de listado, como el real (sso V553/V492.4). */
export function editableFila(actividadId: number) {
  const motivo = motivoNoEditableMock(actividadId)
  return { editable: motivo ? "N" : "S", motivo_no_editable: motivo ?? null }
}
