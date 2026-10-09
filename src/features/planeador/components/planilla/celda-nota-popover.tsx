import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { IoMdCheckboxOutline } from "react-icons/io"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { useNotaEstudianteQuery } from "@/features/planeador/api/query/use-nota-estudiante-query"
import {
  useCalificarCeldaMutation,
  type CalificarCeldaInput,
} from "@/features/planeador/api/mutations/use-calificar-celda"
import { usePrevisualizarNotaMutation } from "@/features/planeador/api/mutations/use-previsualizar-nota"
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
  resolverInstrumentoEfectivo,
  splitCriteriosGenerales,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import type { InstrumentoActividad } from "@/features/planeador/api/types/planilla"

interface CeldaNotaPopoverProps {
  actividadId: number
  pkTactividadEstudiante: number
  fecha: string
  estudianteNombre: string
  onGuardado?: () => void
  onCambio?: (pkTactividadEstudiante: number, cambio: CambioPendiente | null) => void
  cambioPendiente?: CambioPendiente
  calificacionPropuesta?: unknown
}

export interface CambioPendiente {
  input: CalificarCeldaInput
  notas: NotaCriterio[]
  notaPropuesta: number | null
}

export function buildCalificarCeldaInput(
  instrumento: InstrumentoActividad,
  value: NotaCriterio[],
  pkTactividadEstudiante: number,
  fecha: string,
): CalificarCeldaInput | null {
  const efectivo = resolverInstrumentoEfectivo(instrumento)

  if (efectivo.tipo === "RUBRICA") {
    const criteriosActivos = new Set(efectivo.definicion.map((c) => c.pk))
    const niveles = value
      .filter((n) => n.nivelId != null && criteriosActivos.has(n.criterioId))
      .map((n) => ({ pkCriterio: n.criterioId, pkNivel: n.nivelId! }))
    if (niveles.length === 0) return null
    return { pkTactividadEstudiante, fecha, tipo: "RUBRICA", niveles }
  }
  if (efectivo.tipo === "LISTA_COTEJO") {
    const itemsActivos = new Set(efectivo.definicion.map((i) => i.pk))
    const marcados = value.filter((n) => itemsActivos.has(n.criterioId))
    if (marcados.length === 0) return null
    return {
      pkTactividadEstudiante,
      fecha,
      tipo: "LISTA_COTEJO",
      itemsMarcados: marcados.map((n) => n.criterioId),
    }
  }
  if (efectivo.tipo === "ESCALA_VALORACION") {
    const criterios = splitCriteriosGenerales(efectivo.definicion.criteriosGenerales)
    if (criterios.length > 1) {
      const esCualitativa = efectivo.definicion.niveles.length > 0
      const cuerpo = value
        .filter((n) => n.criterioId < criterios.length && (esCualitativa ? n.nivelId != null : n.valor != null))
        .map((n) =>
          esCualitativa
            ? { criterioIndex: n.criterioId, pkNivel: n.nivelId! }
            : { criterioIndex: n.criterioId, valorNumerico: n.valor! },
        )
      if (cuerpo.length === 0) return null
      return { pkTactividadEstudiante, fecha, tipo: "ESCALA_CRITERIOS", criterios: cuerpo }
    }
    if (efectivo.definicion.niveles.length > 0) {
      const nivelId = value[0]?.nivelId
      if (nivelId == null) return null
      return { pkTactividadEstudiante, fecha, tipo: "ESCALA_CUALITATIVA", pkNivel: nivelId }
    }
    const valor = value[0]?.valor
    if (valor == null) return null
    return { pkTactividadEstudiante, fecha, tipo: "VALOR_NUMERICO", valorNumerico: valor }
  }
  if (efectivo.tipo === "VALOR_NUMERICO") {
    const valor = value[0]?.valor
    if (valor == null) return null
    return { pkTactividadEstudiante, fecha, tipo: "OTRO_PORCENTAJE", porcentaje: valor }
  }
  return null
}

function mismasNotas(a: NotaCriterio[], b: NotaCriterio[]) {
  if (a.length !== b.length) return false
  return a.every((x) => {
    const y = b.find((n) => n.criterioId === x.criterioId)
    return y != null && y.valor === x.valor && y.nivelId === x.nivelId
  })
}

export function notasDeCalificacion(calificacion: unknown): NotaCriterio[] | null {
  if (!calificacion || typeof calificacion !== "object") return null
  const c = calificacion as Record<string, unknown>
  if (Array.isArray(c.niveles)) {
    return (c.niveles as { pkCriterio: number; pkNivel: number }[]).map((n) => ({
      criterioId: n.pkCriterio,
      nivelId: n.pkNivel,
    }))
  }
  if (Array.isArray(c.itemsMarcados)) {
    return (c.itemsMarcados as number[]).map((pk) => ({ criterioId: pk, valor: 100 }))
  }
  if (Array.isArray(c.criterios)) {
    return (c.criterios as { criterioIndex: number; pkNivel?: number; valorNumerico?: number }[]).map((n) =>
      n.pkNivel != null
        ? { criterioId: n.criterioIndex, nivelId: n.pkNivel }
        : { criterioId: n.criterioIndex, valor: n.valorNumerico },
    )
  }
  if (typeof c.pkNivel === "number") return [{ criterioId: 0, nivelId: c.pkNivel }]
  if (typeof c.valorNumerico === "number") return [{ criterioId: 0, valor: c.valorNumerico }]
  if (typeof c.porcentaje === "number") return [{ criterioId: 0, valor: c.porcentaje }]
  return null
}

export function CeldaNotaPopover({
  actividadId,
  pkTactividadEstudiante,
  fecha,
  estudianteNombre,
  onGuardado,
  onCambio,
  cambioPendiente,
  calificacionPropuesta,
}: CeldaNotaPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NotaCriterio[]>([])
  const { notify } = useNotify()

  const { data: instrumento } = useInstrumentoActividadQuery(actividadId)
  const { data: notaActual } = useNotaEstudianteQuery(open ? pkTactividadEstudiante : undefined)

  useEffect(() => {
    if (open) {
      setDraft(
        cambioPendiente?.notas ?? notasDeCalificacion(calificacionPropuesta) ?? notaActual?.notas ?? [],
      )
    }
  }, [open, notaActual, cambioPendiente, calificacionPropuesta])

  const calificar = useCalificarCeldaMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Nota guardada.")
        setOpen(false)
        onGuardado?.()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const notasOriginales = notasDeCalificacion(calificacionPropuesta) ?? notaActual?.notas ?? []

  const previsualizar = usePrevisualizarNotaMutation()
  const completitud = instrumentoCompletitud(instrumento, draft)

  function guardar() {
    if (!instrumento) return
    const input = buildCalificarCeldaInput(instrumento, draft, pkTactividadEstudiante, fecha)
    if (!input) return
    if (onCambio) {
      // Mismos criterios que la nota original: no hay cambio que enviar.
      if (mismasNotas(draft, notasOriginales)) {
        onCambio(pkTactividadEstudiante, null)
        setOpen(false)
        return
      }
      previsualizar.mutate(input, {
        onSuccess: (result) => {
          onCambio(pkTactividadEstudiante, { input, notas: draft, notaPropuesta: result?.nota_homologada ?? null })
          setOpen(false)
        },
        onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
      })
      return
    }
    calificar.mutate(input)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  aria-label={`Calificar a ${estudianteNombre}`}
                />
              }
            />
          }
        >
          <IoMdCheckboxOutline className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Calificar a {estudianteNombre}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" side="bottom" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Instrumento: {instrumento?.instrumentoNombre ?? "…"}</PopoverTitle>
        </PopoverHeader>

        <InstrumentoGradingFields actividadId={actividadId} value={draft} onChange={setDraft} />

        {completitud.mensaje && (
          <p className="text-muted-foreground text-xs">{completitud.mensaje}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            disabled={!completitud.completo || calificar.isPending || previsualizar.isPending}
            onClick={guardar}
          >
            {calificar.isPending || previsualizar.isPending ? (
              <SpinnerIcon className="animate-spin" data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button variant="fill" color="neutral" size="sm" onClick={() => setOpen(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
