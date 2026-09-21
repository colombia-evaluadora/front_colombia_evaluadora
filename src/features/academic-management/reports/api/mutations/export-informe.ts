import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/academic-management/reports/api/types/export"

interface ExportInformeInput {
  format: ExportFormat
  grupoId: number
  /** Vacío = todos los períodos del período académico del grupo. */
  periodos?: number[]
  /** Incluye la fila con la nota del año. En preescolar el backend la
   *  descarta: una línea sin notas no es nada que imprimir. */
  incluirFinal?: boolean
}

/** Mismos binds que `/informes/grupo` (`use-informe-grupo-query.ts`): el
 *  reporte reusa esa misma función del lado del backend, sin paginar. */
function exportInforme(input: ExportInformeInput): Promise<ExportResult> {
  return downloadReport("informes", {
    format: input.format,
    filters: {
      FK_TGRUPO: input.grupoId,
      PERIODOS: input.periodos?.length ? input.periodos : null,
      INCLUIR_FINAL: input.incluirFinal ?? false,
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
