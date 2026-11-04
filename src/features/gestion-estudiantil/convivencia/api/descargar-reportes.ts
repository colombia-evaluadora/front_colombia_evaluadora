import { downloadReport } from "@/lib/report-client"
import type { ExportResult } from "@/features/establishment/institution/api/types/export"

import type { SiuceFiltros } from "@/features/gestion-estudiantil/convivencia/api/comite-types"

/** Acta de una sesión del Comité en PDF (clave `convivencia-acta-comite`). */
export function descargarActa(fkSesion: number): Promise<ExportResult> {
  return downloadReport("convivencia-acta-comite", { format: "pdf", filters: { FK_SESION: fkSesion } })
}

/** Reporte de apoyo para el SIUCE en Excel (clave `convivencia-siuce`); `columnas` = claves de `SIUCE_COLUMNAS`. */
export function descargarSiuce(filtros: SiuceFiltros, columnas: string[]): Promise<ExportResult> {
  return downloadReport("convivencia-siuce", {
    format: "excel",
    columns: columnas,
    filters: { ...filtros, COLUMNAS: columnas },
    omitirVacio: true,
  })
}
