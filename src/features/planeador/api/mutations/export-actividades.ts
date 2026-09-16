import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/planeador/api/types/actividad"

/**
 * Filtros del reporte `planeador-actividades` (colección Postman
 * `planeador-actividades-export-all`, V404). Son los del listado real
 * (`GET /planeador/actividades`), no los de `/actividades/mias` que usa esta
 * pantalla — el rail solo expone hoy `SEARCH`/`ESTADOS`/`DIA`, así que es lo
 * único que se manda; el resto de las claves del catálogo (`ASIGNATURA`,
 * `GRUPO`, `UNIDAD`, `TIPO_ACTIVIDAD`, `INSTRUMENTO`, `FECHA_DESDE`/
 * `FECHA_HASTA`, `DIAS_GRACIA`, `INCLUIR_INACTIVAS`, `FUNCIONARIO`, `IDS`)
 * queda para cuando la barra de filtros los exponga.
 */
export interface PlaneadorActividadesReportFilters {
  SEARCH?: string
  ESTADOS?: string[]
  DIA?: string
}

interface ExportActividadesInput {
  filters: PlaneadorActividadesReportFilters
  format: ExportFormat
}

function exportActividades(input: ExportActividadesInput): Promise<ExportResult> {
  // Antes esto mandaba las FILAS ya filtradas en el cliente a
  // `/eval-col/planeador/actividades/export-all` (el endpoint de depuración
  // del query-service, que solo devuelve JSON crudo) en vez del objeto de
  // filtros que espera el reporte real. `downloadReport` pega al
  // reporting-service (`POST /reportes/planeador-actividades`), que
  // devuelve el PDF/Excel — mismo patrón que matrícula/asistencia.
  return downloadReport("planeador-actividades", input)
}

interface UseExportActividadesOptions {
  mutationConfig?: MutationConfig<typeof exportActividades>
}

export function useExportActividades({ mutationConfig }: UseExportActividadesOptions = {}) {
  return useMutation({
    mutationFn: exportActividades,
    ...mutationConfig,
  })
}
