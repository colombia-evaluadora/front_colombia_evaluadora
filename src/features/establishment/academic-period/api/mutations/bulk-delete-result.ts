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

const ENTITY_PREFIX_RE = /^no se puede eliminar\s+.*?:\s*/i

function extractReason(message: string): string {
  return cleanErrorMessage(message).replace(ENTITY_PREFIX_RE, "").trim()
}

export function formatBulkDeleteError(
  summary: BulkDeleteSummary,
  describeFailed: (failedCount: number) => string,
  getLabel?: (id: number) => string | undefined,
): string {
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

  const countLabel = `No se pud${summary.failed.length === 1 ? "o" : "ieron"} eliminar ${describeFailed(summary.failed.length)}`
  const prefix =
    summary.succeededCount === 0
      ? `${countLabel}.`
      : `Se eliminaron ${summary.succeededCount} de ${summary.totalCount}. ${countLabel}.`

  return details.length > 0 ? `${prefix} ${details.join("; ")}.` : prefix
}
