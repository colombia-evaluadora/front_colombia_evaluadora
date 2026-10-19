import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

import {
  toCurricularReferencesFilters,
  toCurricularReferencesSorting,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-references"
import type { CurricularReferencesQueryRequest } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

interface ExportCurricularReferencesInput {
  filters: CurricularReferencesQueryRequest["filters"]
  sorting: CurricularReferencesQueryRequest["sorting"]
  format: ExportFormat
  /** Columnas visibles de la tabla, ya traducidas a claves del reporte (ver
   * `CURRICULAR_REFERENCES_EXPORT_COLUMN_KEYS`). Vacío = todas. */
  columns?: string[]
}

export function exportCurricularReferences(input: ExportCurricularReferencesInput): Promise<ExportResult> {
  // Mismos normalizadores que la tabla, para que el archivo coincida con la pantalla.
  return downloadReport("referentes-curriculares", {
    format: input.format,
    filters: toCurricularReferencesFilters(input.filters),
    sorting: toCurricularReferencesSorting(input.sorting),
    columns: input.columns,
  })
}

