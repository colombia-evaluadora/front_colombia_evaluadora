import { ExportDialog } from "@/components/export-dialog"
import {
  exportActividades,
  type PlaneadorActividadesReportFilters,
  type RotulosExportActividades,
} from "@/features/planeador/api/mutations/export-actividades"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnFrase,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

interface DialogExportActividadesProps {
  /** Filas que se ven en el rail — solo para resolver el rótulo del texto. El export no se limita a ellas. */
  rows: Actividad[]
  /** Los mismos criterios que produjeron `rows`, en la forma que espera el reporte real. */
  filters: PlaneadorActividadesReportFilters
  /** Rótulos de la pestaña exportada: encabezados de las columnas de la
   *  actividad y la unidad en el PDF/Excel, y el texto del diálogo. */
  rotulos?: RotulosExportActividades
}

/** Exportación masiva del Planeador (PDF / Excel). La página lo pone en
 *  la `TableScreenActions` del listado. */
export function DialogExportActividades({ rows, filters, rotulos }: DialogExportActividadesProps) {
  const soloEnLinea = useOnlineOnly()

  // El de la pestaña si lo hay. Si no, rótulo real (Regla 13) solo si TODAS
  // las filas filtradas comparten el mismo — el filtro puede cruzar varios
  // grados a la vez, y ahí no hay un rótulo único que mostrar (mismo criterio
  // que `resolverInstrumentoUnico` en `unidad-detalle-panel.tsx`).
  const rotulosUnicos = new Set(rows.map((r) => r.rotuloEjecucion).filter(Boolean))
  const rotuloLabel =
    rotulos?.actividad ??
    (rotulosUnicos.size === 1 ? [...rotulosUnicos][0]! : ROTULO_ACTIVIDAD_FALLBACK)
  const rotuloLower = rotuloEnFrase(rotuloLabel)

  return (
    <ExportDialog
      label={`Exportar filtro de ${rotuloLower}`}
      description={
        <>
          Elige un formato para exportar todos los registros de {rotuloLower} que coinciden
          con la búsqueda y los filtros activos, de cualquier día.
        </>
      }
      onExport={(format) => exportActividades({ filters, format, rotulos })}
      disabled={soloEnLinea.disabled}
      tooltip={soloEnLinea.tooltip}
    />
  )
}
