import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"

export interface FiltrosExportarInforme {
  FK_ESTABLECIMIENTO: number
  ANIO?: number
  FK_SEDE?: number
  FK_GRADO?: number
}

/** Exportar del informe Gestión de inclusión (Regla 41): los mismos filtros de la pantalla, en Excel (clave `inclusion-informe`). */
export function useExportarInformeInclusion() {
  return useMutation({ mutationFn: (filters: FiltrosExportarInforme) => downloadReport("inclusion-informe", { format: "excel", filters }) })
}
