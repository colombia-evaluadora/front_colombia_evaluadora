import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedAcademicPeriods } from "@/features/establishment/academic-period/api/mutations/export-selected-academic-periods"

interface ExportSelectedAcademicPeriodsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedAcademicPeriodsDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedAcademicPeriodsDialogProps) {
  const count = selectedIds.length
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar ${count} periodo(s) seleccionado(s).`}
      count={count}
      onExported={resetSelection}
      onExport={(format) => exportSelectedAcademicPeriods({ ids: selectedIds, format })}
    />
  )
}
