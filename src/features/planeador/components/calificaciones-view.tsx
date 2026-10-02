import { useId, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"

import {
  type AsistenciaActividadInput,
  useAsistenciaActividadMutation,
} from "@/features/planeador/api/mutations/use-asistencia-actividad"
import { useEstadoResultadoMutation } from "@/features/planeador/api/mutations/use-estado-resultado"
import { calificacionesQueryKey, useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { CalificacionEstudiante, EstadoAsistencia } from "@/features/planeador/api/types/calificacion"
import { bloqueoCalificar, itemsPonderables, porcentajeFinal } from "@/features/planeador/api/types/calificacion"
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
  const actividadSinComenzar = actividad.fechaInicio > todayDateOnly()
  const [guardandoId, setGuardandoId] = useState<number | null>(null)
  const marcarAsistencia = useAsistenciaActividadMutation()

  /** Asistencia de UN estudiante en esta actividad (Regla 73): no toca la
   *  Vista Asistencias. La excusa se adjunta allá; acá solo se refleja. */
  async function guardarAsistencia(pkTactividadEstudiante: number, tipo: AsistenciaActividadInput["tipo"]) {
    if (actividadSinComenzar) return
    setGuardandoId(pkTactividadEstudiante)
    try {
      await marcarAsistencia.mutateAsync({ pkTactividadEstudiante, tipo })
      // Se espera la recarga para que el select ya muestre el valor nuevo.
      await queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(actividad.id) })
      notify("Asistencia registrada.")
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setGuardandoId(null)
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
    <div className="border-input scrollbar-slim overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1100px] table-fixed text-sm">
        <thead className="bg-muted/10 border-b">
          <tr>
            <th className="w-96 px-4 py-3 text-left font-semibold uppercase">Nombres</th>
            <th className="w-96 px-4 py-3 text-left">
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
              guardandoAsistencia={guardandoId === estudiante.id}
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
  onGuardarAsistencia: (pkTactividadEstudiante: number, tipo: AsistenciaActividadInput["tipo"]) => void
  guardandoAsistencia: boolean
  actividadSinComenzar: boolean
}

function CalificacionRow({
  actividad,
  formativa,
  estudiante,
  onGuardado,
  onGuardarAsistencia,
  guardandoAsistencia,
  actividadSinComenzar,
}: CalificacionRowProps) {
  const porcentaje =
    estudiante.calificacion ?? porcentajeFinal(estudiante.notas, itemsPonderables(actividad))
  const sinNota = estudiante.notaHomologada == null && porcentaje === null
  const mostrarJustificacion =
    estudiante.asistencia.estado === "llego-tarde" ||
    estudiante.asistencia.estado === "no-asistio"
  const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim()
  // Regla 62: "No presentó" reemplaza a la nota / observación (excluyentes).
  const noPresento = estudiante.noPresento === true
  const noAsistido =
    estudiante.estadoResultado?.startsWith("NO_ASISTIO") === true ||
    (estudiante.asistencia.estado === "no-asistio" && estudiante.estadoResultado !== "CALIFICADO")
  const tieneResultado = formativa ? Boolean(estudiante.observacion?.trim()) : !sinNota
  const bloqueo = bloqueoCalificar(estudiante)
  // Con resultado la asistencia de la actividad queda congelada.
  const asistenciaEditable = estudiante.asistenciaEditable !== false && !tieneResultado

  return (
    <tr className="transition-colors">
      <td className="truncate px-4 py-1.5 align-middle font-medium" title={nombreCompleto}>
        {nombreCompleto}
      </td>
      <td className="w-96 max-w-96 px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <AsistenciaSelect
            estado={estudiante.asistencia.estado}
            // Regla 73: J/NJ sale del estado del resultado (la excusa de la Vista).
            justificada={
              noAsistido ? estudiante.estadoResultado === "NO_ASISTIO_JUSTIFICADA" : undefined
            }
            guardando={guardandoAsistencia}
            actividadSinComenzar={actividadSinComenzar}
            congelada={!asistenciaEditable}
            onChange={
              !actividadSinComenzar && asistenciaEditable
                ? (tipo) => onGuardarAsistencia(estudiante.id, tipo)
                : undefined
            }
          />
          {mostrarJustificacion && (
            <ExcusaField
              adjuntos={estudiante.asistencia.adjuntos}
              fkSoporteArchivo={estudiante.asistencia.fkSoporteArchivo}
            />
          )}
          {!noAsistido && (
            <NoPresentoCheckbox
              actividadId={actividad.id}
              pkTactividadEstudiante={estudiante.id}
              checked={noPresento}
              motivoDeshabilitado={
                actividadSinComenzar
                  ? "Esta actividad todavía no comienza."
                  : estudiante.asistencia.estado === "sin-registrar"
                    ? "Disponible cuando la asistencia esté registrada."
                    : tieneResultado
                      ? "Ya tiene resultado: quite la nota para marcar No presentó."
                      : null
              }
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
              bloqueo={bloqueo}
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
          {/* Sin asistencia, No asistido o No presentó: deshabilitado con el motivo. */}
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
              bloqueo={bloqueo}
            />
          )}
        </div>
      </td>
    </tr>
  )
}

/** Regla 62: el estudiante asistió pero no presentó evidencia. Exige que no
 *  haya nota; desmarcarlo lo deja Pendiente. */
function NoPresentoCheckbox({
  actividadId,
  pkTactividadEstudiante,
  checked,
  motivoDeshabilitado,
}: {
  actividadId: number
  pkTactividadEstudiante: number
  checked: boolean
  motivoDeshabilitado: string | null
}) {
  const id = useId()
  const { notify } = useNotify()
  const mutation = useEstadoResultadoMutation({
    mutationConfig: {
      onSuccess: (_, input) =>
        notify(input.estado === "NO_PRESENTO" ? "Marcado como No presentó." : "Queda pendiente de calificar."),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  // Marcado se puede quitar siempre; sin marcar aplica el motivo.
  const disabled = !checked && motivoDeshabilitado != null

  return (
    <label
      htmlFor={id}
      title={disabled ? (motivoDeshabilitado ?? undefined) : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs",
        disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer",
      )}
    >
      {mutation.isPending ? (
        <SpinnerIcon className="size-4 animate-spin" />
      ) : (
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) =>
            mutation.mutate({
              actividadId,
              pkTactividadEstudiante,
              estado: next === true ? "NO_PRESENTO" : "PENDIENTE",
            })
          }
        />
      )}
      No presentó
    </label>
  )
}

const ESTADO_A_TIPO: Partial<Record<EstadoAsistencia, AsistenciaActividadInput["tipo"]>> = {
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
  congelada,
}: {
  estado: EstadoAsistencia
  /** Regla 73: solo aplica para "no-asistio" -- viene de la excusa cargada
   *  en Asistencia, acá solo se muestra. */
  justificada?: boolean
  onChange?: (tipo: AsistenciaActividadInput["tipo"]) => void
  guardando?: boolean
  actividadSinComenzar?: boolean
  /** Ya hay resultado: la asistencia de la actividad no se puede cambiar. */
  congelada?: boolean
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
                    <SpinnerIcon className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <opt.Icon className={cn("size-4 shrink-0", opt.iconClass)} />
                  )}
                  <span className={cn("truncate", guardando && "text-muted-foreground")}>
                    {guardando ? "Guardando…" : label}
                  </span>
                </span>
              )
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ASISTENCIA_OPTIONS.filter((opt) => opt.value !== "sin-registrar").map((opt) => (
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

  const motivo = actividadSinComenzar
    ? "Esta actividad todavía no comienza: no se puede tomar asistencia."
    : congelada
      ? "Ya tiene resultado: su asistencia en la actividad no se puede cambiar."
      : null
  if (!motivo) return campo

  return (
    <Tooltip>
      {/* Mismo ancho que el select editable (flex-1). */}
      <TooltipTrigger render={<span className="flex min-w-0 flex-1" />}>{campo}</TooltipTrigger>
      <TooltipContent>{motivo}</TooltipContent>
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

/** Abre la excusa (archivo de soporte) cargada en el módulo de Asistencia. */
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

/**
 * Excusa de una inasistencia/tardanza (Regla 73): SOLO LECTURA. La Excusa se
 * adjunta en el módulo de Asistencia (manual/calendario) -- Planeador
 * únicamente refleja ese soporte ya cargado; no ofrece adjuntar, cambiar ni
 * quitar desde acá, para no duplicar el punto de captura que exige el
 * requerimiento.
 */
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
