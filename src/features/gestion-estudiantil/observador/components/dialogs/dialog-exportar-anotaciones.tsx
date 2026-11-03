import { useState } from "react"

import { Button } from "@/components/ui/button"
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
import { FileDownloadOutlinedIcon, FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import type { ExportFormat } from "@/features/establishment/institution/api/types/export"

import { useExportarAnotaciones } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import type { ObservadorQueryFilters } from "@/features/gestion-estudiantil/observador/api/types"

/** Exportar del listado: lo que se ve en la tabla (mismos filtros y alcance), sin paginar. */
export function DialogExportarAnotaciones({ filters }: { filters: ObservadorQueryFilters }) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportar = useExportarAnotaciones({
    mutationConfig: {
      onSuccess: (result) => {
        notify(result.message, { variant: result.status === "error" ? "error" : "success" })
        if (result.status !== "error") setOpen(false)
      },
    },
  })

  const pendiente = exportar.isPending ? exportar.variables?.format : undefined

  function boton(format: ExportFormat, label: string) {
    const Icono = format === "pdf" ? FilePdfIcon : FileXlsIcon
    return (
      <Button
        size="sm"
        type="button"
        variant={format === "pdf" ? "fill" : "outline"}
        disabled={exportar.isPending}
        aria-busy={pendiente === format}
        onClick={() => exportar.mutate({ filters, format })}
      >
        {pendiente === format ? (
          <SpinnerIcon data-icon="inline-start" className="animate-spin" />
        ) : (
          <Icono data-icon="inline-start" />
        )}
        {label}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" color="muted" />}>
        <FileDownloadOutlinedIcon data-icon="inline-start" />
        Exportar
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar anotaciones</DialogTitle>
          <DialogDescription>
            Elige un formato para descargar las anotaciones con los filtros aplicados. Las de situaciones Tipo II y
            III salen sin observación para quien no tiene acceso a ella.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>Cancelar</DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {boton("excel", "Excel")}
            {boton("pdf", "PDF")}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
