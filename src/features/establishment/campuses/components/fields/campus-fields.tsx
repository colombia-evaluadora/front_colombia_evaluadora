import type { ReactNode } from "react"
import { useStore } from "@tanstack/react-form"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { WarningIcon } from "@/components/ui/icons"
import { isFieldInvalid, toFieldErrors, useFieldContext, useFormDisabled } from "@/lib/forms"

import { CampusAreaMap, CampusLocationMap } from "@/features/establishment/campuses/components/map/campus-maps"
import { formatLocation, parseLocation, type InfluenceArea } from "@/features/establishment/campuses/lib/geo"

/** Estado del campo actual, como los campos registrados de `@/lib/forms`. */
function useCampusField<TValue>(disabledProp?: boolean) {
  const field = useFieldContext<TValue>()
  const state = useStore(field.store, (s) => s)
  const submissionAttempts = useStore(field.form.store, (s) => s.submissionAttempts)
  const formDisabled = useFormDisabled()
  return {
    field,
    value: state.value as TValue,
    invalid: isFieldInvalid({ state }, submissionAttempts),
    errors: toFieldErrors(state.meta.errors),
    disabled: Boolean(disabledProp) || formDisabled,
  }
}

interface ChoiceOption {
  id: number
  name: string
}

/** Zona con radios: son dos opciones y se leen de un vistazo. Las da el establecimiento (Regla 21). */
export function ZoneRadioField({
  label,
  options,
  disabled: disabledProp,
  description,
}: {
  label: string
  options: ChoiceOption[]
  disabled?: boolean
  description?: ReactNode
}) {
  const { field, value, invalid, errors, disabled } = useCampusField<number | null>(disabledProp)
  const labelId = `${field.name}-label`
  return (
    <Field orientation="vertical" data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel id={labelId} className="normal-case tracking-normal">{label}*</FieldLabel>
      <RadioGroup
        aria-labelledby={labelId}
        value={value != null ? String(value) : ""}
        disabled={disabled}
        onValueChange={(next) => {
          field.handleChange(next ? Number(next) : null)
          field.handleBlur()
        }}
        className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1"
      >
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={String(option.id)} aria-invalid={invalid} />
            {option.name}
          </label>
        ))}
      </RadioGroup>
      {invalid ? <FieldError errors={errors} /> : description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

/**
 * Ubicación de la sede (Regla 89): el punto del mapa, que se ubica con la
 * dirección o se marca a mano. Sin punto se ve el aviso de ubicación pendiente
 * (Regla 85), que no bloquea nada.
 */
export function LocationField({
  label,
  required = false,
  onLocate,
  locating,
  recenterVersion,
  message,
}: {
  label: string
  required?: boolean
  onLocate?: () => void
  locating?: boolean
  recenterVersion?: number
  /** Resultado de "Ubicar con la dirección" (qué tan cerca quedó, o que no se encontró). */
  message?: string | null
}) {
  const { field, value, invalid, errors, disabled } = useCampusField<string>()
  const location = parseLocation(value)
  return (
    <Field orientation="vertical" data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel className="normal-case tracking-normal">
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <CampusLocationMap
        value={location}
        onChange={(next) => {
          field.handleChange(formatLocation(next))
          field.handleBlur()
        }}
        onLocate={onLocate}
        locating={locating}
        disabled={disabled}
        recenterVersion={recenterVersion}
      />
      {!location && !invalid ? (
        <p className="flex items-start gap-2 rounded-md border border-yellow-stroke bg-yellow-22 px-3 py-2 text-xs">
          <WarningIcon aria-hidden className="mt-px size-4 shrink-0 text-yellow" />
          Ubicación pendiente. Geolocalice la sede desde su dirección o márquela en el mapa.
        </p>
      ) : null}
      {invalid ? <FieldError errors={errors} /> : message ? <FieldDescription>{message}</FieldDescription> : null}
    </Field>
  )
}

/** Área de influencia (Regla 89): polígono opcional, sin cruces. */
export function InfluenceAreaField({ label, location }: { label: string; location: string }) {
  const { field, value, invalid, errors, disabled } = useCampusField<InfluenceArea | null>()
  return (
    <Field orientation="vertical" data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel className="normal-case tracking-normal">{label}</FieldLabel>
      <CampusAreaMap
        value={value ?? null}
        onChange={(next) => {
          field.handleChange(next)
          field.handleBlur()
        }}
        location={parseLocation(location)}
        disabled={disabled}
      />
      {invalid ? <FieldError errors={errors} /> : null}
    </Field>
  )
}

/** Jornadas que ofrece la sede (Regla 84): al menos una. */
export function WorkSchedulesField({ label, options }: { label: string; options: ChoiceOption[] }) {
  const { field, value, invalid, errors, disabled } = useCampusField<number[]>()
  const selected = new Set(value ?? [])

  function toggle(id: number, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    // En el orden del catálogo, para que el valor no dependa del orden de los clics.
    field.handleChange(options.filter((option) => next.has(option.id)).map((option) => option.id))
    field.handleBlur()
  }

  return (
    <Field orientation="vertical" data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel id={`${field.name}-label`} className="normal-case tracking-normal">{label}*</FieldLabel>
      <div role="group" aria-labelledby={`${field.name}-label`} className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => {
          const id = `${field.name}-${option.id}`
          return (
            <label key={option.id} htmlFor={id} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={id}
                checked={selected.has(option.id)}
                disabled={disabled}
                aria-invalid={invalid}
                onCheckedChange={(checked) => toggle(option.id, checked === true)}
              />
              {option.name}
            </label>
          )
        })}
      </div>
      {invalid ? <FieldError errors={errors} /> : null}
    </Field>
  )
}
