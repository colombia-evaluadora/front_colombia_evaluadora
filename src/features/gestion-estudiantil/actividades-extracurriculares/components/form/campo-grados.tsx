import { useMemo } from "react"

import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

interface Props {
  id: string
  opciones: Opcion[]
  value: number[]
  disabled?: boolean
  placeholder: string
  ayuda?: string
  error?: string
  onChange: (grados: number[]) => void
}

/** Grados* (multiselección): los de la Sede y Jornada elegidas; en Servicio social, solo los del servicio social. */
export function CampoGrados({ id, opciones, value, disabled, placeholder, ayuda, error, onChange }: Props) {
  const nombres = useMemo(() => new Map(opciones.map((o) => [Number(o.value), o.label])), [opciones])
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>Grados*</FieldLabel>
      <ComboboxField<number, true> multiple disabled={disabled} value={value} onValueChange={(v) => onChange(v ?? [])}>
        <ComboboxFieldTrigger id={id} className="w-full" aria-invalid={Boolean(error) || undefined}>
          <ComboboxFieldValue placeholder={placeholder}>
            {(grados: number[]) =>
              grados.length === 0 ? placeholder : grados.map((g) => nombres.get(g) ?? `Grado ${g}`).join(", ")
            }
          </ComboboxFieldValue>
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {opciones.map((o) => (
            <ComboboxFieldItem key={o.value} value={Number(o.value)}>
              {o.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      {error ? <FieldError>{error}</FieldError> : ayuda ? <FieldDescription>{ayuda}</FieldDescription> : null}
    </Field>
  )
}
