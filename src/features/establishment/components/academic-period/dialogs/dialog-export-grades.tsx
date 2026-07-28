import { useState } from "react"

import {
  DownloadSimpleIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
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

import { useExportGrades } from "../../../api/mutations/export-grades"
import type {
  ExportFormat,
  GradesQueryFilters,
} from "../../../api/types/academic-period/grade"

interface ExportGradesDialogProps {
  filters: GradesQueryFilters
}

export function ExportGradesDialog({ filters }: ExportGradesDialogProps) {
  const [open, setOpen] = useState(false)

  const exportAll = useExportGrades({
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
    exportAll.mutate({ filters, format })
  }

  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button color="primary" size="icon-sm" aria-label="Exportar grados" />
        }
      >
        <DownloadSimpleIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar grados</DialogTitle>
          <DialogDescription>
            Elegí un formato para exportar todos los grados.
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
