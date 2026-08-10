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

import { useExportSelectedRatingScales } from "../../../api/mutations/rating-scales/export-selected-rating-scales"
import type { ExportFormat } from "../../../api/types/rating-scales"

interface ExportSelectedRatingScalesDialogProps {
  /** Cantidad de niveles de enseñanza seleccionados — se muestra en el trigger
   *  y en el header del dialog. */
  levelCount: number
  /** Códigos de escala a exportar (los niveles se expanden a sus escalas). */
  scaleCodigos: number[]
  resetSelection: () => void
}

export function ExportSelectedRatingScalesDialog({
  levelCount,
  scaleCodigos,
  resetSelection,
}: ExportSelectedRatingScalesDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const count = levelCount

  const exportSelected = useExportSelectedRatingScales({
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
    },
  })

  function handleExport(format: ExportFormat) {
    exportSelected.mutate({ ids: scaleCodigos, format })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar las escalas de los {count} nivel(es) seleccionado(s).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
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
