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

import { useExportTableOperations } from "../../api/mutations/export-table-operations"
import type { ExportFormat } from "../../api/types/audit"
import type { TableOperationsQueryRequest } from "../../api/types/audit-table"

interface ExportTableOperationsDialogProps {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
}

export function ExportTableOperationsDialog({
  tableSlug,
  filters,
}: ExportTableOperationsDialogProps) {
  const [open, setOpen] = useState(false)

  const exportAll = useExportTableOperations({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({ tableSlug, filters, format })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" aria-label="Exportar operaciones filtradas" />}
      >
        <DownloadSimpleIcon data-icon="inline-start" />
        <span className="sr-only md:not-sr-only">Exportar</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar operaciones filtradas</DialogTitle>
          <DialogDescription>
            Elegí un formato para exportar todas las operaciones que coincidan
            con los filtros activos.
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
              disabled={exportAll.isPending}
              onClick={() => handleExport("excel")}
            >
              <FileXlsIcon data-icon="inline-start" />
              Excel
            </Button>
            <Button
              type="button"
              disabled={exportAll.isPending}
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
