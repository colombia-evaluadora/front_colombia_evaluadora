import { useState } from "react"

import { DownloadSimpleIcon, FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"
import { toast } from "sonner"

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

import { useExportSelectedReservations } from "../../api/mutations/export-selected-reservations"
import type { ExportFormat } from "../../api/types/reservation"

interface ExportSelectedReservationsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedReservationsDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedReservationsDialogProps) {
  const [open, setOpen] = useState(false)

  const exportSelected = useExportSelectedReservations({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        resetSelection()
        setOpen(false)
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportSelected.mutate({ ids: selectedIds, format })
  }

  const pendingFormat = exportSelected.isPending ? exportSelected.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button color="primary" size="sm" aria-label="Exportar reservas seleccionadas" />}
      >
        <DownloadSimpleIcon data-icon="inline-start" />
        <span className="sr-only md:not-sr-only">Exportar selección</span>
        <span>· {selectedIds.length}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Se exportarán {selectedIds.length} reserva(s). Elegí el formato.
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
