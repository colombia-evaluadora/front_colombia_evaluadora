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

import { useExportSelectedEstablishments } from "../../api/mutations/export-selected-establishments"
import type { ExportFormat } from "../../api/types/export"
import { useNotify } from "@/components/notice/notice-context"

interface ExportSelectedEstablishmentsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedEstablishmentsDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedEstablishmentsDialogProps) {
  const [open, setOpen] = useState(false)
  const count = selectedIds.length
  const { notify } = useNotify()

  const exportSelected = useExportSelectedEstablishments({
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
    exportSelected.mutate({ ids: selectedIds, format })
  }

  // Los dos botones comparten la misma mutación, así que `isPending` sola no
  // distingue cuál se pulsó. `variables` guarda el input en vuelo — con eso
  // el spinner sale solo en el botón que disparó la exportación.
  const pendingFormat = exportSelected.isPending ? exportSelected.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="muted"
            size="sm"
            aria-label={`Exportar ${count} establecimientos seleccionados`}
          >
            <FileDownloadOutlinedIcon data-icon="inline-start" />
            <span className="tabular-nums">({count})</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar {count} establecimiento(s) seleccionado(s).
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
