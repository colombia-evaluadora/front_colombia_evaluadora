import { useId } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
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
  EyeIcon,
  RemoveCircleOutlineIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { fetchAsistenciaBloquesProgramados } from "@/features/academic-management/asistencia/api/query/use-asistencia-bloques-programados-query"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
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

export function CalificacionesView({ actividad }: CalificacionesViewProps) {
  const { data: calificaciones = [], isPending, isError, refetch } =
    useCalificacionesQuery(actividad.id, actividad.fechaInicio)
  const queryClient = useQueryClient()
  const { notify } = useNotify()
  const formativa = esActividadFormativa(actividad)
  const registrarAsistencia = useAsistenciaRegistrarMutation()
  const actividadSinComenzar = actividad.fechaInicio > todayDateOnly()

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
            <th className="w-96 px-4 py-3 text-left font-semibold uppercase">Nombres</th>
            <th className="w-72 px-4 py-3 text-left">
              <span className="block font-semibold uppercase">Asistencia</span>
              <span className="text-muted-foreground text-xs font-normal">
                Fecha: {formatDate(actividad.fechaInicio)}
              </span>
            </th>
            <th
              className={cn(
                "px-4 py-3 font-semibold uppercase",
                formativa ? "text-left" : "text-center",
              )}
            >
              {formativa ? "Observación" : "Valoración"}
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
  const sinNota = estudiante.notaHomologada == null && porcentaje === null
  const mostrarJustificacion =
    estudiante.asistencia.estado === "llego-tarde" ||
    estudiante.asistencia.estado === "no-asistio"
  const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim()

  return (
    <tr className="transition-colors">
      <td className="truncate px-4 py-1.5 align-middle font-medium" title={nombreCompleto}>
        {nombreCompleto}
      </td>
      <td className="w-72 max-w-72 px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <AsistenciaSelect
            estado={estudiante.asistencia.estado}
            // Regla 73: el Resultado solo se pre-llena Justificada/No
            // justificada para "No Asistió" -- "Llegó Tarde" nunca cambia el
            // Resultado aunque tenga Excusa, así que no se etiqueta.
            justificada={
              estudiante.asistencia.estado === "no-asistio" ? estudiante.asistencia.justificada : undefined
            }
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
            <ExcusaField
              adjuntos={estudiante.asistencia.adjuntos}
              fkSoporteArchivo={estudiante.asistencia.fkSoporteArchivo}
            />
          )}
        </div>
      </td>
      <td className="px-4 py-1.5 align-middle">
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            !formativa && "justify-center",
          )}
        >
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
          ) : null}
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
          ) : null}
          {!formativa && (
            <DialogCalificarActividad
              actividadId={actividad.id}
              actividadNombre={actividad.nombre}
              asignatura={actividad.asignatura}
              gradoId={actividad.gradoId}
              pkTactividadEstudiante={estudiante.id}
              estudianteNombre={nombreCompleto}
              sinNota={sinNota}
              fecha={estudiante.fechaAsistencia ?? actividad.fechaInicio}
              onGuardado={onGuardado}
            />
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
  justificada,
  onChange,
  guardando,
  actividadSinComenzar,
}: {
  estado: EstadoAsistencia
  /** Regla 73: solo aplica para "no-asistio" -- viene de la excusa cargada
   *  en Asistencia, acá solo se muestra. */
  justificada?: boolean
  onChange?: (tipo: TipoAsistencia) => void
  guardando?: boolean
  actividadSinComenzar?: boolean
}) {
  const id = useId()
  const campo = (
    <Field variant="outlined" className="min-w-0 flex-1">
      <FieldLabel htmlFor={id}>Asistencia</FieldLabel>
      <Select
        value={estado}
        onValueChange={(next) => {
          const tipo = next ? ESTADO_A_TIPO[next as EstadoAsistencia] : undefined
          if (tipo != null) onChange?.(tipo)
        }}
        disabled={!onChange || guardando}
      >
        <SelectTrigger id={id} className="min-w-0">
          <SelectValue>
            {(value) => {
              const opt = ASISTENCIA_OPTIONS.find((o) => o.value === value)
              if (!opt) return null
              const label =
                estado === "no-asistio" && justificada != null
                  ? `${opt.label} — ${justificada ? "Justificada" : "No justificada"}`
                  : opt.label
              return (
                <span className="flex min-w-0 items-center gap-2" title={label}>
                  {guardando ? (
                    <SpinnerIcon className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <opt.Icon className={cn("size-4 shrink-0", opt.iconClass)} />
                  )}
                  <span className="truncate">{label}</span>
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

/**
 * Excusa de una inasistencia/tardanza (Regla 74, sección Asistencia): al
 * adjuntar el soporte, `onAdjuntar` reenvía el mismo tipo de asistencia pero
 * en su variante "justificada" (Regla 73 -- 2→3, 5→6), para que el Resultado
 * se pre-llene como Justificada en vez de No justificada.
 */
function VerExcusaButton({ fkSoporteArchivo }: { fkSoporteArchivo: number }) {
  const { data: url, isPending } = useArchivoViewUrl(fkSoporteArchivo)

  return (
    <button
      type="button"
      aria-label="Ver excusa"
      title="Ver excusa"
      disabled={!url || isPending}
      className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
    >
      <EyeIcon className="size-3.5 shrink-0" />
    </button>
  )
}

function ExcusaField({
  adjuntos,
  fkSoporteArchivo,
}: {
  adjuntos: number
  fkSoporteArchivo?: number | null
}) {
  if (adjuntos <= 0 || fkSoporteArchivo == null) return null
  return (
    <div className="flex shrink-0 items-center">
      <VerExcusaButton fkSoporteArchivo={fkSoporteArchivo} />
    </div>
  )
}
