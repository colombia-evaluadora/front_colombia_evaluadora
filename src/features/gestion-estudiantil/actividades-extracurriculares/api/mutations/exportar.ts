import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"

import type { OrdenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import type { ExportFormat } from "@/features/establishment/institution/api/types/export"
import type {
  ActividadesQueryFilters,
  ServicioSocialQueryFilters,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

type Pestana = "actividades" | "servicio-social"

interface ExportarInput {
  pestana: Pestana
  filters: ActividadesQueryFilters | ServicioSocialQueryFilters
  /** Orden de la tabla: el Excel sale igual que la pantalla. */
  orden: OrdenServidor
  format: ExportFormat
}

/** Exportar la pestaña visible: los mismos filtros de su listado, sin paginar (claves del reporting-service). */
function exportar({ pestana, filters, orden, format }: ExportarInput) {
  return downloadReport(pestana === "actividades" ? "actividades-extracurriculares" : "servicio-social", {
    format,
    filters,
    // El backend lee el orden de `BODY.SORTING.ID` / `BODY.SORTING.DESC`; sin orden elegido no se manda.
    sorting: orden.ORDEN ? { id: orden.ORDEN, desc: orden.DIR === "desc" } : undefined,
  })
}

export const useExportarActividades = () => useMutation({ mutationFn: exportar })
