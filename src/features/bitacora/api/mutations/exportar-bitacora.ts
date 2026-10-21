import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

import {
  toBitacoraFilters,
  toBitacoraSorting,
  type BitacoraParams,
} from "@/features/bitacora/api/query/use-bitacora-query"

/** Columnas del reporte (`reporting.reports.bitacora`), en el orden de la tabla. */
const COLUMNAS = ["fecha", "usuario_nombre", "sede", "jornada", "entidad", "registro", "accion", "cambio"]

/** Descarga la consulta con los mismos filtros y deja constancia de la exportación (Regla 17). */
export async function exportarBitacora(
  format: ExportFormat,
  { filters, sorting }: Pick<BitacoraParams, "filters" | "sorting">,
): Promise<ExportResult> {
  if (env.ENABLE_API_MOCKING) {
    return { status: "error", message: "La exportación solo está disponible con el back real." }
  }
  const filtros = toBitacoraFilters(filters)
  const resultado = await downloadReport("bitacora", {
    format,
    filters: filtros,
    sorting: toBitacoraSorting(sorting),
    columns: filters.modulo === "ADMINISTRACION" ? COLUMNAS.filter((c) => c !== "sede" && c !== "jornada") : COLUMNAS,
  })
  if (resultado.status === "ok") {
    // El registro no debe tumbar una descarga que ya se hizo.
    await api
      .post(`${AUDIT_API_PREFIX}/bitacora/exportaciones`, {
        MODULO: filters.modulo,
        FORMATO: format === "pdf" ? "PDF" : "EXCEL",
        FILTROS: JSON.stringify(filtros),
        FILAS: String(resultado.filas ?? 0),
      })
      .catch(() => undefined)
  }
  return resultado
}
