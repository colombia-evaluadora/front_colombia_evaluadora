import { useStore } from "@tanstack/react-form"

import { MarcoOpciones } from "@/components/marco-opciones"
import { Checkbox } from "@/components/ui/checkbox"
import type { SelectOption } from "@/lib/catalog-options"
import { isFieldInvalid, toFieldErrors, useFieldContext, useFormDisabled } from "@/lib/forms"

/**
 * Niveles educativos del área (multi, mínimo uno). Son cuatro: van como
 * casillas a la vista, dentro del recuadro de opciones del proyecto.
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
    <MarcoOpciones
      id="niveles"
      label="Niveles educativos"
      required
      error={invalid ? toFieldErrors(state.meta.errors)[0]?.message : undefined}
      descripcion="Seleccione al menos uno."
    >
      {options.map((option) => {
        const id = `nivel-${option.value}`
        return (
          <label
            key={option.value}
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed has-disabled:opacity-60"
          >
            <Checkbox
              id={id}
              checked={value.includes(option.value)}
              disabled={disabled}
              aria-invalid={invalid}
              onCheckedChange={(next) => toggle(option.value, next === true)}
            />
            {option.label}
          </label>
        )
      })}
    </MarcoOpciones>
  )
}
