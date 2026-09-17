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
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useExportGradeGroups } from "@/features/establishment/academic-period/api/mutations/export-grade-groups"
import type {
  ExportFormat,
  GradeGroupsQueryFilters,
} from "@/features/establishment/academic-period/api/types/grade-group"

interface ExportGradeGroupsDialogProps {
  filters: GradeGroupsQueryFilters
}

export function ExportGradeGroupsDialog({ filters }: ExportGradeGroupsDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportAll = useExportGradeGroups({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
      onError: () => {
        notify("No se pudo exportar: todavía no hay endpoint para esto.", { variant: "error" })
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({ filters, format })
  }

  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button variant="outline" color="muted" size="icon-sm" aria-label="Exportar grupos" />
              }
            />
          }
        >
          <FileDownloadOutlinedIcon />
        </TooltipTrigger>
        <TooltipContent>Exportar grupos</TooltipContent>
      </Tooltip>
      {/* `forceRender`: este Dialog se abre anidado dentro del Dialog de
          crear/editar grado (ya abierto) — mismo fix que
          dialog-select-general-area.tsx. */}
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>Elige un formato para exportar todos los grupos.</DialogDescription>
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
