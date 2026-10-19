import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedRatingScales } from "@/features/establishment/academic-period/api/mutations/export-selected-rating-scales"

interface ExportSelectedRatingScalesDialogProps {
  /** Cantidad de niveles de enseñanza seleccionados — se muestra en el trigger
   *  y en el header del dialog. */
  levelCount: number
  /** Códigos de escala a exportar (los niveles se expanden a sus escalas). */
  scaleCodigos: number[]
  resetSelection: () => void
  /** Acota el reporte al periodo que se está viendo: sin esto sale vacío. */
  academicPeriodId?: number
}

export function ExportSelectedRatingScalesDialog({
  levelCount,
  scaleCodigos,
  resetSelection,
  academicPeriodId,
}: ExportSelectedRatingScalesDialogProps) {
  const count = levelCount
  return (
    <ExportDialog
      label={`Exportar ${count} seleccionados`}
      description={`Elige un formato para exportar las escalas de los ${count} nivel(es) seleccionado(s).`}
      count={count}
      onExported={resetSelection}
      onExport={(format) => exportSelectedRatingScales({ ids: scaleCodigos, format, academicPeriodId })}
    />
  )
}
