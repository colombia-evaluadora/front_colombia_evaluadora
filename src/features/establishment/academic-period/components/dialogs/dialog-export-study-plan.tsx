import { ExportDialog } from "@/components/export-dialog"
import { exportStudyPlan } from "@/features/establishment/academic-period/api/mutations/export-study-plan"

interface ExportStudyPlanDialogProps {
  academicPeriodId?: number
}

export function ExportStudyPlanDialog({ academicPeriodId }: ExportStudyPlanDialogProps) {
  return (
    <ExportDialog
      label="Exportar plan de estudio"
      description="Elige un formato para exportar todo el plan de estudio del periodo."
      nested
      onExport={(format) => exportStudyPlan({ format, filters: { academicPeriodId } })}
    />
  )
}
