import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { MagnifyingGlassIcon, SpinnerIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  calificacionesQueryKey,
  useCalificacionesQuery,
} from "@/features/planeador/api/query/use-calificaciones-query"
import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { useCalificarBulkMutation } from "@/features/planeador/api/mutations/use-calificar-bulk"
import {
  buildBulkInputs,
} from "@/features/planeador/components/planilla/calificar-actividad-bulk"
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
  resolverInstrumentoEfectivo,
  splitCriteriosGenerales,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"

interface CalificacionesAprobacionViewProps {
  actividad: Actividad
}

/**
 * Vista bulk por estudiante del panel de detalle (clipboard-check "Aprobar"):
 * mismo instrumento real y mismo bulk que `CalificarActividadBulk`
 * (`InstrumentoGradingFields` + `buildBulkInputs` + `useCalificarBulkMutation`),
 * aplicado a los estudiantes tildados en esta lista en vez de a todo el curso.
 *
 * No aplica a actividades formativas (preescolar, sin nota que aprobar) — el
 * panel las filtra antes de mostrar este botón, porque tampoco se hace
 * observación en bloque; la observación individual sigue en "Marcar".
 *
 * La contraparte nota-por-criterio es `CalificacionesView` (chulito "Marcar").
 */
export function CalificacionesAprobacionView({
  actividad,
}: CalificacionesAprobacionViewProps) {
  const { data: calificaciones = [], isPending, isError, refetch } =
    useCalificacionesQuery(actividad.id, actividad.fechaInicio)
  // `actividad.instrumento` es el string libre del form de alta y el detalle
  // real no lo llena (salía vacío) — el instrumento aplicado a la actividad
  // sale del endpoint, igual que en las otras tres vistas de calificación.
  const { data: instrumento, isPending: isPendingInstrumento } = useInstrumentoActividadQuery(
    actividad.id,
  )
  // Sin instrumento no hay nada que calificar (`fn_actividad_nota_calificar`
  // corta con 22023). Es un estado real —una actividad sin unidad— y
  // mostrarle el form de aprobación seria prometerle algo que ningun
  // endpoint acepta.
  const sinSalida = instrumento?.instrumento == null

  const queryClient = useQueryClient()
  const { notify } = useNotify()

  // Set de ids seleccionados. Se inicializan con todos marcados para que el
  // docente "desmarque" a los que deja afuera, no al revés — más rápido en la
  // mayoría de los casos.
  const [seleccionados, setSeleccionados] = useState<Set<number>>(() => {
    if (calificaciones.length === 0) return new Set()
    return new Set(calificaciones.map((c) => c.id))
  })
  // Se re-sincroniza cuando llegan las calificaciones y todavía no se tocó
  // nada (caso "todos" → marcar todos por default).
  const [inicializado, setInicializado] = useState(false)
  if (!inicializado && calificaciones.length > 0) {
    setSeleccionados(new Set(calificaciones.map((c) => c.id)))
    setInicializado(true)
  }

  const [nota, setNota] = useState<NotaCriterio[]>([])
  const [filtro, setFiltro] = useState("")
  const [dirty, setDirty] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const filtrados = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    if (!term) return calificaciones
    return calificaciones.filter((c) =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(term),
    )
  }, [calificaciones, filtro])

  const toggle = (id: number) => {
    setDirty(true)
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const calificarBulk = useCalificarBulkMutation()
  const completitud = instrumentoCompletitud(instrumento, nota)
  // Numérica (sin niveles) o con 2+ criterios generales (V472, un valor
  // por criterio): ninguna de las dos tiene bulk propio todavía
  // (`calificar-bulk/escala` solo aplica UN nivel a varios estudiantes) —
  // mismo criterio que `CalificarActividadBulk`. Sin este chequeo,
  // `completitud.completo` daba `true` apenas se llenaban los campos (son
  // válidos, uno por uno) y el botón "Guardar" quedaba habilitado aunque
  // `buildBulkInputs` fuera a devolver `[]` — clic sin ningún efecto ni
  // aviso, confirmado en vivo con una escala de 2 criterios.
  // Por tipo EFECTIVO (resuelve "Otro" con método al instrumento
  // equivalente) — un "Otro" que delega en RUBRICA/LISTA_COTEJO sí tiene
  // bulk; solo VALOR_NUMERICO (escala numérica u "Otro" sin método) y la
  // escala con 2+ criterios (V472, sin bulk propio todavía) quedan afuera.
  const efectivoBulk = resolverInstrumentoEfectivo(instrumento)
  const escalaSinBulk =
    efectivoBulk.tipo === "VALOR_NUMERICO" ||
    (efectivoBulk.tipo === "ESCALA_VALORACION" &&
      (efectivoBulk.definicion.niveles.length === 0 ||
        splitCriteriosGenerales(efectivoBulk.definicion.criteriosGenerales).length > 1))

  /** Mismo bulk que `CalificarActividadBulk`: un `PUT .../calificar-bulk/<tipo>`
   *  por cada criterio/ítem/nivel llenado, aplicado a los estudiantes tildados. */
  async function guardarCalificacionBulk() {
    if (!instrumento) return
    const inputs = buildBulkInputs(instrumento, nota, actividad.id, [...seleccionados], actividad.fechaInicio)
    if (inputs.length === 0) return
    setGuardando(true)
    try {
      await Promise.all(inputs.map((input) => calificarBulk.mutateAsync(input)))
      // `useCalificarBulkMutation` solo invalida la Planilla
      // (`planillaCalificacionesQueryKeyPrefix`) -- sin esto, la propia
      // tabla de este panel y la de "Marcar" (misma query,
      // `calificacionesQueryKey`) seguían mostrando la nota VIEJA hasta un
      // refresh completo. Mismo criterio que ya usa `guardarObservacion`
      // más abajo.
      queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(actividad.id) })
      notify("Calificación en bloque guardada.")
      setDirty(false)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setGuardando(false)
    }
  }

  if (isPending || isPendingInstrumento) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
        <Spinner /> Cargando estudiantes…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-red text-sm">
          Ocurrió un error al cargar los estudiantes.
        </p>
        <Button
          variant="outline"
          color="neutral"
          size="sm"
          onClick={() => refetch()}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (calificaciones.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        Esta actividad todavía no tiene estudiantes asignados.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h4 className="text-base font-semibold">
        Instrumento: {instrumento?.instrumentoNombre ?? actividad.instrumento ?? "Sin definir"}
      </h4>

      {sinSalida && (
        <p className="border-input text-muted-foreground rounded-md border px-4 py-3 text-sm">
          Esta actividad todavía no se puede evaluar: no tiene instrumento, así
          que no hay nota que registrar. Defina un instrumento de evaluación.
        </p>
      )}

      {sinSalida ? null : (
        <InstrumentoGradingFields
          actividadId={actividad.id}
          value={nota}
          onChange={(next) => {
            setDirty(true)
            setNota(next)
          }}
        />
      )}

      {escalaSinBulk && (
        <p className="text-muted-foreground text-xs">
          Este instrumento no admite calificación en bloque — califique estudiante por estudiante
          desde la grilla ("Marcar").
        </p>
      )}

      <Field variant="outlined">
        <FieldLabel>Apellidos y nombres</FieldLabel>
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
          const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim()
          return (
            <li
              key={estudiante.id}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={seleccionados.has(estudiante.id)}
                onCheckedChange={() => toggle(estudiante.id)}
                aria-label={`Aprobar a ${nombreCompleto}`}
              />
              <span className="min-w-0 flex-1 font-medium uppercase">{nombreCompleto}</span>
            </li>
          )
        })}
      </ul>

      {dirty && (
        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
          <p className="text-muted-foreground text-sm">
            {completitud.mensaje ?? "Se aplicará a los estudiantes tildados."}
          </p>
          <Button
            variant="fill"
            color="primary"
            size="sm"
            disabled={seleccionados.size === 0 || !completitud.completo || guardando || escalaSinBulk}
            onClick={guardarCalificacionBulk}
          >
            {guardando && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
