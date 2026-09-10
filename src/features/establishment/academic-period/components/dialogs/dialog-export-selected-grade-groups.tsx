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

import { useExportSelectedGradeGroups } from "@/features/establishment/academic-period/api/mutations/export-selected-grade-groups"
import type { ExportFormat } from "@/features/establishment/academic-period/api/types/grade-group"

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
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const count = selectedIds.length

  const exportSelected = useExportSelectedGradeGroups({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
        resetSelection()
      },
      onError: () => {
        notify("No se pudo exportar: todavía no hay endpoint para esto.", { variant: "error" })
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportSelected.mutate({ ids: selectedIds, format, academicPeriodId })
  }

  const pendingFormat = exportSelected.isPending ? exportSelected.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="muted"
            size="sm"
            aria-label={`Exportar ${count} seleccionados`}
          />
        }
      >
        <FileDownloadOutlinedIcon data-icon="inline-start" aria-hidden="true" />
        <span aria-hidden="true" className="tabular-nums">
          ({count})
        </span>
      </DialogTrigger>
      {/* `forceRender`: este Dialog se abre anidado dentro del Dialog de
          crear/editar grado (ya abierto) — mismo fix que
          dialog-select-general-area.tsx. */}
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar los {count} grupo(s) seleccionado(s).
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
              disabled={exportSelected.isPending}
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
              disabled={exportSelected.isPending}
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
