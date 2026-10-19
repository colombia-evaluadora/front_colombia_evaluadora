import { ExportDialog } from "@/components/export-dialog"
import { exportCampuses } from "@/features/establishment/campuses/api/mutations/export"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"

interface ExportCampusesDialogProps {
  filters: CampusesQueryRequest["filters"]
}

export function ExportCampusesDialog({ filters }: ExportCampusesDialogProps) {
  return (
    <ExportDialog
      label="Exportar sedes filtradas"
      description="Elige un formato para exportar todas las sedes que coincidan con los filtros activos."
      onExport={(format) => exportCampuses({ filters, format })}
    />
  )
}
