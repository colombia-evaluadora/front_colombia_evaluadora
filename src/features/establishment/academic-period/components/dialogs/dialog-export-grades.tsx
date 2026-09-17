import { useState } from "react"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

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

import { useExportGrades } from "@/features/establishment/academic-period/api/mutations/export-grades"
import type { ExportFormat } from "@/features/establishment/academic-period/api/types/grade"

interface ExportGradesDialogProps {
  academicPeriodId?: number
}

export function ExportGradesDialog({ academicPeriodId }: ExportGradesDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportAll = useExportGrades({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({ academicPeriodId, format })
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
                  aria-label="Exportar grados y grupos"
                />
              }
            />
          }
        >
          <FileDownloadOutlinedIcon />
        </TooltipTrigger>
        <TooltipContent>Exportar grados y grupos</TooltipContent>
      </Tooltip>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar los grados y grupos de este periodo.
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
