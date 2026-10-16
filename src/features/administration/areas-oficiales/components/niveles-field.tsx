import { useStore } from "@tanstack/react-form"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError } from "@/components/ui/field"
import type { SelectOption } from "@/lib/catalog-options"
import { isFieldInvalid, toFieldErrors, useFieldContext, useFormDisabled } from "@/lib/forms"
import { cn } from "@/lib/utils"

/**
 * Niveles educativos del área (multi, mínimo uno). Son cuatro: van como
 * casillas a la vista y no detrás de un selector.
 */
export function NivelesField({ options }: { options: SelectOption<number>[] }) {
  const field = useFieldContext<number[]>()
  const state = useStore(field.store, (s) => s)
  const submissionAttempts = useStore(field.form.store, (s) => s.submissionAttempts)
  const disabled = useFormDisabled()
  const invalid = isFieldInvalid({ state }, submissionAttempts)
  const value = state.value ?? []

  function toggle(id: number, checked: boolean) {
    field.handleChange(checked ? [...value, id] : value.filter((v) => v !== id))
    field.handleBlur()
  }

  return (
    <Field data-invalid={invalid} className="gap-2" aria-labelledby="niveles-label">
      <span id="niveles-label" className="text-sm font-medium">
        Niveles educativos*
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `nivel-${option.value}`
          const checked = value.includes(option.value)
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm",
                checked && "border-primary/40 bg-primary/5",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                aria-invalid={invalid}
                onCheckedChange={(next) => toggle(option.value, next === true)}
              />
              {option.label}
            </label>
          )
        })}
      </div>
      {invalid ? (
        <FieldError errors={toFieldErrors(state.meta.errors)} />
      ) : (
        <FieldDescription>Seleccione al menos uno.</FieldDescription>
      )}
    </Field>
  )
}
