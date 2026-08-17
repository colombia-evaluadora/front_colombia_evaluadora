import { cleanErrorMessage } from "@/lib/api-client"

// Forma común de los endpoints `fn_*_bulk_delete`: la request es atómica a
// nivel HTTP (siempre 200), pero cada fila borra lo que puede y reporta el
// resto — no hay un único `status`/`message` para todo el lote.
export interface BulkDeleteRow {
  id: number
  eliminado: boolean
  error_code?: string
  error_mensaje?: string
}

export interface BulkDeleteResult {
  rows: BulkDeleteRow[]
}

export interface BulkDeleteSummary {
  totalCount: number
  succeededCount: number
  failed: BulkDeleteRow[]
}

export function summarizeBulkDelete(result: BulkDeleteResult): BulkDeleteSummary {
  const failed = result.rows.filter((row) => !row.eliminado)
  return {
    totalCount: result.rows.length,
    succeededCount: result.rows.length - failed.length,
    failed,
  }
}

/**
 * Arma el mensaje de error a partir de las razones que trajo el back
 * (`error_mensaje` por fila), con un prefijo genérico cuando no viene
 * ninguna. `describeFailed` recibe el conteo de fallos y resuelve su propio
 * singular/plural (p.ej. `n === 1 ? "el periodo académico" : \`${n} periodos académicos\``).
 */
export function formatBulkDeleteError(
  summary: BulkDeleteSummary,
  describeFailed: (failedCount: number) => string,
): string {
  const reasons = summary.failed
    .map((row) => row.error_mensaje)
    .filter((msg): msg is string => Boolean(msg))
    .map(cleanErrorMessage)
    .join(" ")

  const prefix =
    summary.succeededCount === 0
      ? `No se pudo${summary.failed.length === 1 ? "" : "n"} eliminar ${describeFailed(summary.failed.length)}.`
      : `Se eliminaron ${summary.succeededCount} de ${summary.totalCount}. No se pudo${summary.failed.length === 1 ? "" : "n"} eliminar ${describeFailed(summary.failed.length)}.`

  return reasons ? `${prefix} ${reasons}` : prefix
}
