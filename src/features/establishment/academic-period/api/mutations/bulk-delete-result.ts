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

// Las funciones `fn_*_soft_delete` arman `error_mensaje` como
// "No se puede eliminar el <entidad> <pk>: <motivo>" — el PK no le sirve al
// usuario (es un id interno, no algo que él haya escrito), así que nos
// quedamos solo con el `<motivo>` desde el primer "N°:" que aparezca.
const ENTITY_PREFIX_RE = /^no se puede eliminar\s+.*?\d+\s*:\s*/i

function extractReason(message: string): string {
  return cleanErrorMessage(message).replace(ENTITY_PREFIX_RE, "").trim()
}

/**
 * Arma el mensaje de error a partir de las razones que trajo el back
 * (`error_mensaje` por fila, sin el PK — ver `extractReason`), con un
 * prefijo genérico cuando no viene ninguna. `describeFailed` recibe el
 * conteo de fallos y resuelve su propio singular/plural (p.ej.
 * `n === 1 ? "el periodo académico" : \`${n} periodos académicos\``).
 *
 * `getLabel`, si se pasa, resuelve el `id` de cada fila fallida al nombre
 * legible que el usuario reconoce (el que ve en la tabla) — quien llama ya
 * tiene esos nombres cargados (son las filas seleccionadas), así que no hace
 * falta pedirlos de nuevo. Sin `getLabel` el detalle queda solo con el
 * motivo, como antes.
 */
export function formatBulkDeleteError(
  summary: BulkDeleteSummary,
  describeFailed: (failedCount: number) => string,
  getLabel?: (id: number) => string | undefined,
): string {
  // `Set`: varias filas suelen fallar por el mismo motivo y, sin `getLabel`,
  // repetirlo una vez por PK no aporta nada, solo alarga el aviso. Con
  // `getLabel` cada detalle ya es distinto (trae el nombre), así que el
  // `Set` no dedupea nada extra pero tampoco molesta.
  const details = Array.from(
    new Set(
      summary.failed
        .map((row) => {
          const reason = row.error_mensaje ? extractReason(row.error_mensaje) : ""
          const label = getLabel?.(row.id)
          if (label && reason) return `"${label}": ${reason}`
          return label ?? reason
        })
        .filter(Boolean),
    ),
  )

  const countLabel = `No se pudo${summary.failed.length === 1 ? "" : "n"} eliminar ${describeFailed(summary.failed.length)}`
  const prefix =
    summary.succeededCount === 0
      ? `${countLabel}.`
      : `Se eliminaron ${summary.succeededCount} de ${summary.totalCount}. ${countLabel}.`

  return details.length > 0 ? `${prefix} ${details.join("; ")}.` : prefix
}
