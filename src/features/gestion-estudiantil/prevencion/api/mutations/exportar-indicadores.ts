import { useMutation } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"
import { downloadReport } from "@/lib/report-client"

import type { IndicadoresQueryFilters } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Exportar de Indicadores (§9.4): los mismos filtros de la pantalla, en Excel (clave `prevencion-indicadores`). */
function exportarIndicadores(filters: IndicadoresQueryFilters) {
  return downloadReport("prevencion-indicadores", { format: "excel", filters })
}

export function useExportarIndicadores({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof exportarIndicadores> } = {}) {
  return useMutation({ mutationFn: exportarIndicadores, ...mutationConfig })
}
