import { ExportDialog } from "@/components/export-dialog"
import { exportCurricularReferences } from "@/features/academic-management/curricular-references/api/mutations/export"
import type { CurricularReferencesQueryRequest } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

interface ExportCurricularReferencesDialogProps {
  filters: CurricularReferencesQueryRequest["filters"]
  sorting: CurricularReferencesQueryRequest["sorting"]
  /** Columnas visibles de la tabla, ya traducidas a claves del reporte (ver
   * `CURRICULAR_REFERENCES_EXPORT_COLUMN_KEYS` en `columns.tsx`). */
  columns: string[]
}

export function ExportCurricularReferencesDialog({ filters, sorting, columns }: ExportCurricularReferencesDialogProps) {
  const soloEnLinea = useOnlineOnly()

  return (
    <ExportDialog
      label="Exportar referentes curriculares filtrados"
      tooltip={soloEnLinea.tooltip}
      disabled={soloEnLinea.disabled}
      description="Elige un formato para exportar todos los referentes curriculares que coincidan con los filtros activos, con las columnas que tengas visibles en la tabla."
      onExport={(format) => exportCurricularReferences({ filters, sorting, format, columns })}
    />
  )
}
