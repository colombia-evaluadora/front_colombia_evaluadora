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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getErrorMessage } from "@/lib/api-client"

import {
  useExportBoletin,
  useExportTabla,
} from "@/features/academic-management/reports/api/mutations/export-informe"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/academic-management/reports/api/types/export"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

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

/** Lo que el diálogo necesita saber de cada estudiante seleccionado, calculado
 *  sobre los datos SIN filtrar del grupo (no sobre lo que deja el buscador). */
export interface EstudianteBoletin {
  matriculaId: number
  nombre: string
  /** Su fila del período es cualitativa → plantilla de preescolar. */
  esPreescolar: boolean
  /** Numérico sin consolidar: el boletín lo omite en silencio. */
  sinConsolidar: boolean
  /** Preescolar cuya única observación es un BORRADOR de IA sin revisar: el
   *  boletín no la imprime. */
  soloBorrador: boolean
}

interface DialogGenerarBoletinProps {
  grupoId: number | null
  /** Un boletín es de un único período (real). */
  periodoId: number | null
  /** Los seleccionados en la tabla: van todos en el mismo PDF (o dos, si el
   *  grupo mezcla preescolar y numérico). */
  estudiantes: EstudianteBoletin[]
  /** Falso mientras no haya exactamente un período y al menos un estudiante. */
  listo: boolean
  /** "Ir a consolidar": deja seleccionados solo los pendientes. */
  onIrAConsolidar: (matriculaIds: number[]) => void
}

function listaNombres(estudiantes: EstudianteBoletin[]): string {
  const max = 8
  const nombres = estudiantes.slice(0, max).map((e) => e.nombre)
  const resto = estudiantes.length - nombres.length
  return nombres.join(", ") + (resto > 0 ? ` y ${resto} más` : "")
}

export function DialogGenerarBoletin({
  grupoId,
  periodoId,
  estudiantes,
  listo,
  onIrAConsolidar,
}: DialogGenerarBoletinProps) {
  const soloEnLinea = useOnlineOnly("El boletín se genera en el servidor; necesitas conexión para descargarlo.")
  const { notify } = useNotify()
  const [avisoAbierto, setAvisoAbierto] = useState(false)
  const exportar = useExportBoletin()

  const puede = listo && grupoId != null && periodoId != null
  const varios = estudiantes.length > 1
  const sinConsolidar = estudiantes.filter((e) => e.sinConsolidar)
  const soloBorrador = estudiantes.filter((e) => e.soloBorrador)
  const preescolar = estudiantes.filter((e) => e.esPreescolar)
  const numericos = estudiantes.filter((e) => !e.esPreescolar)
  // Grupo mixto (transición, aulas multigrado): el reporte elige UNA plantilla
  // por llamada (`nivel`), así que se generan dos documentos, cada uno con su
  // plantilla, en vez de imprimir a la mitad con la equivocada.
  const mixto = preescolar.length > 0 && numericos.length > 0
  const hayAvisos = sinConsolidar.length > 0 || soloBorrador.length > 0 || mixto

  async function generar() {
    if (!puede || grupoId == null || periodoId == null) return
    setAvisoAbierto(false)
    const lotes = [
      { esPreescolar: true, ids: preescolar.map((e) => e.matriculaId) },
      { esPreescolar: false, ids: numericos.map((e) => e.matriculaId) },
    ].filter((l) => l.ids.length > 0)
    try {
      const resultados = []
      for (const lote of lotes) {
        resultados.push(
          await exportar.mutateAsync({
            grupoId,
            periodoId,
            matriculaIds: lote.ids,
            esPreescolar: lote.esPreescolar,
          }),
        )
      }
      const error = resultados.find((r) => r.status === "error")
      if (error) {
        notify(error.message, { variant: "error" })
        return
      }
      notify(
        lotes.length > 1
          ? `Se generaron dos documentos: ${preescolar.length} boletín(es) de preescolar y ${numericos.length} de notas.`
          : resultados[0].message,
      )
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
    }
  }

  function handleClick() {
    if (!puede) return
    if (hayAvisos) setAvisoAbierto(true)
    else void generar()
  }

  return (
    <>
      <AlertDialog open={avisoAbierto} onOpenChange={setAvisoAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Antes de generar el boletín</AlertDialogTitle>
            <AlertDialogDescription render={<div className="flex flex-col gap-2 text-left" />}>
              {sinConsolidar.length > 0 && (
                <p>
                  <strong>
                    {sinConsolidar.length} estudiante{sinConsolidar.length === 1 ? "" : "s"} sin
                    consolidar
                  </strong>{" "}
                  en este período no aparecerán en el boletín: {listaNombres(sinConsolidar)}.
                </p>
              )}
              {soloBorrador.length > 0 && (
                <p>
                  <strong>
                    {soloBorrador.length} estudiante{soloBorrador.length === 1 ? "" : "s"}
                  </strong>{" "}
                  solo tienen una observación en Borrador (IA) pendiente de revisión, que el boletín
                  no incluye: {listaNombres(soloBorrador)}. Revísalas y guárdalas para que salgan.
                </p>
              )}
              {mixto && (
                <p>
                  El grupo mezcla preescolar y grados con notas: se descargarán dos documentos, uno
                  por cada plantilla ({preescolar.length} de preescolar y {numericos.length} de
                  notas).
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void generar()}>Continuar</AlertDialogAction>
            {sinConsolidar.length > 0 && (
              <AlertDialogCancel
                variant="outline"
                color="primary"
                onClick={() => onIrAConsolidar(sinConsolidar.map((e) => e.matriculaId))}
              >
                Ir a consolidar
              </AlertDialogCancel>
            )}
            <AlertDialogCancel variant="fill" color="neutral">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            type="button"
            variant="outline"
            color="primary"
            size="sm"
            disabled={!puede || exportar.isPending || soloEnLinea.disabled}
            aria-busy={exportar.isPending}
            onClick={handleClick}
          >
            {exportar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileTextIcon data-icon="inline-start" />
            )}
            {varios ? `Generar ${estudiantes.length} boletines` : "Generar boletín"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {soloEnLinea.tooltip ??
          (!listo
            ? "Selecciona un único período arriba y uno o varios estudiantes en la tabla para generar sus boletines."
            : varios
              ? "Generar los boletines de los estudiantes seleccionados en un solo documento, uno detrás de otro."
              : "Generar el boletín del estudiante seleccionado.")}
        </TooltipContent>
      </Tooltip>
    </>
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
