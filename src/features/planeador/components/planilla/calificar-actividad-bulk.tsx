import { useEffect, useState, type RefObject } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@/components/ui/icons"

import { useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { useCalificarBulkMutation } from "@/features/planeador/api/mutations/use-calificar-bulk"
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
  instrumentoSinBulk,
  notaDe,
  resolverInstrumentoEfectivo,
  criteriosDeEscala,
  escalaEsCualitativa,
} from "@/features/planeador/components/planilla/instrumento-grading-fields"
import { bloqueoCalificar, type NotaCriterio } from "@/features/planeador/api/types/calificacion"
import type { InstrumentoActividad } from "@/features/planeador/api/types/planilla"
import {
  DialogEnviarSolicitud,
  DialogSolicitudEnviada,
} from "@/features/planeador/components/planilla/dialogs-solicitud-periodo-cerrado"

interface FilaEstudiante {
  id: number
  /** `PK_TMATRICULA`: cruza con el listado de calificaciones de la actividad. */
  matriculaId?: number
  nombres: string
  apellidos: string
}

interface CalificarActividadBulkProps {
  actividadId: number
  titulo: string
  /** `yyyy-MM-dd` de la actividad; el backend la exige al calificar. */
  fecha: string
  estudiantes: FilaEstudiante[]
  onVolver: () => void
  /** Estado del botón "Guardar" del header de la página (null = oculto). */
  onEstadoGuardar: (estado: EstadoGuardar | null) => void
  /** La página llama a esta ref al pulsar "Guardar". */
  guardarRef: RefObject<(() => void) | null>
  /** Periodo no Calificable: confirma y avisa que se abrió la solicitud. */
  periodoCerrado?: boolean
}

export interface EstadoGuardar {
  disabled: boolean
  guardando: boolean
}

// Un request por criterio/ítem: el bulk real acepta uno solo. También la usa `CalificacionesAprobacionView`.
export function buildBulkInputs(
  instrumento: InstrumentoActividad,
  value: NotaCriterio[],
  actividadId: number,
  estudianteIds: number[],
  fecha: string,
) {
  const base = { actividadId, estudianteIds, fecha } as const
  // "Otro" con método se califica como su instrumento equivalente.
  const efectivo = resolverInstrumentoEfectivo(instrumento)
  if (efectivo.tipo === "RUBRICA") {
    // Solo criterios activos: el instrumento pudo cambiar desde que se cargó el form.
    const criteriosActivos = new Set(efectivo.definicion.map((c) => c.pk))
    return value
      .filter((n) => n.nivelId != null && criteriosActivos.has(n.criterioId))
      .map((n) => ({
        ...base,
        tipo: "RUBRICA" as const,
        pkCriterio: n.criterioId,
        pkNivel: n.nivelId!,
      }))
  }
  if (efectivo.tipo === "LISTA_COTEJO") {
    const itemsActivos = new Set(efectivo.definicion.map((i) => i.pk))
    return value
      .filter((n) => itemsActivos.has(n.criterioId))
      .map((n) => ({
        ...base,
        tipo: "LISTA_COTEJO" as const,
        pkItem: n.criterioId,
        cumplido: true,
      }))
  }
  if (efectivo.tipo === "ESCALA_VALORACION") {
    const esNumerica = !escalaEsCualitativa(efectivo.definicion)
    const criteriosGenerales = criteriosDeEscala(efectivo.definicion)

    if (criteriosGenerales.length > 1) {
      // Varios criterios generales: un valor por criterio en un solo request.
      const criterios = criteriosGenerales
        .map((_, index) => {
          const n = notaDe(value, index)
          if (esNumerica) {
            return n?.valor != null ? { criterioIndex: index, valorNumerico: n.valor } : null
          }
          return n?.nivelId != null ? { criterioIndex: index, pkNivel: n.nivelId } : null
        })
        .filter((c): c is NonNullable<typeof c> => c != null)
      if (criterios.length < criteriosGenerales.length) return []
      return [{ ...base, tipo: "ESCALA_VALORACION" as const, criterios }]
    }

    if (!esNumerica) {
      const nivelId = value[0]?.nivelId
      if (nivelId == null) return []
      return [{ ...base, tipo: "ESCALA_VALORACION" as const, pkNivel: nivelId }]
    }
    // Escala numérica: va VALOR_NUMERICO en vez de PK_NIVEL.
    const valorNumerico = value[0]?.valor
    if (valorNumerico == null) return []
    return [{ ...base, tipo: "ESCALA_VALORACION" as const, valorNumerico }]
  }
  // "Otro" sin método: sin endpoint de bulk — se califica celda a celda
  // desde el popover.
  return []
}

/** Calificación en bloque de una actividad: un PUT por criterio/ítem contra los estudiantes tildados. */
export function CalificarActividadBulk({
  actividadId,
  titulo,
  fecha,
  estudiantes,
  onVolver,
  onEstadoGuardar,
  guardarRef,
  periodoCerrado = false,
}: CalificarActividadBulkProps) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [nota, setNota] = useState<NotaCriterio[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    () => new Set(estudiantes.map((e) => e.id)),
  )
  const [filtro, setFiltro] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const { notify } = useNotify()

  const { data: instrumento } = useInstrumentoActividadQuery(actividadId)
  const bulkMutation = useCalificarBulkMutation()

  // Sin asistencia, No asistido o No presentó no entran al lote: el backend
  // rechazaría el lote completo.
  const { data: calificaciones } = useCalificacionesQuery(actividadId)
  const bloqueos = (() => {
    const porMatricula = new Map<number, string>()
    for (const c of calificaciones ?? []) {
      const motivo = bloqueoCalificar(c)
      if (motivo && c.matriculaId != null) porMatricula.set(c.matriculaId, motivo)
    }
    return porMatricula
  })()
  const motivoBloqueo = (e: FilaEstudiante) =>
    e.matriculaId != null ? bloqueos.get(e.matriculaId) : undefined
  const bloqueados = new Set(estudiantes.filter((e) => motivoBloqueo(e)).map((e) => e.id))
  const efectivos = [...seleccionados].filter((id) => !bloqueados.has(id))

  const filtrados = (() => {
    const term = filtro.trim().toLowerCase()
    if (!term) return estudiantes
    return estudiantes.filter((e) => `${e.nombres} ${e.apellidos}`.toLowerCase().includes(term))
  })()

  function toggle(id: number) {
    if (bloqueados.has(id)) return
    setDirty(true)
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Tildados entre los filtrados habilitados (para el checkbox de la cabecera).
  const filtradosHabilitados = filtrados.filter((e) => !bloqueados.has(e.id))
  const filtradosTildados = filtradosHabilitados.filter((e) => seleccionados.has(e.id)).length
  const todosTildados = filtradosHabilitados.length > 0 && filtradosTildados === filtradosHabilitados.length

  function toggleTodos() {
    setDirty(true)
    setSeleccionados((prev) => {
      const next = new Set(prev)
      for (const e of filtradosHabilitados) {
        if (todosTildados) next.delete(e.id)
        else next.add(e.id)
      }
      return next
    })
  }

  const completitud = instrumentoCompletitud(instrumento, nota)
  // Por tipo efectivo: "Otro" con método sí tiene bulk (ver `instrumentoSinBulk`).
  const efectivoBulk = resolverInstrumentoEfectivo(instrumento)
  const escalaSinBulk = instrumentoSinBulk(efectivoBulk)

  async function guardar() {
    if (!instrumento || efectivos.length === 0) return
    const inputs = buildBulkInputs(instrumento, nota, actividadId, efectivos, fecha)
    if (inputs.length === 0) return
    setGuardando(true)
    try {
      await Promise.all(inputs.map((input) => bulkMutation.mutateAsync(input)))
      // Regla 55: quien ya tenía nota queda en solicitud; la primera se aplica.
      const matriculas = new Set(
        estudiantes.filter((e) => seleccionados.has(e.id) && !bloqueados.has(e.id)).map((e) => e.matriculaId),
      )
      const conSolicitud =
        periodoCerrado &&
        (calificaciones ?? []).some(
          (c) => matriculas.has(c.matriculaId) && (c.calificacion != null || c.notaHomologada != null),
        )
      if (conSolicitud) {
        // Vuelve a la grilla al cerrar el aviso.
        setEnviada(true)
      } else {
        notify("Calificación en bloque guardada.")
        onVolver()
      }
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setGuardando(false)
      setConfirmando(false)
    }
  }

  // Fase 2: el bloque se encola sin red (piloto + equipo personal).
  const soloEnLinea = useOfflineWritable()
  const deshabilitado = efectivos.length === 0 || !completitud.completo || escalaSinBulk || soloEnLinea.disabled

  // Informa a la página si mostrar "Guardar" (solo con cambios).
  guardarRef.current = periodoCerrado ? () => setConfirmando(true) : guardar
  useEffect(() => {
    onEstadoGuardar(dirty ? { disabled: deshabilitado, guardando } : null)
  }, [dirty, deshabilitado, guardando, onEstadoGuardar])
  useEffect(() => () => onEstadoGuardar(null), [onEstadoGuardar])

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

      <InstrumentoGradingFields
        actividadId={actividadId}
        value={nota}
        onChange={(next) => {
          setDirty(true)
          setNota(next)
        }}
      />

      {escalaSinBulk && (
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
        <li className="bg-card sticky top-0 flex items-center gap-3 border-b px-4 py-3">
          <Checkbox
            checked={todosTildados}
            indeterminate={filtradosTildados > 0 && !todosTildados}
            onCheckedChange={toggleTodos}
            aria-label="Seleccionar todos los estudiantes"
          />
          <span className="text-sm font-semibold">Apellidos y nombres</span>
        </li>
        {filtrados.map((estudiante) => {
          const motivo = motivoBloqueo(estudiante)
          const checked = !motivo && seleccionados.has(estudiante.id)
          return (
            <li
              key={estudiante.id}
              title={motivo}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={checked}
                disabled={Boolean(motivo)}
                onCheckedChange={() => toggle(estudiante.id)}
                aria-label={`Aplicar a ${estudiante.nombres} ${estudiante.apellidos}`}
              />
              <span className={motivo ? "font-medium uppercase text-muted-foreground" : "font-medium uppercase"}>
                {estudiante.nombres} {estudiante.apellidos}
              </span>
              {motivo && <span className="text-muted-foreground ml-auto text-xs">{motivo}</span>}
            </li>
          )
        })}
      </ul>

      <DialogEnviarSolicitud
        open={confirmando}
        enviando={guardando}
        onEnviar={guardar}
        onCancelar={() => setConfirmando(false)}
      />
      <DialogSolicitudEnviada
        open={enviada}
        onCerrar={() => {
          setEnviada(false)
          onVolver()
        }}
      />
    </div>
  )
}
