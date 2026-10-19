import { ExportDialog } from "@/components/export-dialog"
import { exportEvaluationPeriods } from "@/features/establishment/academic-period/api/mutations/export-evaluation-periods"
import type { EvaluationPeriodsQueryFilters } from "@/features/establishment/academic-period/api/types/evaluation-period"

interface ExportEvaluationPeriodsDialogProps {
  filters: EvaluationPeriodsQueryFilters
  /** Acota el reporte al periodo que se está viendo. */
  academicPeriodId?: number
}

export function ExportEvaluationPeriodsDialog({
  filters,
  academicPeriodId,
}: ExportEvaluationPeriodsDialogProps) {
  return (
    <ExportDialog
      label="Exportar periodos de evaluación"
      description="Elige un formato para exportar todos los periodos de evaluación."
      onExport={(format) => exportEvaluationPeriods({ filters, format, academicPeriodId })}
    />
  )
}
