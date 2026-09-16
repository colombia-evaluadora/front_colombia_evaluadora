import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ArrowLeftIcon, MagnifyingGlassIcon, SpinnerIcon } from "@/components/ui/icons"

import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { useCalificarBulkMutation } from "@/features/planeador/api/mutations/use-calificar-bulk"
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import type { InstrumentoActividad } from "@/features/planeador/api/types/planilla"

interface FilaEstudiante {
  id: number
  nombres: string
  apellidos: string
}

interface CalificarActividadBulkProps {
  actividadId: number
  titulo: string
  /** `yyyy-MM-dd` — fecha de la actividad (`PlanillaColumna.fechaInicio`),
   *  la que exige el backend real al calificar. */
  fecha: string
  estudiantes: FilaEstudiante[]
  onVolver: () => void
}

/** El bulk real acepta UN criterio/ítem/nivel por request — si el docente
 *  llenó varios criterios de la rúbrica en el form, se dispara un request
 *  por cada uno, todos con la misma lista de estudiantes/fecha (ver nota en
 *  `use-calificar-bulk.ts`). */
function buildBulkInputs(
  instrumento: InstrumentoActividad,
  value: NotaCriterio[],
  actividadId: number,
  estudianteIds: number[],
  fecha: string,
) {
  const base = { actividadId, estudianteIds, fecha } as const
  if (instrumento.instrumento === "RUBRICA") {
    return value
      .filter((n) => n.nivelId != null)
      .map((n) => ({
        ...base,
        tipo: "RUBRICA" as const,
        pkCriterio: n.criterioId,
        pkNivel: n.nivelId!,
      }))
  }
  if (instrumento.instrumento === "LISTA_COTEJO") {
    return value.map((n) => ({
      ...base,
      tipo: "LISTA_COTEJO" as const,
      pkItem: n.criterioId,
      cumplido: true,
    }))
  }
  if (
    instrumento.instrumento === "ESCALA_VALORACION" &&
    instrumento.definicion.niveles.length > 0
  ) {
    const nivelId = value[0]?.nivelId
    if (nivelId == null) return []
    return [{ ...base, tipo: "ESCALA_VALORACION" as const, pkNivel: nivelId }]
  }
  // Escala NUMÉRICA / OTRO: el backend real no admite bulk por nivel para
  // estos dos (400 documentado) — se califica celda a celda desde el popover.
  return []
}

/**
 * Pantalla completa de calificación en bulk para UNA actividad. Autocontenida:
 * arma el form según el instrumento real de la actividad
 * (`InstrumentoGradingFields`) y al guardar dispara un `PUT
 * .../calificar-bulk/<tipo>` por cada criterio/ítem llenado, contra los
 * estudiantes tildados — reemplaza el `PlaneadorPlanillaPage` mientras está
 * abierta, se llega acá desde el botón del header de una columna de la
 * grilla y se vuelve con la flecha.
 */
export function CalificarActividadBulk({
  actividadId,
  titulo,
  fecha,
  estudiantes,
  onVolver,
}: CalificarActividadBulkProps) {
  const [nota, setNota] = useState<NotaCriterio[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    () => new Set(estudiantes.map((e) => e.id)),
  )
  const [filtro, setFiltro] = useState("")
  const [guardando, setGuardando] = useState(false)
  const { notify } = useNotify()

  const { data: instrumento } = useInstrumentoActividadQuery(actividadId)
  const bulkMutation = useCalificarBulkMutation()

  const filtrados = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    if (!term) return estudiantes
    return estudiantes.filter((e) => `${e.nombres} ${e.apellidos}`.toLowerCase().includes(term))
  }, [estudiantes, filtro])

  function toggle(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const completitud = instrumentoCompletitud(instrumento, nota)
  const escalaNumericaOOtro =
    instrumento?.instrumento === "OTRO" ||
    (instrumento?.instrumento === "ESCALA_VALORACION" &&
      instrumento.definicion.niveles.length === 0)

  async function guardar() {
    if (!instrumento || seleccionados.size === 0) return
    const inputs = buildBulkInputs(instrumento, nota, actividadId, [...seleccionados], fecha)
    if (inputs.length === 0) return
    setGuardando(true)
    try {
      await Promise.all(inputs.map((input) => bulkMutation.mutateAsync(input)))
      notify("Calificación en bloque guardada.")
      onVolver()
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 border-b pb-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                onClick={onVolver}
                aria-label="Volver a la planilla"
              />
            }
          >
            <ArrowLeftIcon className="size-6" />
          </TooltipTrigger>
          <TooltipContent>Volver a la planilla</TooltipContent>
        </Tooltip>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Calificaciones: {titulo}</h2>
          <p className="text-muted-foreground text-xs">
            Instrumento: {instrumento?.instrumentoNombre ?? "…"}
          </p>
        </div>
      </div>

      <InstrumentoGradingFields actividadId={actividadId} value={nota} onChange={setNota} />

      {escalaNumericaOOtro && (
        <p className="text-muted-foreground text-xs">
          Este instrumento no admite calificación en bloque — califique estudiante por estudiante
          desde la grilla.
        </p>
      )}

      <Field variant="outlined">
        <FieldLabel>Estudiantes</FieldLabel>
        <div className="relative">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9"
          />
        </div>
      </Field>

      <ul className="border-input flex-1 overflow-y-auto rounded-md border">
        {filtrados.map((estudiante) => {
          const checked = seleccionados.has(estudiante.id)
          return (
            <li
              key={estudiante.id}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(estudiante.id)}
                aria-label={`Aplicar a ${estudiante.nombres} ${estudiante.apellidos}`}
              />
              <span className="font-medium uppercase">
                {estudiante.nombres} {estudiante.apellidos}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
        <p className="text-muted-foreground text-sm">
          {completitud.mensaje ?? "Se aplicará a los estudiantes tildados."}
        </p>
        <Button
          variant="fill"
          color="primary"
          size="sm"
          disabled={
            seleccionados.size === 0 || !completitud.completo || guardando || escalaNumericaOOtro
          }
          onClick={guardar}
        >
          {guardando && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
          Guardar
        </Button>
      </div>
    </div>
  )
}
