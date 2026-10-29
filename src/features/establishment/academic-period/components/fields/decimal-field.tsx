import { useState } from "react"
import type { AnyFieldApi } from "@tanstack/react-form"
import { useSelector } from "@tanstack/react-form"

import { isFieldInvalid, toFieldErrors, useFormDisabled } from "@/lib/forms"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

const decimalFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

// Número con 1 decimal (notas y porcentajes del período). Mientras se escribe
// el texto queda libre; al salir se muestra con coma decimal ("25,0"). Vacío
// guarda NaN, o null con `nullable`.
export function DecimalField({
  field,
  label,
  required,
  disabled: disabledProp,
  description,
  suffix,
  nullable,
}: {
  field: AnyFieldApi
  label: string
  required?: boolean
  disabled?: boolean
  description?: string
  suffix?: string
  nullable?: boolean
}) {
  // Como los campos registrados: también lo deshabilita un FormDisabledProvider.
  const disabled = useFormDisabled() || disabledProp
  const value = field.state.value as number | null
  const [draft, setDraft] = useState<string | null>(null)
  const submissionAttempts = useSelector(field.form.store, (s) => s.submissionAttempts)
  const invalid = isFieldInvalid(field, submissionAttempts)
  const shown =
    draft ?? (value != null && Number.isFinite(value) ? decimalFormatter.format(value) : "")

  return (
    <Field
      variant="outlined"
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required ? <span className="text-red"> *</span> : null}
      </FieldLabel>
      <InputGroup
        className={cn(
          "h-11 rounded-md border border-input px-3 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red",
          // Sin hover cuando no se puede modificar.
          disabled ? "cursor-not-allowed bg-muted/50" : "hover:border-ring",
        )}
      >
        <InputGroupInput
          id={field.name}
          inputMode="decimal"
          placeholder={disabled ? "" : "Agregar"}
          className="px-0"
          value={shown}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const raw = e.target.value.replace(".", ",")
            if (!/^\d{0,3}(,\d?)?$/.test(raw)) return
            setDraft(raw)
            const empty = nullable ? null : Number.NaN
            field.handleChange(raw === "" ? empty : Number(raw.replace(",", ".")))
          }}
          onBlur={() => {
            setDraft(null)
            field.handleBlur()
          }}
        />
        {suffix ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {invalid ? (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}
