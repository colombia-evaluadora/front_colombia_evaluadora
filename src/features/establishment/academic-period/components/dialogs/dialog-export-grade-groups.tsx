import { ExportDialog } from "@/components/export-dialog"
import { exportGradeGroups } from "@/features/establishment/academic-period/api/mutations/export-grade-groups"
import type { GradeGroupsQueryFilters } from "@/features/establishment/academic-period/api/types/grade-group"

interface ExportGradeGroupsDialogProps {
  filters: GradeGroupsQueryFilters
}

export function ExportGradeGroupsDialog({ filters }: ExportGradeGroupsDialogProps) {
  return (
    <ExportDialog
      label="Exportar grupos"
      description="Elige un formato para exportar todos los grupos."
      errorMessage="No se pudo exportar: todavía no hay endpoint para esto."
      nested
      onExport={(format) => exportGradeGroups({ filters, format })}
    />
  )
}
