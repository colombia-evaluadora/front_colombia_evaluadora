import { useState } from "react"

import { DownloadSimpleIcon, FilePdfIcon, FileXlsIcon } from "@phosphor-icons/react"
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

import { useExportSelectedTableOperations } from "../../api/mutations/export-selected-table-operations"
import type { ExportFormat } from "../../api/types/audit"

interface ExportSelectedTableOperationsDialogProps {
  tableSlug: string
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedTableOperationsDialog({
  tableSlug,
  selectedIds,
  resetSelection,
}: ExportSelectedTableOperationsDialogProps) {
  const [open, setOpen] = useState(false)
  const count = selectedIds.length

  const exportSelected = useExportSelectedTableOperations({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
        resetSelection()
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportSelected.mutate({ tableSlug, ids: selectedIds, format })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" aria-label={`Exportar ${count} seleccionadas`} />}
      >
        <DownloadSimpleIcon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({count})
        </span>
        <span className="sr-only md:not-sr-only">Exportar ({count})</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar operaciones seleccionadas</DialogTitle>
          <DialogDescription>
            Elegí un formato para exportar {count} operación(es) seleccionada(s).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={exportSelected.isPending}
              onClick={() => handleExport("excel")}
            >
              <FileXlsIcon data-icon="inline-start" />
              Excel
            </Button>
            <Button
              type="button"
              disabled={exportSelected.isPending}
              onClick={() => handleExport("pdf")}
            >
              <FilePdfIcon data-icon="inline-start" />
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
