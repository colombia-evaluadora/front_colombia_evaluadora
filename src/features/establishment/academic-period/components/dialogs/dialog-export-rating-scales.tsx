import { ExportDialog } from "@/components/export-dialog"
import { exportRatingScales } from "@/features/establishment/academic-period/api/mutations/export-rating-scales"

interface ExportRatingScalesDialogProps {
  academicPeriodId?: number
}

export function ExportRatingScalesDialog({ academicPeriodId }: ExportRatingScalesDialogProps) {
  return (
    <ExportDialog
      label="Exportar escalas de valoración"
      description="Elige un formato para exportar las escalas de valoración del periodo."
      onExport={(format) => exportRatingScales({ format, filters: { academicPeriodId } })}
    />
  )
}
