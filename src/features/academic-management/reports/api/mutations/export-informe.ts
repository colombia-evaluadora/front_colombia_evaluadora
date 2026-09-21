import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/academic-management/reports/api/types/export"

interface ExportInformeInput {
  format: ExportFormat
  grupoId: number
  /** Vacío = todos los períodos del período académico del grupo. */
  periodos?: number[]
}

/** Mismos binds que `/informes/grupo` (`use-informe-grupo-query.ts`): el
 *  reporte reusa esa misma función del lado del backend, sin paginar. */
function exportInforme(input: ExportInformeInput): Promise<ExportResult> {
  return downloadReport("informes", {
    format: input.format,
    filters: {
      FK_TGRUPO: input.grupoId,
      PERIODOS: input.periodos?.length ? input.periodos : null,
    },
  })
}

interface UseExportInformeOptions {
  mutationConfig?: MutationConfig<typeof exportInforme>
}

export function useExportInforme({ mutationConfig }: UseExportInformeOptions = {}) {
  return useMutation({
    mutationFn: exportInforme,
    ...mutationConfig,
  })
}
