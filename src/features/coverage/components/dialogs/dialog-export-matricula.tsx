import { useState } from "react"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { useExportMatricula } from "@/features/coverage/api/mutations/export-matricula"
import type { ExportFormat, MatriculaQueryRequest } from "@/features/coverage/api/types/matricula"

interface ExportMatriculaDialogProps {
  filters: MatriculaQueryRequest["filters"]
  /** Columnas visibles de la tabla, ya traducidas a claves del reporte (ver
   * `MATRICULA_EXPORT_COLUMN_KEYS` en `columns-matricula.tsx`). */
  columns: string[]
}

export function ExportMatriculaDialog({ filters, columns }: ExportMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportAll = useExportMatricula({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({ filters, format, columns })
  }

  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  color="muted"
                  size="icon-sm"
                  aria-label="Exportar estudiantes filtrados"
                />
              }
            />
          }
        >
          <FileDownloadOutlinedIcon />
        </TooltipTrigger>
        <TooltipContent>Exportar estudiantes filtrados</TooltipContent>
      </Tooltip>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar todos los estudiantes que coincidan con los filtros
            activos, con las columnas que tengas visibles en la tabla.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "excel"}
              onClick={() => handleExport("excel")}
            >
              {pendingFormat === "excel" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileXlsIcon data-icon="inline-start" />
              )}
              Excel
            </Button>
            <Button
              size="sm"
              type="button"
              color="primary"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              {pendingFormat === "pdf" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FilePdfIcon data-icon="inline-start" />
              )}
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
