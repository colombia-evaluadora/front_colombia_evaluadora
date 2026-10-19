import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedStudyPlanItems } from "@/features/establishment/academic-period/api/mutations/export-selected-study-plan-items"

interface ExportSelectedStudyPlanItemsDialogProps {
  selectedIds: number[]
  resetSelection: () => void
  /** Acota el reporte al periodo que se esta viendo: sin esto sale vacio. */
  academicPeriodId?: number
}

export function ExportSelectedStudyPlanItemsDialog({
  selectedIds,
  resetSelection,
  academicPeriodId,
}: ExportSelectedStudyPlanItemsDialogProps) {
  const count = selectedIds.length
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar las ${count} asignatura(s) seleccionada(s).`}
      count={count}
      errorMessage="No se pudo exportar: todavía no hay endpoint para esto."
      nested
      onExported={resetSelection}
      onExport={(format) => exportSelectedStudyPlanItems({ ids: selectedIds, format, academicPeriodId })}
    />
  )
}
