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
import { useNotify } from "@/components/notice/notice-context"

import { useExportAsistencia } from "@/features/academic-management/asistencia/api/mutations/export"
import type { AsistenciaQueryFilters } from "@/features/academic-management/asistencia/api/types/asistencia"
import type { ExportFormat } from "@/features/academic-management/asistencia/api/types/export"

interface ExportSeguimientoDialogProps {
  filters: AsistenciaQueryFilters
}

/** E03HU57 -- reporte de asistencia por grupo. A diferencia del listado de
 * Seguimiento (que pagina y deja GRUPO/fechas opcionales), el reporte los
 * exige los tres (V281): sin grupo y rango no hay reporte que generar, así
 * que el botón queda deshabilitado hasta que estén puestos. */
export function ExportSeguimientoDialog({ filters }: ExportSeguimientoDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const faltaGrupoOFecha = !filters.GRUPO || !filters.FECHA_DESDE || !filters.FECHA_HASTA

  const exportar = useExportAsistencia({
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
    exportar.mutate({ filters, format })
  }

  const pendingFormat = exportar.isPending ? exportar.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="neutral"
            size="icon-sm"
            aria-label="Exportar reporte de asistencia"
            disabled={faltaGrupoOFecha}
          >
            <FileDownloadOutlinedIcon />
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar reporte de asistencia</DialogTitle>
          <DialogDescription>
            Elige un formato para generar el reporte del grupo y el rango de fechas seleccionados,
            con los porcentajes de asistencia, faltas y tardanzas, y las observaciones/justificaciones
            de cada registro.
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
