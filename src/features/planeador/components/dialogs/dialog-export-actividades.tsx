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

import { useExportActividades } from "@/features/planeador/api/mutations/export-actividades"
import type { Actividad, ExportFormat } from "@/features/planeador/api/types/actividad"

interface DialogExportActividadesProps {
  /**
   * Filas ya filtradas en el cliente (lo que se está viendo en el rail).
   * El handler mock las recibe para contar y reportar la cantidad; en el
   * backend real, este mismo shape se traducirá al filtro del query.
   */
  rows: Actividad[]
}

/**
 * Exportación masiva del Planeador. Mismo patrón que
 * `DialogExportMatricula`: dos botones con el formato (PDF / Excel) y el
 * toast lo emite el `onSuccess` leyendo el `message` que devuelve el
 * backend.
 *
 * El trigger (icon-only `outline muted`) lo inyecta la página en la
 * `TableScreenActions` del listado —acá no se renderiza solo, para no
 * duplicar el botón si la página lo quiere posicionar a mano—.
 */
export function DialogExportActividades({ rows }: DialogExportActividadesProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportAll = useExportActividades({
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
    exportAll.mutate({ filters: rows, format })
  }

  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="muted"
            size="icon-sm"
            aria-label="Exportar actividades filtradas"
          >
            {/* El ícono `FileDownload` es el mismo que ya usa la card y el
                botón grande del toolbar; mantener uno solo en la app ayuda
                a que se reconozca como "exportar" sin necesidad de label. */}
            <FileDownloadOutlinedIcon />
          </Button>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar las {rows.length} actividad(es) que coinciden con los
            filtros activos.
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
              size="sm"
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
