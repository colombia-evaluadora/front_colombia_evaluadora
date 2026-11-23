import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

import type { ReportePorGrupo } from "@/features/academic-management/asistencia/utils/reporte-por-grupo"
import { registroBitacora } from "@/features/academic-management/asistencia/utils/reporte-por-grupo"

export interface ExportarPorGrupoInput {
  reporte: ReportePorGrupo
  /** Imprimir = el PDF estructurado; Exportar = PDF o Excel de la tabla. */
  accion: "IMPRIMIR" | "EXPORTAR"
  format: ExportFormat
}

/** Descarga el reporte asistencia-por-grupo y deja la impresión o exportación en la Bitácora. */
export async function exportarPorGrupo({ reporte, accion, format }: ExportarPorGrupoInput): Promise<ExportResult> {
  const resultado = await downloadReport("asistencia-por-grupo", {
    format,
    filters: reporte.filters,
    filtersLabel: reporte.filtersLabel,
    omitirVacio: true,
  })
  if (resultado.status === "ok") {
    // El registro no debe tumbar una descarga que ya se hizo.
    await api
      .post(`${AUDIT_API_PREFIX}/bitacora/exportaciones`, registroBitacora(reporte, accion, format, resultado.filas))
      .catch(() => undefined)
  }
  return resultado
}

interface UseExportarPorGrupoOptions {
  mutationConfig?: MutationConfig<typeof exportarPorGrupo>
}

export function useExportarPorGrupo({ mutationConfig }: UseExportarPorGrupoOptions = {}) {
  return useMutation({
    mutationFn: exportarPorGrupo,
    ...mutationConfig,
  })
}
