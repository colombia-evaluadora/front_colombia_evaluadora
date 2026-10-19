import { ExportDialog } from "@/components/export-dialog"
import { exportGrades } from "@/features/establishment/academic-period/api/mutations/export-grades"

interface ExportGradesDialogProps {
  academicPeriodId?: number
}

export function ExportGradesDialog({ academicPeriodId }: ExportGradesDialogProps) {
  return (
    <ExportDialog
      label="Exportar grados y grupos"
      description="Elige un formato para exportar los grados y grupos de este periodo."
      onExport={(format) => exportGrades({ academicPeriodId, format })}
    />
  )
}
