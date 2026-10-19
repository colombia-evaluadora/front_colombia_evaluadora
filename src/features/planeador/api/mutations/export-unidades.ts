import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/planeador/api/types/actividad"

/**
 * Filtros del reporte `planeador-unidades` (sso V492.4,
 * `POST /planeador/unidades/export-all`, `fn_unidad_listar` sin paginar).
 * El alcance va igual que en `GET /planeador/unidades` (docente elegido y
 * sede/año/jornada). Estado, instrumento, búsqueda y pestaña la pantalla los
 * filtra en el cliente (el listado no los recibe), así que lo que se ve
 * viaja como `IDS`: el archivo trae exactamente las unidades de la lista.
 */
export interface PlaneadorUnidadesReportFilters {
  FUNCIONARIO?: number
  SEDE?: number
  PERIODO?: number
  IDS?: number[]
}

/** Cómo se llaman, en la pestaña exportada, la unidad y sus actividades
 *  ("Proyecto pedagógico" / "Experiencias"…). El reporte trae fijos
 *  "Unidad" y "Actividades". */
export interface RotulosExportUnidades {
  unidad: string
  actividades: string
}

interface ExportUnidadesInput {
  filters: PlaneadorUnidadesReportFilters
  format: ExportFormat
  rotulos?: RotulosExportUnidades
}

export function exportUnidades({ filters, format, rotulos }: ExportUnidadesInput): Promise<ExportResult> {
  return downloadReport("planeador-unidades", {
    filters,
    format,
    // `nombre` y `total_actividades` son las claves de esas columnas en el
    // reporte (reporting-service application.yml, planeador-unidades).
    columnLabels: rotulos
      ? { nombre: rotulos.unidad, total_actividades: rotulos.actividades }
      : undefined,
  })
}
