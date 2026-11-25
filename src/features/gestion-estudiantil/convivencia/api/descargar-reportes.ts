import { downloadReport } from "@/lib/report-client"
import type { ExportResult } from "@/features/establishment/institution/api/types/export"

import type { SiuceFiltros } from "@/features/gestion-estudiantil/convivencia/api/comite-types"

/** Acta de una sesión del Comité en PDF (clave `convivencia-acta-comite`). */
export function descargarActa(fkSesion: number, nombreArchivo?: string): Promise<ExportResult> {
  return downloadReport("convivencia-acta-comite", { format: "pdf", filters: { FK_SESION: fkSesion }, nombreArchivo })
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

/** Documentos PDF de un proceso disciplinario (G.2.PRD.DOC.1-3). */
export type DocumentoProceso = "comunicacion_cargos" | "acta_descargos" | "resolucion"

const CLAVE_DOCUMENTO_PROCESO = {
  comunicacion_cargos: "convivencia-proceso-comunicacion-cargos",
  acta_descargos: "convivencia-proceso-acta-descargos",
  resolucion: "convivencia-proceso-resolucion",
} as const

export function descargarDocumentoProceso(documento: DocumentoProceso, fkProceso: number): Promise<ExportResult> {
  return downloadReport(CLAVE_DOCUMENTO_PROCESO[documento], { format: "pdf", filters: { FK_PROCESO: fkProceso } })
}
