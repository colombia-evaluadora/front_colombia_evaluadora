import { ExportDialog } from "@/components/export-dialog"
import { exportMatricula } from "@/features/coverage/matricula/api/mutations/export-matricula"
import type { MatriculaQueryRequest } from "@/features/coverage/matricula/api/types/matricula"

interface ExportMatriculaDialogProps {
  filters: MatriculaQueryRequest["filters"]
  /** Columnas visibles, ya en claves del reporte (`MATRICULA_EXPORT_COLUMN_KEYS`). */
  columns: string[]
}

export function ExportMatriculaDialog({ filters, columns }: ExportMatriculaDialogProps) {
  return (
    <ExportDialog
      label="Exportar estudiantes filtrados"
      description="Elige un formato para exportar todos los estudiantes que coincidan con los filtros activos, con las columnas que tengas visibles en la tabla."
      onExport={(format) => exportMatricula({ filters, columns, format })}
    />
  )
}
