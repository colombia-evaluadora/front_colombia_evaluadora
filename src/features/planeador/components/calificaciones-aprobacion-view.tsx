import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  calificacionesQueryKey,
  useCalificacionesQuery,
} from "@/features/planeador/api/query/use-calificaciones-query"
import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { useNotaEstudianteQuery } from "@/features/planeador/api/query/use-nota-estudiante-query"
import { todayDateOnly } from "@/features/planeador/lib/format-date"
import { useObservarEstudianteMutation } from "@/features/planeador/api/mutations/use-observar-estudiante"
import {
  useAgregarObservacionSoporteMutation,
  useQuitarObservacionSoporteMutation,
} from "@/features/planeador/api/mutations/use-observacion-soporte"
import { useCalificarBulkMutation } from "@/features/planeador/api/mutations/use-calificar-bulk"
import { esActividadFormativa } from "@/features/planeador/lib/actividad-formativa"
import {
  buildBulkInputs,
} from "@/features/planeador/components/planilla/calificar-actividad-bulk"
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import {
  ObservacionEstudianteSheet,
  type EstudianteObservable,
} from "@/features/planeador/components/planilla/observacion-estudiante-sheet"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { CalificacionEstudiante, NotaCriterio } from "@/features/planeador/api/types/calificacion"

interface CalificacionesAprobacionViewProps {
  actividad: Actividad
}

/**
 * Vista bulk por estudiante del panel de detalle (clipboard-check "Aprobar"),
 * con dos caras según el referente de la unidad de la actividad:
 *
 * - **Formativa** (`esActividadFormativa`): no hay nota que aprobar. La tabla toma
 *   la asistencia de la sesión (grupo, actividad, fecha) y abre un panel
 *   lateral por estudiante para escribir SU observación — la asistencia va
 *   primero porque observar la exige.
 * - **Evaluativa**: mismo instrumento real y mismo bulk que `CalificarActividadBulk`
 *   (`InstrumentoGradingFields` + `buildBulkInputs` + `useCalificarBulkMutation`),
 *   aplicado a los estudiantes tildados en esta lista en vez de a todo el curso.
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
  const formativa = esActividadFormativa(actividad)
  // Sin instrumento no hay nada que calificar (`fn_actividad_nota_calificar`
  // corta con 22023) y, al no ser formativa, tampoco se puede observar. Es un
  // estado real —una actividad de preescolar sin unidad— y mostrarle el form
  // de aprobación seria prometerle algo que ningun endpoint acepta.
  const sinSalida = !formativa && instrumento?.instrumento == null
  // Sin la ventana empezada no puede existir asistencia de ningun estudiante
  // -- el sheet lo explica igual (`ObservacionEstudianteSheet`), pero no
  // tiene sentido dejarlo abrir primero para recien ahi avisar.
  const actividadSinComenzar = actividad.fechaInicio > todayDateOnly()

  const queryClient = useQueryClient()
  const { notify } = useNotify()
  const observar = useObservarEstudianteMutation()

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

  // Solo el id: lo que el panel muestra se deriva de la lista viva en cada
  // render. Con una copia del estudiante, tomar asistencia con el panel
  // abierto no lo desbloqueaba — se quedaba con el "sin registrar" de cuando
  // se abrió.
  const [observandoId, setObservandoId] = useState<number | null>(null)
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

  /**
   * `fechaAsistencia` ya es la respuesta del backend a "¿qué fecha aceptaría
   * el gate?" (V442/V443, mismo helper que usa el propio gate): `null`
   * significa que ese día no hay asistencia que habilite observar. No se
   * deduce nada acá — la asistencia se toma en su módulo.
   */
  function aObservable(estudiante: CalificacionEstudiante): EstudianteObservable {
    return {
      id: estudiante.id,
      nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
      observacion: estudiante.observacion ?? null,
      fecha: estudiante.fechaAsistencia ?? null,
    }
  }

  const observando = observandoId != null
    ? (() => {
        const estudiante = calificaciones.find((c) => c.id === observandoId)
        return estudiante ? aObservable(estudiante) : null
      })()
    : null

  // `useCalificacionesQuery` no trae evidencias (GET .../calificaciones no
  // las expone) -- se piden aparte, mismo patrón que `CeldaObservacionTrigger`.
  const { data: notaObservando } = useNotaEstudianteQuery(observandoId ?? undefined)
  const agregarEvidencia = useAgregarObservacionSoporteMutation({
    mutationConfig: { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
  })
  const quitarEvidencia = useQuitarObservacionSoporteMutation({
    mutationConfig: { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
  })
  const calificarBulk = useCalificarBulkMutation()
  const completitud = instrumentoCompletitud(instrumento, nota)

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

  /** Un `PUT .../observar` por estudiante, con SU texto y SU fecha de
   *  asistencia — el gate del backend la exige por estudiante, que es por lo
   *  que no sirve `observar-grupal` (un solo texto para todo el roster). */
  async function guardarObservacion(estudiante: EstudianteObservable, texto: string) {
    if (!estudiante.fecha || !texto.trim()) return

    setGuardando(true)
    try {
      await observar.mutateAsync({
        pkTactividadEstudiante: estudiante.id,
        observacion: texto.trim(),
        fecha: estudiante.fecha,
      })
      queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(actividad.id) })
      notify(`Observación guardada para ${estudiante.nombreCompleto}.`)
      setObservandoId(null)
    } catch (error) {
      // El panel queda abierto con el texto escrito: el motivo más común es
      // falta de asistencia, y cerrarlo obligaría a reescribir todo.
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
        {formativa
          ? "Actividad formativa"
          : `Instrumento: ${instrumento?.instrumentoNombre ?? actividad.instrumento ?? "Sin definir"}`}
      </h4>

      {sinSalida && (
        <p className="border-input text-muted-foreground rounded-md border px-4 py-3 text-sm">
          Esta actividad todavía no se puede evaluar: no tiene instrumento, así
          que no hay nota que registrar, y tampoco cuelga de una unidad, que es
          lo que la haría formativa para registrar una observación. Asígnele una
          unidad con referente formativo, o defina un instrumento de evaluación.
        </p>
      )}

      {formativa || sinSalida ? null : (
        <InstrumentoGradingFields
          actividadId={actividad.id}
          value={nota}
          onChange={(next) => {
            setDirty(true)
            setNota(next)
          }}
        />
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

      {/* Formativa: misma tabla que la observación cualitativa de Informes
          (`ObservacionesTable`) — vista previa en una línea y el panel
          lateral para escribir. Con instrumento sigue la lista de tildar. */}
      {formativa ? (
        <div className="border-input flex-1 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/10 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold uppercase">
                  Apellidos y nombres
                </th>
                <th className="px-3 py-3 text-left font-semibold uppercase">
                  Observación
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filtrados.map((estudiante) => {
                const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim()
                const observacion = estudiante.observacion?.trim()
                return (
                  <tr key={estudiante.id}>
                    <td className="px-4 py-3 align-top font-medium whitespace-nowrap uppercase">
                      {nombreCompleto}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                color={observacion ? "primary" : "neutral"}
                                size="icon-xs"
                                className="shrink-0"
                                disabled={actividadSinComenzar}
                                aria-label={
                                  observacion
                                    ? `Ver observación de ${nombreCompleto}`
                                    : `Agregar observación de ${nombreCompleto}`
                                }
                                onClick={() => setObservandoId(estudiante.id)}
                              />
                            }
                          >
                            {observacion ? <EyeIcon /> : <PlusIcon />}
                          </TooltipTrigger>
                          <TooltipContent>
                            {actividadSinComenzar
                              ? "Esta actividad todavía no comienza."
                              : observacion
                                ? "Ver observación"
                                : "Sin observación"}
                          </TooltipContent>
                        </Tooltip>
                        <button
                          type="button"
                          disabled={actividadSinComenzar}
                          className="min-w-0 flex-1 truncate text-left hover:underline disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => setObservandoId(estudiante.id)}
                          title={observacion}
                        >
                          {observacion ? (
                            <span className="text-foreground">{observacion}</span>
                          ) : (
                            <span className="text-muted-foreground">Sin observación</span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
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
      )}

      <ObservacionEstudianteSheet
        estudiante={observando}
        contexto={actividad.nombre}
        evidencias={notaObservando?.evidencias ?? []}
        actividadSinComenzar={actividadSinComenzar}
        guardando={guardando}
        onOpenChange={(open) => {
          if (!open) setObservandoId(null)
        }}
        onGuardar={guardarObservacion}
        onAgregarEvidencia={(archivo) => {
          if (observandoId == null || !observando?.fecha) return
          agregarEvidencia.mutate({ pkTactividadEstudiante: observandoId, archivo, fecha: observando.fecha })
        }}
        agregandoEvidencia={agregarEvidencia.isPending}
        onQuitarEvidencia={(evidencia) => {
          if (observandoId == null || !observando?.fecha) return
          quitarEvidencia.mutate({
            pkTactividadSoporte: evidencia.pk,
            pkTactividadEstudiante: observandoId,
            fecha: observando.fecha,
          })
        }}
        quitandoEvidenciaPk={
          quitarEvidencia.isPending ? (quitarEvidencia.variables?.pkTactividadSoporte ?? null) : null
        }
      />

      {formativa ? null : (
        dirty && (
          <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
            <p className="text-muted-foreground text-sm">
              {completitud.mensaje ?? "Se aplicará a los estudiantes tildados."}
            </p>
            <Button
              variant="fill"
              color="primary"
              size="sm"
              disabled={seleccionados.size === 0 || !completitud.completo || guardando}
              onClick={guardarCalificacionBulk}
            >
              {guardando && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
              Guardar
            </Button>
          </div>
        )
      )}
    </div>
  )
}
