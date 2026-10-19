import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedEvaluationPeriods } from "@/features/establishment/academic-period/api/mutations/export-selected-evaluation-periods"

interface ExportSelectedEvaluationPeriodsDialogProps {
  selectedIds: number[]
  resetSelection: () => void
  /** Acota el reporte al periodo academico padre: sin esto sale vacio. */
  academicPeriodId?: number
}

export function ExportSelectedEvaluationPeriodsDialog({
  selectedIds,
  resetSelection,
  academicPeriodId,
}: ExportSelectedEvaluationPeriodsDialogProps) {
  const count = selectedIds.length
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar los ${count} periodo(s) de evaluación seleccionado(s).`}
      count={count}
      onExported={resetSelection}
      onExport={(format) => exportSelectedEvaluationPeriods({ ids: selectedIds, format, academicPeriodId })}
    />
  )
}
