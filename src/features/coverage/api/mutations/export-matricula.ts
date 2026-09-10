import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import { toMatriculaFilters } from "@/features/coverage/api/query/use-matricula-query"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  MatriculaQueryRequest,
} from "@/features/coverage/api/types/matricula"

interface ExportMatriculaInput {
  filters: MatriculaQueryRequest["filters"]
  format: ExportFormat
  /** Columnas visibles de la tabla en ese momento (claves del backend, ya
   * mapeadas -- ver `MATRICULA_EXPORT_COLUMN_KEYS`). Vacío = todas. */
  columns?: string[]
}

function exportMatricula(input: ExportMatriculaInput): Promise<ExportResult> {
  // Antes esto pegaba a `/coverage/matricula/export-all`, una ruta que nunca
  // existió en el backend (ni fila en `public.query` ni manejo de blob acá):
  // el botón nunca funcionó. El reporte lo genera reporting-service con la
  // MISMA fn_matricula_listar que alimenta esta tabla, sin paginar -- mismo
  // patrón que Establecimientos/Asistencia. Los filtros se normalizan con la
  // MISMA función que ya usa el listado (`toMatriculaFilters`), para que el
  // reporte filtre exactamente igual que lo que se ve en pantalla.
  return downloadReport("matricula", {
    format: input.format,
    filters: toMatriculaFilters(input.filters),
    columns: input.columns,
  })
}

interface UseExportMatriculaOptions {
  mutationConfig?: MutationConfig<typeof exportMatricula>
}

export function useExportMatricula({ mutationConfig }: UseExportMatriculaOptions = {}) {
  return useMutation({
    mutationFn: exportMatricula,
    ...mutationConfig,
  })
}
