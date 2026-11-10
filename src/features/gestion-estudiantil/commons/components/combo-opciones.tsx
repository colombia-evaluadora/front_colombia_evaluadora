import type { ReactNode } from "react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
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
  size?: "sm" | "default"
  /** Etiqueta en línea a la izquierda del control (filas compactas), en vez de flotante encima. */
  inline?: boolean
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
  size = "sm",
  inline,
  className,
  onInputChange,
}: ComboOpcionesProps) {
  const items = todos ? [{ value: "", label: todos }, ...options] : options
  return (
    <Field
      orientation={inline ? "horizontal" : "vertical"}
      variant={inline ? "plain" : "outlined"}
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
        onInputValueChange={onInputChange ? (texto) => onInputChange(texto) : undefined}
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
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
