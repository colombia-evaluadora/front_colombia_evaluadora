import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedGrades } from "@/features/establishment/academic-period/api/mutations/export-selected-grades"

interface ExportSelectedGradesDialogProps {
  selectedIds: number[]
  resetSelection: () => void
  /** Acota el reporte al periodo que se esta viendo: sin esto sale vacio. */
  academicPeriodId?: number
}

export function ExportSelectedGradesDialog({
  selectedIds,
  resetSelection,
  academicPeriodId,
}: ExportSelectedGradesDialogProps) {
  const count = selectedIds.length
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar los ${count} grado(s) seleccionado(s).`}
      count={count}
      onExported={resetSelection}
      onExport={(format) => exportSelectedGrades({ ids: selectedIds, format, academicPeriodId })}
    />
  )
}
