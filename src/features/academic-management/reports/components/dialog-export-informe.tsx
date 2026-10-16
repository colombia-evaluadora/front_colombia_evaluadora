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

/** Un boletín a generar: un estudiante en un período (el de su check o el
 *  único a la vista), calculado sobre los datos SIN filtrar del grupo (no
 *  sobre lo que deja el buscador). */
export interface EstudianteBoletin {
  matriculaId: number
  nombre: string
  periodoId: number
  /** Abreviación ("P2") para los avisos cuando hay varios períodos. */
  periodoEtiqueta: string
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
  /** Los boletines a generar. Los de un mismo período y plantilla van en un
   *  solo PDF; cada combinación distinta es un documento aparte. */
  estudiantes: EstudianteBoletin[]
  /** Falso mientras no haya estudiantes o falte decidir algún período. */
  listo: boolean
  /** Por qué no está listo (p. ej. a quién le falta marcar el período). */
  motivoNoListo: string | null
  /** "Ir a consolidar": deja seleccionados (y marcados) solo los pendientes. */
  onIrAConsolidar: (pendientes: { matriculaId: number; periodoId: number }[]) => void
}

/** Lo que pide UNA llamada al reporte: el backend recibe un solo período y
 *  una sola plantilla (`nivel`) por llamada. */
interface LoteBoletin {
  periodoId: number
  periodoEtiqueta: string
  esPreescolar: boolean
  matriculaIds: number[]
}

function armarLotes(estudiantes: EstudianteBoletin[]): LoteBoletin[] {
  const porClave = new Map<string, LoteBoletin>()
  for (const e of estudiantes) {
    const clave = `${e.periodoId}|${e.esPreescolar}`
    const lote = porClave.get(clave)
    if (lote) {
      lote.matriculaIds.push(e.matriculaId)
      continue
    }
    porClave.set(clave, {
      periodoId: e.periodoId,
      periodoEtiqueta: e.periodoEtiqueta,
      esPreescolar: e.esPreescolar,
      matriculaIds: [e.matriculaId],
    })
  }
  return [...porClave.values()]
}

function describirLote(lote: LoteBoletin): string {
  const n = lote.matriculaIds.length
  return `${lote.periodoEtiqueta} de ${lote.esPreescolar ? "preescolar" : "notas"} (${n} boletín${n === 1 ? "" : "es"})`
}

export function DialogGenerarBoletin({
  grupoId,
  estudiantes,
  listo,
  motivoNoListo,
  onIrAConsolidar,
}: DialogGenerarBoletinProps) {
  const soloEnLinea = useOnlineOnly("El boletín se genera en el servidor; necesitas conexión para descargarlo.")
  const { notify } = useNotify()
  const [avisoAbierto, setAvisoAbierto] = useState(false)
  const exportar = useExportBoletin()

  const puede = listo && grupoId != null && estudiantes.length > 0
  const varios = estudiantes.length > 1
  const sinConsolidar = estudiantes.filter((e) => e.sinConsolidar)
  const soloBorrador = estudiantes.filter((e) => e.soloBorrador)
  // El reporte elige UN período y UNA plantilla por llamada: con períodos
  // distintos por estudiante (checks de la columna "Pe") o un grupo mixto
  // (transición, aulas multigrado) salen varios documentos, cada uno con su
  // plantilla, en vez de imprimir a la mitad con la equivocada.
  const lotes = armarLotes(estudiantes)
  const variosPeriodos = new Set(estudiantes.map((e) => e.periodoId)).size > 1
  const hayAvisos = sinConsolidar.length > 0 || soloBorrador.length > 0 || lotes.length > 1

  function listaNombres(lista: EstudianteBoletin[]): string {
    const max = 8
    const nombres = lista
      .slice(0, max)
      .map((e) => (variosPeriodos ? `${e.nombre} (${e.periodoEtiqueta})` : e.nombre))
    const resto = lista.length - nombres.length
    return nombres.join(", ") + (resto > 0 ? ` y ${resto} más` : "")
  }

  async function generar() {
    if (!puede || grupoId == null) return
    setAvisoAbierto(false)
    // Uno detrás de otro: son descargas del navegador y un error en un lote
    // no debe impedir los demás.
    const fallidos: string[] = []
    let ultimo: ExportResult | null = null
    for (const lote of lotes) {
      try {
        const resultado = await exportar.mutateAsync({
          grupoId,
          periodoId: lote.periodoId,
          matriculaIds: lote.matriculaIds,
          esPreescolar: lote.esPreescolar,
        })
        if (resultado.status === "error") fallidos.push(`${describirLote(lote)}: ${resultado.message}`)
        else ultimo = resultado
      } catch (e) {
        fallidos.push(`${describirLote(lote)}: ${getErrorMessage(e)}`)
      }
    }
    if (fallidos.length > 0) {
      const generados = lotes.length - fallidos.length
      notify(
        `${generados > 0 ? `Se generaron ${generados} de ${lotes.length} documentos. ` : ""}No se pudo generar — ${fallidos.join(" · ")}`,
        { variant: "error" },
      )
      return
    }
    notify(
      lotes.length > 1
        ? `Se generaron ${lotes.length} documentos: ${lotes.map(describirLote).join(", ")}.`
        : (ultimo?.message ?? "Boletín generado."),
    )
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
                  {variosPeriodos ? "en el período marcado" : "en este período"} no aparecerán en
                  el boletín: {listaNombres(sinConsolidar)}.
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
              {lotes.length > 1 && (
                <p>
                  Se descargarán {lotes.length} documentos, uno por cada período y plantilla:{" "}
                  {lotes.map(describirLote).join(", ")}.
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
                onClick={() =>
                  onIrAConsolidar(
                    sinConsolidar.map((e) => ({ matriculaId: e.matriculaId, periodoId: e.periodoId })),
                  )
                }
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
            (!puede
              ? (motivoNoListo ??
                "Selecciona uno o varios estudiantes en la tabla. Con varios períodos a la vista, marca en la columna Pe el período de cada boletín.")
              : lotes.length > 1
                ? `Generar ${lotes.length} documentos, uno por cada período y plantilla.`
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
