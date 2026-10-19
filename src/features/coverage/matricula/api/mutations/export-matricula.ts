import { downloadReport } from "@/lib/report-client"
import { toMatriculaFilters } from "@/features/coverage/matricula/api/query/use-matricula-query"
import type {
  ExportFormat,
  ExportResult,
  MatriculaQueryRequest,
} from "@/features/coverage/matricula/api/types/matricula"

interface ExportMatriculaInput {
  filters: MatriculaQueryRequest["filters"]
  format: ExportFormat
  /** Columnas visibles de la tabla en ese momento (claves del backend, ya
   * mapeadas -- ver `MATRICULA_EXPORT_COLUMN_KEYS`). Vacío = todas. */
  columns?: string[]
}

export function exportMatricula(input: ExportMatriculaInput): Promise<ExportResult> {
  // Mismos filtros normalizados que el listado.
  return downloadReport("matricula", {
    format: input.format,
    filters: toMatriculaFilters(input.filters),
    columns: input.columns,
  })
}
