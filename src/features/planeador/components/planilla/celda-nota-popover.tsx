import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { CheckIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
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
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import type { InstrumentoActividad } from "@/features/planeador/api/types/planilla"

interface CeldaNotaPopoverProps {
  actividadId: number
  pkTactividadEstudiante: number
  /** `yyyy-MM-dd` — la fecha con asistencia válida de ESTE estudiante
   *  (`PlanillaCelda.fechaAsistencia`), no `PlanillaColumna.fechaInicio`:
   *  el gate de calificar exige asistencia para la fecha exacta que se
   *  manda, y casi nunca coincide con el día en que arrancó la actividad. */
  fecha: string
  estudianteNombre: string
}

/** Arma el body de `calificar` según el instrumento REAL de la actividad —
 *  `null` cuando todavía no hay suficiente para mandar un request válido
 *  (instrumento sin definir, o el docente no eligió nada todavía). Exportada
 *  porque `DialogCalificarActividad` (vista "Calificaciones: <actividad>")
 *  la reusa tal cual, sin duplicar la conversión `NotaCriterio[]` ->
 *  `CalificarCeldaInput`. */
export function buildCalificarCeldaInput(
  instrumento: InstrumentoActividad,
  value: NotaCriterio[],
  pkTactividadEstudiante: number,
  fecha: string,
): CalificarCeldaInput | null {
  if (instrumento.instrumento === "RUBRICA") {
    // Solo criterios que SIGUEN activos: `value` puede traer una nota
    // precargada (`toNotas`) de un criterio ya borrado/desactivado después
    // de que el estudiante fue calificado la primera vez. Mandarla junto
    // con la elegida ahora hace que el backend rechace el guardado con
    // "La rúbrica tiene N criterio(s) activo(s) pero se calificaron M" —
    // mismo filtro que `instrumentoCompletitud`.
    const criteriosActivos = new Set(instrumento.definicion.map((c) => c.pk))
    const niveles = value
      .filter((n) => n.nivelId != null && criteriosActivos.has(n.criterioId))
      .map((n) => ({ pkCriterio: n.criterioId, pkNivel: n.nivelId! }))
    if (niveles.length === 0) return null
    return { pkTactividadEstudiante, fecha, tipo: "RUBRICA", niveles }
  }
  if (instrumento.instrumento === "LISTA_COTEJO") {
    // Mismo criterio que RUBRICA: solo ítems que siguen en la lista actual.
    const itemsActivos = new Set(instrumento.definicion.map((i) => i.pk))
    const marcados = value.filter((n) => itemsActivos.has(n.criterioId))
    if (marcados.length === 0) return null
    return {
      pkTactividadEstudiante,
      fecha,
      tipo: "LISTA_COTEJO",
      itemsMarcados: marcados.map((n) => n.criterioId),
    }
  }
  if (instrumento.instrumento === "ESCALA_VALORACION") {
    if (instrumento.definicion.niveles.length > 0) {
      const nivelId = value[0]?.nivelId
      if (nivelId == null) return null
      return { pkTactividadEstudiante, fecha, tipo: "ESCALA_CUALITATIVA", pkNivel: nivelId }
    }
    const valor = value[0]?.valor
    if (valor == null) return null
    return { pkTactividadEstudiante, fecha, tipo: "VALOR_NUMERICO", valorNumerico: valor }
  }
  if (instrumento.instrumento === "OTRO") {
    const valor = value[0]?.valor
    if (valor == null) return null
    return { pkTactividadEstudiante, fecha, tipo: "VALOR_NUMERICO", valorNumerico: valor }
  }
  return null
}

/**
 * Popover de calificación anclado a UNA celda (estudiante × actividad).
 * Autocontenido: precarga la nota ya guardada del estudiante
 * (`GET .../nota`), arma el form según el instrumento real de la actividad
 * (`InstrumentoGradingFields`) y al guardar pega directo contra
 * `PUT .../calificar` — no depende de estado del padre, así que
 * `PlanillaGrid` no necesita mantener overrides locales.
 */
export function CeldaNotaPopover({
  actividadId,
  pkTactividadEstudiante,
  fecha,
  estudianteNombre,
}: CeldaNotaPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NotaCriterio[]>([])
  const { notify } = useNotify()

  const { data: instrumento } = useInstrumentoActividadQuery(actividadId)
  const { data: notaActual } = useNotaEstudianteQuery(open ? pkTactividadEstudiante : undefined)

  useEffect(() => {
    if (open) setDraft(notaActual?.notas ?? [])
  }, [open, notaActual])

  const calificar = useCalificarCeldaMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Nota guardada.")
        setOpen(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const completitud = instrumentoCompletitud(instrumento, draft)

  function guardar() {
    if (!instrumento) return
    const input = buildCalificarCeldaInput(instrumento, draft, pkTactividadEstudiante, fecha)
    if (!input) return
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
          <PencilIcon className="size-3.5" />
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
            disabled={!completitud.completo || calificar.isPending}
            onClick={guardar}
          >
            {calificar.isPending ? (
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
