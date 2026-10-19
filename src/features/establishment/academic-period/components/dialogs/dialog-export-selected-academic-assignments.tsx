import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedAcademicAssignments } from "@/features/establishment/academic-period/api/mutations/export-selected-academic-assignments"

interface ExportSelectedAcademicAssignmentsDialogProps {
  selectedIds: number[]
  resetSelection: () => void
  /** Acota el reporte al periodo: sin esto sale vacio. */
  academicPeriodId?: number
}

export function ExportSelectedAcademicAssignmentsDialog({
  selectedIds,
  resetSelection,
  academicPeriodId,
}: ExportSelectedAcademicAssignmentsDialogProps) {
  const count = selectedIds.length
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar los ${count} docente(s) seleccionado(s).`}
      count={count}
      onExported={resetSelection}
      onExport={(format) => exportSelectedAcademicAssignments({ ids: selectedIds, format, academicPeriodId })}
    />
  )
}
