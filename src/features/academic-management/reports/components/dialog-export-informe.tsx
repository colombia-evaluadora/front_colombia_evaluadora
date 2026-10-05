import { useState } from "react"
import type { ReactElement } from "react"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileTextIcon,
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
import { useNotify } from "@/components/notice/notice-context"

import {
  useExportBoletin,
  useExportTabla,
} from "@/features/academic-management/reports/api/mutations/export-informe"
import type { ExportFormat, ExportResult } from "@/features/academic-management/reports/api/types/export"

interface DialogDescargaProps {
  trigger: ReactElement
  tooltip: string
  titulo: string
  descripcion: string
  exportar: (format: ExportFormat) => Promise<ExportResult>
  pendiente: ExportFormat | undefined
  onCerrar: () => void
  abierto: boolean
  onAbrirChange: (abierto: boolean) => void
}

function DialogDescarga({
  trigger,
  tooltip,
  titulo,
  descripcion,
  exportar,
  pendiente,
  abierto,
  onAbrirChange,
}: DialogDescargaProps) {
  return (
    <Dialog open={abierto} onOpenChange={onAbrirChange}>
      <Tooltip>
        <TooltipTrigger render={<DialogTrigger render={trigger} />}>
          <span className="sr-only">{tooltip}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
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
              disabled={pendiente !== undefined}
              aria-busy={pendiente === "excel"}
              onClick={() => void exportar("excel")}
            >
              {pendiente === "excel" ? (
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
              disabled={pendiente !== undefined}
              aria-busy={pendiente === "pdf"}
              onClick={() => void exportar("pdf")}
            >
              {pendiente === "pdf" ? (
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

interface DialogGenerarBoletinProps {
  grupoId: number | null
  /** Un solo período: un boletín es de un período. */
  periodos: number[]
  /** Las matrículas seleccionadas en la tabla: todas van en el mismo PDF. */
  matriculas: number[]
  /** Falso mientras no haya exactamente un período y al menos un estudiante. */
  listo: boolean
  /** Grupo cualitativo: pide el boletín de preescolar; si no, el de notas. */
  esPreescolar: boolean
}

export function DialogGenerarBoletin({
  grupoId,
  periodos,
  matriculas,
  listo,
  esPreescolar,
}: DialogGenerarBoletinProps) {
  const { notify } = useNotify()

  const exportar = useExportBoletin({
    mutationConfig: {
      onSuccess: (result) => {
        notify(result.message, { variant: result.status === "error" ? "error" : undefined })
      },
    },
  })

  const puede = listo && grupoId != null
  const varios = matriculas.length > 1

  function handleClick() {
    if (!puede || grupoId == null) return
    exportar.mutate({ grupoId, periodoId: periodos[0], matriculaIds: matriculas, esPreescolar })
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          disabled={!puede || exportar.isPending}
          aria-busy={exportar.isPending}
          onClick={handleClick}
        >
          {exportar.isPending ? (
            <SpinnerIcon data-icon="inline-start" className="animate-spin" />
          ) : (
            <FileTextIcon data-icon="inline-start" />
          )}
          {varios ? `Generar ${matriculas.length} boletines` : "Generar boletín"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!listo
          ? "Selecciona un único período arriba y uno o varios estudiantes en la tabla para generar sus boletines."
          : varios
            ? "Generar los boletines de los estudiantes seleccionados en un solo documento, uno detrás de otro."
            : "Generar el boletín del estudiante seleccionado."}
      </TooltipContent>
    </Tooltip>
  )
}

interface DialogDescargarTablaProps {
  grupoId: number | null
  periodos: number[]
  /** El texto del buscador: lo que se ve es lo que baja. */
  search: string
  /** El resumen con nombres para el membrete del archivo. */
  filtersLabel: string
}

export function DialogDescargarTabla({
  grupoId,
  periodos,
  search,
  filtersLabel,
}: DialogDescargarTablaProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportar = useExportTabla({
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

  const falta = grupoId == null || periodos.length === 0

  return (
    <DialogDescarga
      abierto={open}
      onAbrirChange={setOpen}
      onCerrar={() => setOpen(false)}
      trigger={
        <Button
          variant="outline"
          color="neutral"
          size="icon-sm"
          aria-label="Descargar la tabla"
          disabled={falta}
        >
          <FileDownloadOutlinedIcon />
        </Button>
      }
      tooltip="Descargar la tabla tal como se está viendo"
      titulo="Descargar la tabla"
      descripcion="Baja la tabla completa tal como está en pantalla, con la búsqueda aplicada: notas guardadas, proyectadas y las que faltan para aprobar, cada una identificada en la columna Estado."
      pendiente={exportar.isPending ? exportar.variables?.format : undefined}
      exportar={async (format) => {
        if (grupoId == null) return { status: "error", message: "Sin grupo." }
        return exportar.mutateAsync({ format, grupoId, periodos, search, filtersLabel })
      }}
    />
  )
}
