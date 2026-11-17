import { createContext, use, useState, type ComponentType, type ReactNode } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FormSectionHeading } from "@/components/form-section-heading"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, InfoIcon, WarningIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { ESTADO_RESERVA_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import type { EstadoReserva } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Piezas comunes del detalle, Asignar grupo y los modales de la reserva.

const TONOS = {
  success: "border-green-stroke bg-green-22 [&>svg]:text-green",
  warning: "border-orange-stroke bg-orange-22 [&>svg]:text-orange",
  info: "border-blue-stroke bg-blue-22 [&>svg]:text-blue",
} as const

const ICONO_TONO: Record<keyof typeof TONOS, ComponentType<{ className?: string }>> = {
  success: InfoIcon,
  warning: WarningIcon,
  info: InfoIcon,
}

/** Recuadro de aviso de los prototipos: informativo, advertencia o éxito. */
export function Aviso({
  tono,
  icon,
  children,
  className,
}: {
  tono: keyof typeof TONOS
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
  className?: string
}) {
  const Icon = icon ?? ICONO_TONO[tono]
  return (
    <div
      className={cn("flex gap-2.5 rounded-md border px-3 py-2.5 text-sm", TONOS[tono], className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

export function EstadoReservaBadge({ estado }: { estado: EstadoReserva }) {
  const ui = ESTADO_RESERVA_UI[estado]
  return (
    <Badge variant="soft" color={ui.color} className="text-xs font-medium tracking-normal">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {ui.label}
    </Badge>
  )
}

// Mismo look que las secciones de Período académico (`academic-period/.../form-section.tsx`).
// Las secciones abiertas por defecto llegan por contexto desde `Secciones`.
const AbiertasContext = createContext<{
  abiertas: string[]
  alternar: (value: string, open: boolean) => void
}>({
  abiertas: [],
  alternar: () => {},
})

/**
 * Sin `onAbiertasChange` cada sección maneja su estado; con él, el padre
 * controla cuáles están abiertas (p. ej. "Ver pendientes" abre una).
 */
export function Secciones({
  abiertas,
  onAbiertasChange,
  children,
}: {
  abiertas: string[]
  onAbiertasChange?: (abiertas: string[]) => void
  children: ReactNode
}) {
  const [propias, setPropias] = useState(abiertas)
  const actuales = onAbiertasChange ? abiertas : propias
  const cambiar = onAbiertasChange ?? setPropias
  const alternar = (value: string, open: boolean) =>
    cambiar(open ? [...actuales, value] : actuales.filter((v) => v !== value))
  return (
    <AbiertasContext value={{ abiertas: actuales, alternar }}>
      <div className="flex flex-col gap-4">{children}</div>
    </AbiertasContext>
  )
}

/** Marca de pendientes junto al título de una sección de formulario. */
export function MarcaPendientes({ pendientes }: { pendientes: number }) {
  return (
    <Badge
      variant="soft"
      color={pendientes ? "orange" : "success"}
      className="text-xs font-medium tracking-normal"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {pendientes ? `${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}` : "Completo"}
    </Badge>
  )
}

export function Seccion({
  value,
  titulo,
  extra,
  tabla,
  children,
}: {
  value: string
  titulo: string
  /** Badge junto al título (p. ej. el estado del traslado). */
  extra?: ReactNode
  /** La tabla llena el cuerpo, sin relleno interno. */
  tabla?: boolean
  children: ReactNode
}) {
  const { abiertas, alternar } = use(AbiertasContext)
  return (
    <Collapsible
      id={`seccion-${value}`}
      open={abiertas.includes(value)}
      onOpenChange={(open) => alternar(value, open)}
      className="group/section overflow-hidden rounded-lg border border-border bg-background"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 bg-table-screen-title px-4 py-3 text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <CaretDownIcon className="size-5 shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[open]/section:rotate-0 motion-reduce:transition-none" />
        <span className="flex items-center gap-3">
          {titulo}
          {extra}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted className="px-4 py-5 data-[closed]:hidden">
        {/* La tabla va dentro del relleno, en su propio recuadro (prototipo). */}
        {tabla ? (
          <div className="overflow-hidden rounded-md border border-border">{children}</div>
        ) : (
          children
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Rejilla de 3 columnas (1 en móvil) de los formularios de los prototipos. */
export function Rejilla({ children, columnas = 3 }: { children: ReactNode; columnas?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-4 gap-y-5",
        columnas === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      {children}
    </div>
  )
}

/** Campo de solo lectura con la etiqueta flotante del resto de formularios. */
export function CampoLectura({
  id,
  label,
  value,
  required,
  description,
}: {
  id: string
  label: string
  value: ReactNode
  required?: boolean
  description?: string
}) {
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-red">*</span>}
      </FieldLabel>
      <Input
        id={id}
        size="sm"
        readOnly
        disabled
        value={value == null || value === "" ? "—" : String(value)}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </Field>
  )
}
/**
 * Las secciones de la matrícula traen su propia card y título; dentro del
 * acordeón se aplana la card y se oculta el título, que ya está en el
 * encabezado de la sección plegable.
 */
export function SeccionMatricula({
  value,
  titulo,
  extra,
  children,
}: {
  value: string
  titulo: string
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <Seccion value={value} titulo={titulo} extra={extra}>
      <div className="[&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:shadow-none [&_[data-slot=card]]:ring-0 [&_[data-slot=card-content]]:px-0 [&_[data-slot=card-content]>h3:first-child]:hidden">
        {children}
      </div>
    </Seccion>
  )
}

/** Sección de formulario sin plegar: la card con título de Matrícula (`MatriculaFormSection`). */
export function SeccionFija({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card className="rounded-md border border-border py-5">
      <CardContent className="grid gap-5">
        <FormSectionHeading>{titulo}</FormSectionHeading>
        {children}
      </CardContent>
    </Card>
  )
}
