import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedGradeGroups } from "@/features/establishment/academic-period/api/mutations/export-selected-grade-groups"

interface ExportSelectedGradeGroupsDialogProps {
  selectedIds: number[]
  resetSelection: () => void
  /** Acota el reporte al periodo que se esta viendo: sin esto sale vacio. */
  academicPeriodId?: number
}

export function ExportSelectedGradeGroupsDialog({
  selectedIds,
  resetSelection,
  academicPeriodId,
}: ExportSelectedGradeGroupsDialogProps) {
  const count = selectedIds.length
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar los ${count} grupo(s) seleccionado(s).`}
      count={count}
      errorMessage="No se pudo exportar: todavía no hay endpoint para esto."
      nested
      onExported={resetSelection}
      onExport={(format) => exportSelectedGradeGroups({ ids: selectedIds, format, academicPeriodId })}
    />
  )
}
