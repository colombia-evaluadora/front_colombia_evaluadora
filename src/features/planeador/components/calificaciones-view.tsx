import { useId } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckCircleIcon,
  ClockIcon,
  PaperclipIcon,
  RemoveCircleOutlineIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { fetchAsistenciaBloquesProgramados } from "@/features/academic-management/asistencia/api/query/use-asistencia-bloques-programados-query"
import type { TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

import { calificacionesQueryKey, useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { CalificacionEstudiante, EstadoAsistencia } from "@/features/planeador/api/types/calificacion"
import { itemsPonderables, porcentajeFinal } from "@/features/planeador/api/types/calificacion"
import { formatDate, todayDateOnly } from "@/features/planeador/lib/format-date"
import { DialogCalificarActividad } from "@/features/planeador/components/dialogs/dialog-calificar-actividad"
import { CeldaObservacionTrigger } from "@/features/planeador/components/planilla/celda-observacion-trigger"
import { esActividadFormativa } from "@/features/planeador/lib/actividad-formativa"

interface CalificacionesViewProps {
  actividad: Actividad
}

/**
 * Calificaciones de una actividad: tabla con un renglón por estudiante del
 * grupo, asistencia a la fecha de la actividad y nota final. Reemplaza a
 * `DetailSections` en el panel de detalle del Planeador — el viejo
 * read-only se queda en el código por si se quiere volver a mostrar, pero
 * el punto de entrada del panel apunta ahora a esta vista.
 *
 * El "Agregar" en la columna NOTA es solo el placeholder del campo: cuando
 * todavía no se cargó ninguna nota, no hay porcentaje que mostrar. Se
 * prefiere `estudiante.calificacion` (el agregado que ya trae el backend
 * real) sobre recalcularlo con `porcentajeFinal()` a partir de `notas` —
 * esta última sigue siendo el fallback del mock, que no manda ese campo.
 * El lápiz de "Calificar" abre `DialogCalificarActividad`, que sí pega
 * contra el backend real e invalida este listado al guardar.
 */
export function CalificacionesView({ actividad }: CalificacionesViewProps) {
  const { data: calificaciones = [], isPending, isError, refetch } =
    useCalificacionesQuery(actividad.id, actividad.fechaInicio)
  const queryClient = useQueryClient()
  const { notify } = useNotify()
  const formativa = esActividadFormativa(actividad)
  const registrarAsistencia = useAsistenciaRegistrarMutation()
  // Sin la ventana empezada no puede existir una clase que asistir todavía
  // -- el backend la rechaza igual (fn_asistencia_registrar_bulk, V464),
  // pero se corta acá para no dejar clickear el Select y recién ahí fallar.
  const actividadSinComenzar = actividad.fechaInicio > todayDateOnly()

  /** Toma la asistencia de UN estudiante directo desde el Marcar del
   *  Planeador -- mismo endpoint que usa el módulo de Asistencia
   *  (`POST /asistencias/registrar`), por ASIGNATURA (formativa incluida:
   *  desde V436 preescolar también registra por asignatura+bloque, no por
   *  ACTIVIDAD -- esa vía quedó inalcanzable y sus filas no las reconoce el
   *  módulo de Asistencia), contra TODOS los bloques reales de THORARIO ese
   *  día (V481). */
  async function guardarAsistencia(matriculaId: number, tipo: TipoAsistencia) {
    if (actividadSinComenzar) return
    if (!actividad.grupoId) {
      notify("Falta el grupo de la actividad para registrar asistencia.", { variant: "error" })
      return
    }
    if (!actividad.asignaturaId) {
      notify("Falta la asignatura de la actividad para registrar asistencia.", { variant: "error" })
      return
    }
    try {
      const bloques = await fetchAsistenciaBloquesProgramados({
        GRUPO: actividad.grupoId,
        ASIGNATURA: actividad.asignaturaId,
        FECHA: actividad.fechaInicio,
      })
      // Sin clase programada ese día (horario no cargado todavía): se
      // registra suelta, sin bloque, en vez de no registrar nada.
      const bloquesARegistrar = bloques.length > 0 ? bloques : [null]
      await Promise.all(
        bloquesARegistrar.map((bloque) =>
          registrarAsistencia.mutateAsync({
            GRUPO: actividad.grupoId!,
            FECHA: actividad.fechaInicio,
            REGISTROS: [{ fkMatricula: matriculaId, tipoAsistencia: tipo }],
            ASIGNATURA: actividad.asignaturaId!,
            BLOQUE: bloque,
          }),
        ),
      )
      notify("Asistencia registrada.")
      queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(actividad.id) })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  if (isPending) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
        <Spinner /> Cargando calificaciones…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-red text-sm">Ocurrió un error al cargar las calificaciones.</p>
        <Button variant="outline" color="neutral" size="sm" onClick={() => refetch()}>
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
    <div className="border-input overflow-hidden rounded-md border">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-muted/10 border-b">
          <tr>
            <th className="w-80 px-4 py-3 text-left font-semibold uppercase">Nombres</th>
            <th className="w-72 px-4 py-3 text-left">
              <span className="block font-semibold uppercase">Asistencia</span>
              <span className="text-muted-foreground text-xs font-normal">
                Fecha: {formatDate(actividad.fechaInicio)}
              </span>
            </th>
            <th className="px-4 py-3 text-left font-semibold uppercase">
              {formativa ? "Observación" : "Nota"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {calificaciones.map((estudiante) => (
            <CalificacionRow
              key={estudiante.id}
              actividad={actividad}
              formativa={formativa}
              estudiante={estudiante}
              onGuardado={() =>
                queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(actividad.id) })
              }
              onGuardarAsistencia={guardarAsistencia}
              guardandoAsistenciaMatriculaId={
                registrarAsistencia.isPending
                  ? (registrarAsistencia.variables?.REGISTROS?.[0]?.fkMatricula ?? null)
                  : null
              }
              actividadSinComenzar={actividadSinComenzar}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface CalificacionRowProps {
  actividad: Actividad
  /** Referente FORMATIVO: la fila muestra la observación y su popover en vez
   *  de la nota y el diálogo de calificar. */
  formativa: boolean
  estudiante: CalificacionEstudiante
  onGuardado: () => void
  onGuardarAsistencia: (matriculaId: number, tipo: TipoAsistencia) => void
  guardandoAsistenciaMatriculaId: number | null
  actividadSinComenzar: boolean
}

function CalificacionRow({
  actividad,
  formativa,
  estudiante,
  onGuardado,
  onGuardarAsistencia,
  guardandoAsistenciaMatriculaId,
  actividadSinComenzar,
}: CalificacionRowProps) {
  const porcentaje =
    estudiante.calificacion ?? porcentajeFinal(estudiante.notas, itemsPonderables(actividad))
  const mostrarJustificacion =
    estudiante.asistencia.estado === "llego-tarde" ||
    estudiante.asistencia.estado === "no-asistio"
  const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim()

  return (
    <tr className="transition-colors">
      <td className="truncate px-4 py-3 align-middle font-medium" title={nombreCompleto}>
        {nombreCompleto}
      </td>
      <td className="w-72 max-w-72 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AsistenciaSelect
            estado={estudiante.asistencia.estado}
            guardando={
              estudiante.matriculaId != null && guardandoAsistenciaMatriculaId === estudiante.matriculaId
            }
            actividadSinComenzar={actividadSinComenzar}
            onChange={
              estudiante.matriculaId != null && !actividadSinComenzar
                ? (tipo) => onGuardarAsistencia(estudiante.matriculaId!, tipo)
                : undefined
            }
          />
          {mostrarJustificacion && (
            <JustificacionField
              value={estudiante.asistencia.justificacion ?? ""}
              adjuntos={estudiante.asistencia.adjuntos}
            />
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          {formativa ? (
            <CeldaObservacionTrigger
              pkTactividadEstudiante={estudiante.id}
              contexto={actividad.nombre}
              fecha={estudiante.fechaAsistencia ?? null}
              estudianteNombre={nombreCompleto}
              observacionActual={estudiante.observacion ?? null}
              evidenciasActuales={[]}
              actividadSinComenzar={actividad.fechaInicio > todayDateOnly()}
              onGuardado={onGuardado}
            />
          ) : (
            <DialogCalificarActividad
              actividadId={actividad.id}
              actividadNombre={actividad.nombre}
              asignatura={actividad.asignatura}
              gradoId={actividad.gradoId}
              pkTactividadEstudiante={estudiante.id}
              estudianteNombre={nombreCompleto}
              fecha={estudiante.fechaAsistencia ?? actividad.fechaInicio}
              onGuardado={onGuardado}
            />
          )}
          {formativa ? (
            estudiante.observacion?.trim() ? (
              <span
                className="min-w-0 max-w-[77ch] flex-1 truncate text-xs"
                title={estudiante.observacion}
              >
                {estudiante.observacion}
              </span>
            ) : (
              <span className="text-muted-foreground">Agregar observación</span>
            )
          ) : estudiante.notaHomologada != null ? (
            <span className="font-semibold">{estudiante.notaHomologada.toFixed(2)}</span>
          ) : porcentaje !== null ? (
            <span className="font-semibold">{porcentaje}%</span>
          ) : (
            <span className="text-muted-foreground">Agregar</span>
          )}
        </div>
      </td>
    </tr>
  )
}

const ESTADO_A_TIPO: Partial<Record<EstadoAsistencia, TipoAsistencia>> = {
  asistio: 1,
  "llego-tarde": 5,
  "no-asistio": 2,
}

function AsistenciaSelect({
  estado,
  onChange,
  guardando,
  actividadSinComenzar,
}: {
  estado: EstadoAsistencia
  onChange?: (tipo: TipoAsistencia) => void
  guardando?: boolean
  actividadSinComenzar?: boolean
}) {
  const id = useId()
  const campo = (
    <Field variant="outlined" className="min-w-36">
      <FieldLabel htmlFor={id}>Asistencia</FieldLabel>
      <Select
        value={estado}
        onValueChange={(next) => {
          const tipo = next ? ESTADO_A_TIPO[next as EstadoAsistencia] : undefined
          if (tipo != null) onChange?.(tipo)
        }}
        disabled={!onChange || guardando}
      >
        <SelectTrigger id={id}>
          <SelectValue>
            {(value) => {
              const opt = ASISTENCIA_OPTIONS.find((o) => o.value === value)
              if (!opt) return null
              return (
                <span className="flex items-center gap-2">
                  {guardando ? (
                    <SpinnerIcon className="size-4 animate-spin" />
                  ) : (
                    <opt.Icon className={cn("size-4", opt.iconClass)} />
                  )}
                  {opt.label}
                </span>
              )
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* De momento solo Asistió/No asistió: aplicar "Llegó tarde" a
              TODOS los bloques del día no tiene el mismo sentido que a un
              único bloque -- queda pendiente. */}
          {ASISTENCIA_OPTIONS.filter((opt) => opt.value === "asistio" || opt.value === "no-asistio").map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                <opt.Icon className={cn("size-4", opt.iconClass)} />
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )

  if (!actividadSinComenzar) return campo

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex min-w-36" />}>{campo}</TooltipTrigger>
      <TooltipContent>Esta actividad todavía no comienza: no se puede tomar asistencia.</TooltipContent>
    </Tooltip>
  )
}

const ASISTENCIA_OPTIONS = [
  {
    value: "asistio",
    label: "Asistió",
    Icon: CheckCircleIcon,
    iconClass: "text-green",
  },
  {
    value: "llego-tarde",
    label: "Llegó tarde",
    Icon: ClockIcon,
    iconClass: "text-amber",
  },
  {
    value: "no-asistio",
    label: "No asistió",
    Icon: WarningCircleIcon,
    iconClass: "text-red",
  },
  {
    value: "sin-registrar",
    label: "Sin registrar",
    Icon: RemoveCircleOutlineIcon,
    iconClass: "text-muted-foreground",
  },
] as const

function JustificacionField({
  value,
  adjuntos,
}: {
  value: string
  adjuntos: number
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        value={value}
        readOnly
        className="min-w-0 flex-1"
        aria-label="Justificación"
      />
      {adjuntos > 0 && (
        <span className="relative inline-flex shrink-0" aria-label={`${adjuntos} adjunto`}>
          <PaperclipIcon className="size-4 text-muted-foreground" />
          <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold leading-none">
            {adjuntos}
          </span>
        </span>
      )}
    </div>
  )
}
