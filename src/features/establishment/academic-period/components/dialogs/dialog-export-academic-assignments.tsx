import { ExportDialog } from "@/components/export-dialog"
import { exportAcademicAssignmentReport } from "@/features/establishment/academic-period/api/mutations/export-academic-assignment-report"

interface ExportAcademicAssignmentsDialogProps {
  academicPeriodId?: number
}

export function ExportAcademicAssignmentsDialog({
  academicPeriodId,
}: ExportAcademicAssignmentsDialogProps) {
  return (
    <ExportDialog
      label="Exportar asignación académica"
      description="Elige un formato para exportar la asignación académica del periodo."
      onExport={(format) => exportAcademicAssignmentReport({ format, filters: { academicPeriodId } })}
    />
  )
}
