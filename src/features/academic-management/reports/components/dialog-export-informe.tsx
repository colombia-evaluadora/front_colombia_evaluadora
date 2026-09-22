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

/**
 * El armazón que comparten las dos descargas. Lo único que cambia entre el
 * boletín y el descargar es el disparador, los textos y a qué reporte le pega;
 * el diálogo de "PDF o Excel" es el mismo de siempre.
 */
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
        {/* El trigger va envuelto en `span` por el mismo motivo de siempre: un
            <button disabled> nativo no dispara los eventos de hover que el
            Tooltip necesita para abrirse. */}
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
  /** Las matrículas seleccionadas en la tabla: un boletín es de un estudiante. */
  matriculas: number[]
  /** Falso mientras no haya exactamente un período y un estudiante. */
  listo: boolean
  /** El boletín en PDF solo sabe imprimir dimensiones cualitativas (ver
   *  `boletin-preescolar.md`): sobre un grupo numérico el backend igual
   *  respondería 200 con un PDF vacío, así que se corta antes en la UI. */
  esPreescolar: boolean
}

/**
 * EL BOLETÍN. No es la tabla exportada: es el PDF armado aparte —una página
 * por (estudiante, asignatura/dimensión), con foto, evidencias y fondo
 * institucional— que arma `/reportes/boletin-preescolar` (ver
 * `boletin-preescolar.md`). Por eso no comparte el diálogo de PDF/Excel de
 * `DialogDescarga`: solo hay un formato, así que el botón dispara directo.
 */
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

  const puede = listo && esPreescolar && grupoId != null

  function handleClick() {
    if (!puede || grupoId == null) return
    exportar.mutate({ grupoId, periodoId: periodos[0], matriculaId: matriculas[0] })
  }

  return (
    <Tooltip>
      {/* El trigger va en un `span`, no en el propio Button: un
          <button disabled> nativo no dispara los eventos de hover que el
          Tooltip necesita para abrirse. */}
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
          Generar boletín
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!listo
          ? "Selecciona un único período arriba y un estudiante en la tabla para generar su boletín."
          : !esPreescolar
            ? "El boletín en PDF solo está disponible para preescolar."
            : "Generar el boletín del estudiante seleccionado"}
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

/**
 * EL DESCARGAR. La tabla tal como está en pantalla, sin filtrar: lo
 * consolidado, lo proyectado, lo requerido y lo que no tiene nota, cada uno
 * dicho con todas las letras en la columna Estado.
 */
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
