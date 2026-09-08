import { Button } from "@/components/ui/button"
import { PencilIcon, TrashIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import {
  statusAccentFor,
  statusIconFor,
  statusRingFor,
} from "@/features/planeador/api/ui-mappings"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

import { formatDate } from "@/features/planeador/lib/format-date"

interface UnidadCardProps {
  unidad: UnidadTematica
  selected?: boolean
  onSelect?: () => void
}

const ACCIONES = [
  { label: "Editar", Icon: PencilIcon },
  { label: "Eliminar", Icon: TrashIcon },
] as const

/**
 * Card del listado de unidades temáticas. Espejo de `ActividadCard` —misma
 * barra de status, mismo círculo de trazo, mismos estados de hover y
 * selección— pero con el contenido propio de la unidad: área, cantidad de
 * actividades y el rango de fechas.
 *
 * Se mantiene como componente aparte y no como una `ActividadCard` con props
 * opcionales: los dos modelos no comparten campos más allá del status, y
 * unificarlos obligaría a pasar todo por props genéricas que oscurecen qué
 * dato se está mostrando.
 */
export function UnidadCard({ unidad, selected = false, onSelect }: UnidadCardProps) {
  const StatusIcon = statusIconFor(unidad.status)
  const accent = statusAccentFor(unidad.status)

  return (
    <article
      className={cn(
        "group/unidad relative flex flex-col gap-1 overflow-hidden rounded-sm border bg-card py-3 pr-3 pl-4 transition-colors",
        selected ? "border-primary bg-primary-22" : "hover:bg-muted-22",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", statusRingFor(unidad.status))}
      />

      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
            accent,
          )}
        >
          <StatusIcon className="size-3.5" />
        </span>
        <h3 className="min-w-0 text-xs leading-snug font-bold break-words">
          {unidad.nombre}
        </h3>
      </div>

      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {unidad.area}
      </p>
      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {unidad.totalActividades ?? unidad.actividades.length} Actividades
      </p>
      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {formatDate(unidad.fechaInicio)} - {formatDate(unidad.fechaFin)}
      </p>

      {/* Mismo tratamiento que en la card de actividad: barra flotante abajo a
          la derecha, con el equivalente OPACO del fondo que le toca —los
          tokens `-22` llevan alfa y se compondrían dos veces. */}
      <div
        className={cn(
          "absolute right-1 bottom-1 z-10 flex items-center gap-0 px-0.5 transition-opacity",
          selected
            ? "bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]"
            : "bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))]",
          "pointer-events-none opacity-0",
          "group-hover/unidad:pointer-events-auto group-hover/unidad:opacity-100",
          "group-focus-within/unidad:pointer-events-auto group-focus-within/unidad:opacity-100",
        )}
      >
        {ACCIONES.map(({ label, Icon }) => (
          <Button
            key={label}
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled
            aria-label={label}
            className="size-6"
          >
            <Icon />
          </Button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Ver detalle de ${unidad.nombre}`}
        className="focus-visible:outline-ring absolute inset-0 z-0 rounded-sm focus-visible:outline-2"
      />
    </article>
  )
}
