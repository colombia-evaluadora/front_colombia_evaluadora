import { useState } from "react"

import { FileDownloadOutlinedIcon, FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"

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
import { useNotify } from "@/components/notice/notice-context"

import { useExportInforme } from "@/features/academic-management/reports/api/mutations/export-informe"
import type { ExportFormat } from "@/features/academic-management/reports/api/types/export"

interface DialogExportInformeProps {
  grupoId: number | null
  periodos: number[]
}

/** Descarga el informe consolidado del grupo/períodos activos en la pantalla
 *  — el mismo listado de `/informes/grupo`, sin paginar. */
export function DialogExportInforme({ grupoId, periodos }: DialogExportInformeProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const faltaGrupoOPeriodo = grupoId == null || periodos.length === 0

  const exportar = useExportInforme({
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

  function handleExport(format: ExportFormat) {
    if (grupoId == null) return
    exportar.mutate({ format, grupoId, periodos })
  }

  const pendingFormat = exportar.isPending ? exportar.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Descargar informe consolidado"
                  disabled={faltaGrupoOPeriodo}
                />
              }
            />
          }
        >
          <FileDownloadOutlinedIcon />
        </TooltipTrigger>
        <TooltipContent>Descargar informe consolidado</TooltipContent>
      </Tooltip>

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Descargar informe consolidado</DialogTitle>
          <DialogDescription>
            Elige un formato para generar el informe del grupo y los períodos seleccionados, con
            notas, promedio, puesto y observaciones de cada estudiante.
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
