import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/planeador/api/types/actividad"

/**
 * Filtros del reporte `planeador-actividades` (sso V404). El reporte usa el
 * MISMO listado que el rail (`GET /actividades/mias`), sin paginar: exporta
 * todas las actividades del usuario que cumplen la búsqueda, el estado y la
 * pestaña activa, no solo las del día. `DIA` no se manda a propósito: es la
 * navegación del rail, no un filtro, y con él un día vacío exportaba un
 * archivo en blanco. El back acepta además `ASIGNATURA`, `GRUPO`, `UNIDAD`,
 * `DIAS_GRACIA`, `DIA` e `IDS`, para cuando la pantalla los exponga.
 */
export interface PlaneadorActividadesReportFilters {
  SEARCH?: string
  ESTADOS?: string[]
  /** Pares "grado:asignatura" de la pestaña de Rótulo de Ejecución activa. */
  GRADO_ASIGNATURA_PARES?: string[]
  /** `PK_TFUNCIONARIO` del docente elegido (super admin / coordinador), el `?funcionario=` de `/mias`. */
  FUNCIONARIO?: number
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
