import type { ReactNode } from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  TYPING_REASONS,
} from "@/components/ui/combobox"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

interface ComboOpcionesProps {
  id: string
  label: ReactNode
  value: string
  options: Opcion[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** Agrega "Todos" (o el texto dado) como primera opción, con valor vacío. */
  todos?: string | false
  required?: boolean
  error?: string
  /** Ayuda bajo el control; se oculta mientras hay error. */
  description?: ReactNode
  size?: "sm" | "default"
  className?: string
  /** Lo tecleado en el buscador, para combos que consultan al servidor. */
  onInputChange?: (texto: string) => void
}

/** Combobox con búsqueda sobre una lista de opciones; el mismo de los filtros de Seguimiento. */
export function ComboOpciones({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder,
  todos = "Todos",
  required,
  error,
  description,
  size = "sm",
  className,
  onInputChange,
}: ComboOpcionesProps) {
  const items = todos ? [{ value: "", label: todos }, ...options] : options
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className={className ?? "gap-2"}
      data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <ComboboxField
        disabled={disabled}
        items={Object.fromEntries(items.map((i) => [i.value, i.label]))}
        value={value}
        onValueChange={(v) => onChange(v ?? "")}
        // Solo lo tecleado es búsqueda. Al elegir, Base UI reporta el valor elegido (el id) como texto:
        // pasarlo al servidor dejaba la lista reducida a esa opción y no se podía cambiar por otra.
        onInputValueChange={
          onInputChange ? (texto, d) => onInputChange(TYPING_REASONS.has(d.reason) ? texto : "") : undefined
        }
      >
        <ComboboxFieldTrigger id={id} size={size} className="w-full" aria-invalid={Boolean(error) || undefined}>
          <ComboboxFieldValue placeholder={placeholder ?? (todos || "Seleccione")} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {items.map((i) => (
            <ComboboxFieldItem key={i.value} value={i.value}>
              {i.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      {error ? <FieldError>{error}</FieldError> : description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}
