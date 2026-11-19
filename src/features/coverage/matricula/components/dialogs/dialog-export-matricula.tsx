import { useMutation } from "@tanstack/react-query"

import { FileDownloadOutlinedIcon, FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { exportMatricula } from "@/features/coverage/matricula/api/mutations/export-matricula"
import type { ExportFormat, MatriculaQueryRequest } from "@/features/coverage/matricula/api/types/matricula"

interface ExportMatriculaDialogProps {
  filters: MatriculaQueryRequest["filters"]
  /** Columnas visibles, ya en claves del reporte (`MATRICULA_EXPORT_COLUMN_KEYS`). */
  columns: string[]
}

// LIS.4/LIS.5: menú Excel / PDF sin diálogo intermedio; exporta con los filtros aplicados.
export function ExportMatriculaDialog({ filters, columns }: ExportMatriculaDialogProps) {
  const { notify } = useNotify()
  const exportar = useMutation({
    mutationFn: (format: ExportFormat) => exportMatricula({ filters, columns, format }),
    onSuccess: (result) => notify(result.message, result.status === "error" ? { variant: "error" } : undefined),
    onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" color="neutral" disabled={exportar.isPending}>
            {exportar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileDownloadOutlinedIcon data-icon="inline-start" />
            )}
            Exportar
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportar.mutate("excel")}>
          <FileXlsIcon />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportar.mutate("pdf")}>
          <FilePdfIcon />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
