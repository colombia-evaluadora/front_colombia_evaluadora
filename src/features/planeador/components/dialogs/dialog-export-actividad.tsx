import { useState } from "react"
import { toast } from "sonner"

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

import { useExportActividad } from "@/features/planeador/api/mutations/export-actividad"
import type { Actividad, ExportFormat } from "@/features/planeador/api/types/actividad"

interface DialogExportActividadProps {
  actividad: Pick<Actividad, "id" | "nombre">
  /** Se aplica al `Button` del trigger — la card le pasa su variante
   * ghost/neutral/icon-sm para que viva dentro del overlay de acciones. */
  triggerProps?: React.ComponentProps<typeof Button>
}

/**
 * Exportación de UNA actividad. Mismo diálogo que el export masivo del
 * toolbar (`DialogExportActividades`) pero apuntando a un solo id: el
 * usuario abre el diálogo desde el ícono de descarga de la card y elige
 * el formato ahí adentro, en vez de tener las dos opciones sueltas en un
 * menú desplegable.
 *
 * El toast lo emite el `onSuccess` leyendo el `message` que devuelve el
 * backend, igual que el resto de los diálogos del feature.
 */
export function DialogExportActividad({
  actividad,
  triggerProps,
}: DialogExportActividadProps) {
  const [open, setOpen] = useState(false)

  const exportOne = useExportActividad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setOpen(false)
      },
      onError: () => {
        toast.error("No se pudo exportar la actividad.")
      },
    },
  })

  const pendingFormat = exportOne.isPending ? exportOne.variables?.format : undefined

  function handleExport(format: ExportFormat) {
    exportOne.mutate({ id: actividad.id, format })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Exportar ${actividad.nombre}`}
            // La card monta el trigger dentro del botón invisible que cubre
            // toda la tarjeta: sin `stopPropagation` el click abriría también
            // el detalle en el panel de la derecha.
            onClick={(e) => e.stopPropagation()}
            {...triggerProps}
          />
        }
      >
        <FileDownloadOutlinedIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar la actividad &ldquo;{actividad.nombre}
            &rdquo;.
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
              disabled={exportOne.isPending}
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
              disabled={exportOne.isPending}
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
