import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
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

function exportCurricularReferences(input: ExportCurricularReferencesInput): Promise<ExportResult> {
  // Antes esto pegaba a `/academic-management/curricular-references/export`,
  // una ruta que solo existía en MSW: con el backend real el botón nunca
  // funcionó. El reporte lo arma reporting-service con la MISMA
  // fn_refcurr_listar del listado, sin paginar (fila `refcurr-reporte` del
  // backend), así que los filtros y el orden se normalizan con las mismas
  // funciones que usa la tabla para que el archivo coincida con la pantalla.
  return downloadReport("referentes-curriculares", {
    format: input.format,
    filters: toCurricularReferencesFilters(input.filters),
    sorting: toCurricularReferencesSorting(input.sorting),
    columns: input.columns,
  })
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportCurricularReferences>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportCurricularReferences,
    ...mutationConfig,
  })
}
