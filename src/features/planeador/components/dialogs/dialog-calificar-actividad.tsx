import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/notice/notice-context"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"

import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { useNotaEstudianteQuery } from "@/features/planeador/api/query/use-nota-estudiante-query"
import { useCalificarCeldaMutation } from "@/features/planeador/api/mutations/use-calificar-celda"
import { buildCalificarCeldaInput } from "@/features/planeador/components/planilla/celda-nota-popover"
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import type { InstrumentoCriterio } from "@/features/planeador/api/types/planilla"

interface DialogCalificarActividadProps {
  actividadId: number
  actividadNombre: string
  asignatura: string
  pkTactividadEstudiante: number
  estudianteNombre: string
  /** `yyyy-MM-dd` — fecha de la actividad, la que exige el backend al
   *  calificar (mismo criterio que `PlanillaColumna.fechaInicio`). */
  fecha: string
  /** Se ejecuta cuando termina OK el guardado (invalidar el listado que
   *  muestra la nota agregada del estudiante). */
  onGuardado?: () => void
}

/**
 * Diálogo de calificación de UN estudiante en una actividad puntual —
 * versión "de pantalla completa" del popover de la Planilla
 * (`CeldaNotaPopover`), pensada para la vista "Calificaciones: <actividad>"
 * (`CalificacionesView`), donde hay una sola actividad a la vista y espacio
 * de sobra para mostrar la rúbrica desplegada (un bloque por criterio, un
 * radio por nivel con su descripción completa) en vez de un `<Select>`
 * compacto por criterio.
 *
 * Comparte con `CeldaNotaPopover` toda la lógica real de guardado
 * (`buildCalificarCeldaInput`, `useCalificarCeldaMutation`,
 * `instrumentoCompletitud`) — lo único que cambia es la presentación y que
 * vive en un `Dialog` en vez de un `Popover` (acá hay una rúbrica entera
 * que mostrar, no una celda).
 */
export function DialogCalificarActividad({
  actividadId,
  actividadNombre,
  asignatura,
  pkTactividadEstudiante,
  estudianteNombre,
  fecha,
  onGuardado,
}: DialogCalificarActividadProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NotaCriterio[]>([])
  const { notify } = useNotify()

  const { data: instrumento, isPending: isPendingInstrumento } =
    useInstrumentoActividadQuery(actividadId)
  const { data: notaActual } = useNotaEstudianteQuery(open ? pkTactividadEstudiante : undefined)

  useEffect(() => {
    if (open) setDraft(notaActual?.notas ?? [])
  }, [open, notaActual])

  const calificar = useCalificarCeldaMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Nota guardada.")
        setOpen(false)
        onGuardado?.()
      },
      onError: (error) => {
        notify(error.message || "No se pudo guardar la nota.", { variant: "error" })
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-xs"
            aria-label={`Calificar a ${estudianteNombre}`}
          />
        }
      >
        <PencilIcon className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Calificar actividad</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Instrumento: {instrumento?.instrumentoNombre ?? "…"}
          </p>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-3 gap-4 border-y bg-muted/10 px-1 py-3 text-sm">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-semibold uppercase">Nombres</p>
            <p className="truncate font-semibold">{estudianteNombre}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-semibold uppercase">Actividad</p>
            <p className="truncate font-semibold">{actividadNombre}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-semibold uppercase">Asignatura</p>
            <p className="truncate font-semibold">{asignatura}</p>
          </div>
        </div>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto py-3">
          {isPendingInstrumento ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Spinner /> Cargando…
            </div>
          ) : instrumento?.instrumento === "RUBRICA" ? (
            <RubricaExpandida
              criterios={instrumento.definicion}
              value={draft}
              onChange={setDraft}
            />
          ) : (
            <InstrumentoGradingFields actividadId={actividadId} value={draft} onChange={setDraft} />
          )}

          {completitud.mensaje && (
            <p className="text-muted-foreground mt-3 text-xs">{completitud.mensaje}</p>
          )}
        </div>

        <DialogFooter className="shrink-0 sm:justify-end">
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Rúbrica "desplegada": un bloque por criterio con TODOS sus niveles
 * mostrados como radio + etiqueta + puntos + descripción completa, en vez
 * del `<Select>` compacto de `InstrumentoGradingFields` — tiene sentido acá
 * porque el diálogo es de pantalla casi completa y solo muestra UNA
 * actividad a la vez (en la Planilla, con muchas columnas visibles a la
 * vez, el `<Select>` compacto sigue siendo lo que cabe).
 */
function RubricaExpandida({
  criterios,
  value,
  onChange,
}: {
  criterios: InstrumentoCriterio[]
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  if (criterios.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta actividad todavía no tiene criterios de rúbrica definidos.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {criterios.map((criterio) => {
        const actual = value.find((n) => n.criterioId === criterio.pk)
        return (
          <div key={criterio.pk}>
            <h4 className="text-sm font-semibold">
              {criterio.orden}. {criterio.nombre}
            </h4>
            <p className="text-muted-foreground mb-2 text-xs">Seleccione el nivel de desempeño</p>
            {criterio.niveles.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                &ldquo;{criterio.nombre}&rdquo; todavía no tiene niveles definidos.
              </p>
            ) : (
              <RadioGroup
                value={actual?.nivelId != null ? String(actual.nivelId) : undefined}
                onValueChange={(v) => {
                  const nivel = criterio.niveles.find((n) => String(n.pk) === v)
                  if (!nivel) return
                  onChange([
                    ...value.filter((n) => n.criterioId !== criterio.pk),
                    { criterioId: criterio.pk, valor: nivel.ponderacion, nivelId: nivel.pk },
                  ])
                }}
                className="flex flex-col gap-1"
              >
                {criterio.niveles.map((nivel) => (
                  <label
                    key={nivel.pk}
                    className="hover:bg-muted-22 flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-sm"
                  >
                    <RadioGroupItem value={String(nivel.pk)} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold">
                        {nivel.etiqueta} ({nivel.ponderacion} pts.):
                      </span>{" "}
                      {nivel.descripcion}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          </div>
        )
      })}
    </div>
  )
}
