import { useId } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  PaperclipIcon,
  WarningCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type {
  CalificacionEstudiante,
  EstadoAsistencia,
} from "@/features/planeador/api/types/calificacion"
import { porcentajeFinal } from "@/features/planeador/api/types/calificacion"
import { formatDate } from "@/features/planeador/lib/format-date"

interface CalificacionesViewProps {
  actividad: Actividad
}

/**
 * Calificaciones de una actividad: tabla con un renglón por estudiante del
 * grupo, asistencia a la fecha de la actividad y nota final calculada a
 * partir de los criterios de la rúbrica. Reemplaza a `DetailSections` en el
 * panel de detalle del Planeador — el viejo read-only se queda en el código
 * por si se quiere volver a mostrar, pero el punto de entrada del panel
 * apunta ahora a esta vista.
 *
 * El "Agregar" en la columna NOTA es solo el placeholder del campo:
 * cuando todavía no se cargó ninguna nota, no hay porcentaje que mostrar.
 * El porcentaje se calcula con `porcentajeFinal()` —suma ponderada contra
 * los criterios efectivamente calificados, no contra el total— y se ve al
 * lado del nombre del estudiante en la columna, en vez de estar en la
 * cabecera como "nota de la sección".
 */
export function CalificacionesView({ actividad }: CalificacionesViewProps) {
  const { data: calificaciones = [], isPending, isError, refetch } =
    useCalificacionesQuery(actividad.id)

  const criterios = actividad.rubrica.criterios

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
            <th className="px-4 py-3 text-left font-semibold uppercase">Nota</th>
            <th className="w-12 px-2 py-3" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {calificaciones.map((estudiante) => (
            <CalificacionRow
              key={estudiante.id}
              estudiante={estudiante}
              criterios={criterios}
              instrumento={actividad.instrumento}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface CalificacionRowProps {
  estudiante: CalificacionEstudiante
  criterios: Actividad["rubrica"]["criterios"]
  instrumento: string
}

function CalificacionRow({ estudiante, criterios, instrumento }: CalificacionRowProps) {
  const porcentaje = porcentajeFinal(estudiante.notas, criterios)
  const mostrarJustificacion =
    estudiante.asistencia.estado === "llego-tarde" ||
    estudiante.asistencia.estado === "no-asistio"

  return (
    <tr className="transition-colors">
      <td className="px-4 py-3 align-middle font-medium">
        {estudiante.nombres} {estudiante.apellidos}
      </td>
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
        {porcentaje !== null ? (
          <span className="font-semibold">{porcentaje}%</span>
        ) : (
          <span className="text-muted-foreground">Agregar</span>
        )}
      </td>
      <td className="px-2 py-3 align-middle">
        <InstrumentoPopover instrumento={instrumento} />
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
      <Select value={estado} onValueChange={() => {}}>
        <SelectTrigger id={id}>
          <SelectValue />
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

/**
 * Popover con los datos del instrumento (los mismos campos del mockup
 * original —Diseño y Modalidad—). Se abre desde el sobre azul de cada fila
 * y se queda anclado a su trigger mientras se edita, así no se pierde la
 * referencia de a qué fila corresponde.
 */
function InstrumentoPopover({ instrumento }: { instrumento: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="fill"
            color="primary"
            size="icon-sm"
            aria-label="Ver instrumento"
            className="size-8"
          />
        }
      >
        <EnvelopeIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Instrumento: {instrumento}</PopoverTitle>
        </PopoverHeader>

        <Field variant="outlined">
          <FieldLabel>Diseño</FieldLabel>
          <Select value="excelente" onValueChange={() => {}}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excelente">Excelente</SelectItem>
              <SelectItem value="bueno">Bueno</SelectItem>
              <SelectItem value="aceptable">Aceptable</SelectItem>
              <SelectItem value="bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field variant="outlined">
          <FieldLabel>Modalidad</FieldLabel>
          <Select value="presencial" onValueChange={() => {}}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="hibrida">Híbrida</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center justify-end gap-2">
          <Button variant="fill" color="primary" size="sm">
            <CheckIcon data-icon="inline-start" />
            Guardar
          </Button>
          <Button variant="fill" color="neutral" size="sm">
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}