// Las funciones de escritura del backend (crear/actualizar/soft-delete)
// devuelven `{rows: [{<nombre_de_la_función>: valor}]}` — confirmado por
// ThunderClient contra `fn_periodo_crear`, `fn_periodo_eval_crear`,
// `fn_periodo_eval_actualizar` y `fn_periodo_eval_soft_delete`. No hay un
// envelope `{status, message}` real; el nombre de la key varía por función,
// así que se toma el primer (y único) valor de la fila.
export interface WriteResultResponse {
  rows: Array<Record<string, number>>
}

export function extractWriteResultId(raw: WriteResultResponse): number {
  const row = raw.rows?.[0]
  const value = row ? Object.values(row)[0] : undefined
  return Number(value)
}
