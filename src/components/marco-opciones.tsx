import type { ReactNode } from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

interface MarcoOpcionesProps {
  /** Base de los ids: el label queda en `${id}-label` y el grupo lo usa como nombre accesible. */
  id: string
  /** Pregunta del grupo, sobre la línea del recuadro. Sin label (un interruptor suelto) el recuadro va solo. */
  label?: ReactNode
  required?: boolean
  error?: string
  /** Borde y label en rojo sin mensaje propio (el mensaje lo pone otro lugar, p. ej. «Ver pendientes»). */
  invalido?: boolean
  /** Ayuda bajo el recuadro; el error la reemplaza. */
  descripcion?: ReactNode
  className?: string
  /** Clases del recuadro (p. ej. `flex-col items-start` para casillas en columna). */
  contentClassName?: string
  children: ReactNode
}

/**
 * Recuadro de opciones de los formularios: radios, casillas o un interruptor dentro de un marco con el borde de
 * los inputs (40 px de alto mínimo) y el label flotante sobre la línea, como «Modo de la escala» del Planeador.
 * Así las opciones se alinean con los inputs y selects de la misma fila. El radio elegido va relleno en azul.
 */
export function MarcoOpciones({
  id,
  label,
  required,
  error,
  descripcion,
  invalido,
  className,
  contentClassName,
  children,
}: MarcoOpcionesProps) {
  const labelId = `${id}-label`
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className={cn("gap-2", className)}
      role={label ? "group" : undefined}
      aria-labelledby={label ? labelId : undefined}
      data-invalid={Boolean(error) || invalido || undefined}
    >
      {label && (
        <FieldLabel id={labelId}>
          {/* Texto y `*` en un solo hijo (el label flotante separa sus hijos) y el `*` en rojo (§13). */}
          <span>
            {label}
            {required && <span data-required-mark="">*</span>}
          </span>
        </FieldLabel>
      )}
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-x-6 gap-y-2 rounded-sm border border-input px-3 py-2 text-sm",
          "group-data-[invalid=true]/field:border-red",
          // Radio elegido relleno (como en el ejemplo del Planeador), solo dentro del recuadro.
          "[&_[data-slot=radio-group-item][data-checked]]:bg-primary",
          // El grupo de radios trae `grid w-full gap-3`: adentro del recuadro las opciones van en línea.
          "[&_[data-slot=radio-group]]:flex [&_[data-slot=radio-group]]:w-auto [&_[data-slot=radio-group]]:flex-wrap [&_[data-slot=radio-group]]:items-center [&_[data-slot=radio-group]]:gap-x-6 [&_[data-slot=radio-group]]:gap-y-2",
          label && "pt-2.5",
          contentClassName,
        )}
      >
        {children}
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : descripcion ? (
        <FieldDescription>{descripcion}</FieldDescription>
      ) : null}
    </Field>
  )
}
