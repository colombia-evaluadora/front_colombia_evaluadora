import { useMutation } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"
import { downloadReport } from "@/lib/report-client"

export interface ExportarSimpadeFilters {
  ESTABLECIMIENTO: number
  PERIODO_ACADEMICO: number
  SEDE: number | null
  JORNADA: number | null
}

/** Exportar para el SIMPADE (G.8.VAL.4): un solo Excel de apoyo por Período Académico (clave `prevencion-simpade`). */
function exportarSimpade(filters: ExportarSimpadeFilters) {
  return downloadReport("prevencion-simpade", { format: "excel", filters })
}

export function useExportarSimpade({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof exportarSimpade> } = {}) {
  return useMutation({ mutationFn: exportarSimpade, ...mutationConfig })
}
