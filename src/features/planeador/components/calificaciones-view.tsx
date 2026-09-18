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
import {
  CheckCircleIcon,
  ClockIcon,
  PaperclipIcon,
  RemoveCircleOutlineIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { calificacionesQueryKey, useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { CalificacionEstudiante, EstadoAsistencia } from "@/features/planeador/api/types/calificacion"
import { itemsPonderables, porcentajeFinal } from "@/features/planeador/api/types/calificacion"
import { formatDate } from "@/features/planeador/lib/format-date"
import { DialogCalificarActividad } from "@/features/planeador/components/dialogs/dialog-calificar-actividad"
import { CeldaObservacionPopover } from "@/features/planeador/components/planilla/celda-observacion-popover"
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
  const formativa = esActividadFormativa(actividad)

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
      <table className="w-full text-sm">
        <thead className="bg-muted/10 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold uppercase">Nombres</th>
            <th className="px-4 py-3 text-left">
              <span className="block font-semibold uppercase">Asistencia</span>
              <span className="text-muted-foreground text-xs font-normal">
                Fecha: {formatDate(actividad.fechaInicio)}
              </span>
            </th>
            <th className="px-4 py-3 text-left font-semibold uppercase">
              {formativa ? "Observación" : "Nota"}
            </th>
            <th className="w-12 px-2 py-3" aria-label="Acciones" />
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
}

function CalificacionRow({ actividad, formativa, estudiante, onGuardado }: CalificacionRowProps) {
  const porcentaje =
    estudiante.calificacion ?? porcentajeFinal(estudiante.notas, itemsPonderables(actividad))
  const mostrarJustificacion =
    estudiante.asistencia.estado === "llego-tarde" ||
    estudiante.asistencia.estado === "no-asistio"
  const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim()

  return (
    <tr className="transition-colors">
      <td className="px-4 py-3 align-middle font-medium">{nombreCompleto}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <AsistenciaSelect estado={estudiante.asistencia.estado} />
          {mostrarJustificacion && (
            <JustificacionField
              value={estudiante.asistencia.justificacion ?? ""}
              adjuntos={estudiante.asistencia.adjuntos}
            />
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        {formativa ? (
          estudiante.observacion?.trim() ? (
            <span className="line-clamp-2 text-xs" title={estudiante.observacion}>
              {estudiante.observacion}
            </span>
          ) : (
            <span className="text-muted-foreground">Observar</span>
          )
        ) : porcentaje !== null ? (
          <span className="font-semibold">{porcentaje}%</span>
        ) : (
          <span className="text-muted-foreground">Agregar</span>
        )}
      </td>
      <td className="px-2 py-3 align-middle">
        {formativa ? (
          <CeldaObservacionPopover
            pkTactividadEstudiante={estudiante.id}
            fecha={estudiante.fechaAsistencia ?? null}
            estudianteNombre={nombreCompleto}
            observacionActual={estudiante.observacion ?? null}
            evidenciasActuales={[]}
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
      </td>
    </tr>
  )
}

/**
 * Select de asistencia envuelto en un `Field` outlined con label flotante.
 * El label "Asistencia" se monta sobre el borde superior y queda anclado
 * aunque el select cambie de valor, igual que en el resto de los campos
 * outlined-floating del design system.
 */
function AsistenciaSelect({ estado }: { estado: EstadoAsistencia }) {
  const id = useId()
  return (
    <Field variant="outlined" className="min-w-36">
      <FieldLabel htmlFor={id}>Asistencia</FieldLabel>
      {/* Refleja lo registrado en Asistencia; no se edita desde acá (la
          asistencia se toma en su propio módulo), de ahí el `disabled`. */}
      <Select value={estado} onValueChange={() => {}} disabled>
        <SelectTrigger id={id}>
          <SelectValue>
            {(value) => {
              const opt = ASISTENCIA_OPTIONS.find((o) => o.value === value)
              if (!opt) return null
              return (
                <span className="flex items-center gap-2">
                  <opt.Icon className={cn("size-4", opt.iconClass)} />
                  {opt.label}
                </span>
              )
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ASISTENCIA_OPTIONS.map((opt) => (
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
  // Caso real confirmado: sin registro de asistencia ese día todavía (se
  // toma en otro módulo) — no es "no asistió", es "todavía no se sabe".
  {
    value: "sin-registrar",
    label: "Sin registrar",
    Icon: RemoveCircleOutlineIcon,
    iconClass: "text-muted-foreground",
  },
] as const

/**
 * Campo de justificación + badge de adjuntos. Aparece solo cuando el
 * estado de asistencia es "llego-tarde" o "no-asistio" — en "asistió" no
 * hay nada que justificar.
 */
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
