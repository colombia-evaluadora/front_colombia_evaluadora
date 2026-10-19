import { ExportDialog } from "@/components/export-dialog"
import { exportAcademicPeriods } from "@/features/establishment/academic-period/api/mutations/export-academic-periods"
import type { AcademicPeriodsQueryFilters } from "@/features/establishment/academic-period/api/types/academic-period"

interface ExportAcademicPeriodsDialogProps {
  filters: AcademicPeriodsQueryFilters
}

export function ExportAcademicPeriodsDialog({ filters }: ExportAcademicPeriodsDialogProps) {
  return (
    <ExportDialog
      label="Exportar periodos filtrados"
      description="Elige un formato para exportar todos los periodos que coincidan con los filtros activos."
      onExport={(format) => exportAcademicPeriods({ filters, format })}
    />
  )
}
