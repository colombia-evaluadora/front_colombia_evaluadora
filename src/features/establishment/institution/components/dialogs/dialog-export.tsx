import { ExportDialog } from "@/components/export-dialog"
import { exportEstablishments } from "@/features/establishment/institution/api/mutations/export"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"

interface ExportEstablishmentsDialogProps {
  filters: EstablishmentsQueryRequest["filters"]
}

export function ExportEstablishmentsDialog({ filters }: ExportEstablishmentsDialogProps) {
  return (
    <ExportDialog
      label="Exportar establecimientos filtrados"
      description="Elige un formato para exportar todos los establecimientos que coincidan con los filtros activos."
      onExport={(format) => exportEstablishments({ filters, format })}
    />
  )
}
