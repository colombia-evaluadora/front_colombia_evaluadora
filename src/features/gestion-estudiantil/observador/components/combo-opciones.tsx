import type { ReactNode } from "react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"

import type { Opcion } from "@/features/gestion-estudiantil/observador/api/use-opciones-observador"

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
}: ComboOpcionesProps) {
  const items = todos ? [{ value: "", label: todos }, ...options] : options
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <ComboboxField
        disabled={disabled}
        items={Object.fromEntries(items.map((i) => [i.value, i.label]))}
        value={value}
        onValueChange={(v) => onChange(v ?? "")}
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
