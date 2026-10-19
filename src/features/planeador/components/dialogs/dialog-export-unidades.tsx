import { ExportDialog } from "@/components/export-dialog"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

import {
  exportUnidades,
  type PlaneadorUnidadesReportFilters,
  type RotulosExportUnidades,
} from "@/features/planeador/api/mutations/export-unidades"

interface DialogExportUnidadesProps {
  /** Texto del botón y su tooltip ("Exportar proyectos pedagógicos filtrados"). */
  label: string
  /** El rótulo en plural y minúscula, para el texto del diálogo. */
  rotuloPlural: string
  /** Alcance de la pantalla + `IDS` de lo que muestra la lista. */
  filters: PlaneadorUnidadesReportFilters
  rotulos?: RotulosExportUnidades
  /** Sin unidades en la lista no hay nada que exportar. */
  disabled?: boolean
}

/** Exportación PDF/Excel de la pestaña de unidades: la gemela de
 *  `DialogExportActividades` para el reporte `planeador-unidades`. */
export function DialogExportUnidades({
  label,
  rotuloPlural,
  filters,
  rotulos,
  disabled,
}: DialogExportUnidadesProps) {
  // El archivo lo genera el servidor: sin red no hay export.
  const soloEnLinea = useOnlineOnly()

  return (
    <ExportDialog
      label={label}
      description={
        <>
          Elige un formato para exportar los {rotuloPlural} que se ven en la lista, con la
          búsqueda y los filtros activos.
        </>
      }
      onExport={(format) => exportUnidades({ filters, format, rotulos })}
      disabled={disabled || soloEnLinea.disabled}
      tooltip={soloEnLinea.tooltip}
    />
  )
}
