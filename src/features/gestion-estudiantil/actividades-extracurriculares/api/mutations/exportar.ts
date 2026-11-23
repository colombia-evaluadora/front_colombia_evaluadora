import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"

import type { ExportFormat } from "@/features/establishment/institution/api/types/export"
import type {
  ActividadesQueryFilters,
  ServicioSocialQueryFilters,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

type Pestana = "actividades" | "servicio-social"

interface ExportarInput {
  pestana: Pestana
  filters: ActividadesQueryFilters | ServicioSocialQueryFilters
  format: ExportFormat
}

/** Exportar la pestaña visible: los mismos filtros de su listado, sin paginar (claves del reporting-service). */
function exportar({ pestana, filters, format }: ExportarInput) {
  return downloadReport(pestana === "actividades" ? "actividades-extracurriculares" : "servicio-social", {
    format,
    filters,
  })
}

export const useExportarActividades = () => useMutation({ mutationFn: exportar })
