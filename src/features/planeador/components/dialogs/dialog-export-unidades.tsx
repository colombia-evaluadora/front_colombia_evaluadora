import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  useExportUnidades,
  type PlaneadorUnidadesReportFilters,
  type RotulosExportUnidades,
} from "@/features/planeador/api/mutations/export-unidades"
import type { ExportFormat } from "@/features/planeador/api/types/actividad"

interface DialogExportUnidadesProps {
  /** Texto del botón y su tooltip ("Exportar proyectos pedagógicos filtrados"). */
  label: string
  /** El rótulo en plural y minúscula, para el texto del diálogo. */
  rotuloPlural: string
  /** Alcance de la pantalla + `IDS` de lo que muestra la lista. */
  filters: PlaneadorUnidadesReportFilters
  rotulos?: RotulosExportUnidades
  /** Sin unidades en la lista no hay nada que exportar. */
  disabled?: boolean
}

/** Exportación PDF/Excel de la pestaña de unidades: la gemela de
 *  `DialogExportActividades` para el reporte `planeador-unidades`. */
export function DialogExportUnidades({
  label,
  rotuloPlural,
  filters,
  rotulos,
  disabled,
}: DialogExportUnidadesProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportar = useExportUnidades({
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

  const pendingFormat = exportar.isPending ? exportar.variables?.format : undefined

  function handleExport(format: ExportFormat) {
    exportar.mutate({ filters, format, rotulos })
  }

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
                  disabled={disabled}
                  aria-label={label}
                />
              }
            />
          }
        >
          <FileDownloadOutlinedIcon />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar los {rotuloPlural} que se ven en la lista, con la
            búsqueda y los filtros activos.
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
              disabled={exportar.isPending}
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
              disabled={exportar.isPending}
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
