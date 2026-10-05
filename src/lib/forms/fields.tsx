import type { ReactNode } from "react"
import { useStore } from "@tanstack/react-form"

import { cn } from "@/lib/utils"
import { toDigitsOnly } from "@/lib/text-input"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import {
  formatDateTimeValue,
  formatDateValue as formatNullableDateValue,
  parseDateTimeValue,
  parseDateValue as parseNullableDateValue,
} from "@/lib/date-time-value"
import { toSelectItemsMap, type SelectOption } from "@/lib/catalog-options"
import { useFieldContext } from "@/lib/forms/form-context"
import { useFormDisabled } from "@/lib/forms/form-disabled-context"
import { isFieldInvalid, toFieldErrors } from "@/lib/forms/field-state"

import { CharacterCounter } from "@/components/ui/character-counter"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"

/**
 * Campos registrados en `createFormHook` (ver `index.ts`): se usan como
 * `<form.AppField name="x">{(field) => <field.TextField label="X" required />}</form.AppField>`.
 *
 * Cada uno resuelve lo que antes se copiaba en cada form: `Field` +
 * `FieldLabel` + `FieldError`, `data-invalid`/`aria-invalid` con la regla de
 * `isFieldInvalid`, el `id` (por defecto el nombre del campo) y el
 * `disabled` del `FormDisabledProvider` ancestro.
 */

type FieldVariant = "plain" | "outlined" | "filled" | "standard"

interface BaseFieldProps {
  label: ReactNode
  /** Agrega el `*` de obligatorio al label ("Código*"). */
  required?: boolean
  /** Ayuda bajo el control; se oculta mientras se muestra el error. Un
   *  string va en `FieldDescription`, un nodo se pinta tal cual. */
  description?: ReactNode
  /** Default `outlined` (label flotante), el estándar de los diálogos. */
  variant?: FieldVariant
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * Lee el estado del campo del contexto. Se suscribe explícitamente al store
 * (en vez de leer `field.state` suelto) para no depender de que el padre
 * re-renderice: con el React Compiler activo el render-prop de `AppField`
 * puede quedar memoizado.
 */
function useRegisteredField<TValue>(disabledProp?: boolean) {
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

function FieldFrame({
  label,
  required,
  description,
  variant = "outlined",
  className,
  htmlFor,
  invalid,
  disabled,
  errors,
  footer,
  children,
}: Omit<BaseFieldProps, "id"> & {
  htmlFor: string
  invalid: boolean
  errors: Array<{ message?: string }>
  /** Va siempre (con o sin error), p. ej. el contador de caracteres. */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <Field
      variant={variant}
      className={className}
      data-invalid={invalid}
      data-disabled={disabled || undefined}
    >
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required && "*"}
      </FieldLabel>
      {children}
      {footer}
      {invalid ? (
        <FieldError errors={errors} />
      ) : typeof description === "string" ? (
        <FieldDescription>{description}</FieldDescription>
      ) : (
        description
      )}
    </Field>
  )
}

// ---------------------------------------------------------------------------
// TextField

interface TextFieldProps extends BaseFieldProps {
  placeholder?: string
  maxLength?: number
  type?: "text" | "email" | "password" | "url" | "search" | "tel"
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  autoComplete?: string
  readOnly?: boolean
  /** Sanitizador de `onChange` (`toLettersOnly`, `toSafeTextInput`, `toNitInput`…). */
  transform?: (value: string) => string
}

export function TextField({
  placeholder = "Agregar",
  maxLength,
  type = "text",
  inputMode,
  autoComplete,
  readOnly,
  transform,
  ...frame
}: TextFieldProps) {
  const { field, value, invalid, errors, disabled } = useRegisteredField<string>(frame.disabled)
  const id = frame.id ?? field.name
  return (
    <FieldFrame {...frame} htmlFor={id} invalid={invalid} errors={errors} disabled={disabled}>
      <Input
        id={id}
        name={field.name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        value={value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(transform ? transform(e.target.value) : e.target.value)}
        aria-invalid={invalid}
      />
    </FieldFrame>
  )
}

// ---------------------------------------------------------------------------
// TextareaField

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  /** Con `maxLength` se muestra el `CharacterCounter` (salvo `showCounter={false}`). */
  maxLength?: number
  showCounter?: boolean
  rows?: number
  textareaClassName?: string
}

export function TextareaField({
  placeholder = "Agregar",
  maxLength,
  showCounter = true,
  rows,
  textareaClassName,
  ...frame
}: TextareaFieldProps) {
  const { field, value, invalid, errors, disabled } = useRegisteredField<string>(frame.disabled)
  const id = frame.id ?? field.name
  const variant = frame.variant ?? "outlined"
  return (
    <FieldFrame
      {...frame}
      htmlFor={id}
      invalid={invalid}
      errors={errors}
      disabled={disabled}
      footer={
        maxLength != null && showCounter ? (
          <CharacterCounter value={value ?? ""} max={maxLength} />
        ) : null
      }
    >
      <Textarea
        id={id}
        name={field.name}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(variant === "outlined" && TEXTAREA_OUTLINED, textareaClassName)}
        value={value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={invalid}
      />
    </FieldFrame>
  )
}

// ---------------------------------------------------------------------------
// NumberField

/** Mismo borde que un `Input` outlined, para cuando el control lleva sufijo. */
const OUTLINED_INPUT_GROUP =
  "h-11 rounded-md border border-input px-3 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red"

interface NumberFieldProps extends BaseFieldProps {
  placeholder?: string
  /**
   * - `"string"` (default): VARCHAR numérico (documento, DANE, código). El
   *   valor del form es un string de solo dígitos; conserva ceros a la
   *   izquierda.
   * - `"number"`: columna numérica. El valor del form es `number`, y `NaN`
   *   cuando el input queda vacío (así `z.number()` lo rechaza con su
   *   mensaje de obligatorio).
   */
  valueAs?: "string" | "number"
  /** Tope de dígitos que se pueden tipear. */
  maxDigits?: number
  /** Solo `valueAs="number"`: recorta lo tipeado a este máximo. */
  max?: number
  /** Texto fijo a la derecha del input, p. ej. `"%"`. */
  suffix?: ReactNode
}

/**
 * Siempre `type="text"` + `inputMode="numeric"` filtrado con `toDigitsOnly`:
 * `type="number"` pierde ceros a la izquierda y acepta `1e5`, `-`, `.`.
 * Solo enteros no negativos (es lo único que piden hoy los forms).
 */
export function NumberField({
  placeholder = "Agregar",
  valueAs = "string",
  maxDigits,
  max,
  suffix,
  ...frame
}: NumberFieldProps) {
  const { field, value, invalid, errors, disabled } = useRegisteredField<string | number>(
    frame.disabled,
  )
  const id = frame.id ?? field.name
  const display =
    value == null || (typeof value === "number" && Number.isNaN(value)) ? "" : String(value)

  function handleChange(raw: string) {
    const digits = toDigitsOnly(raw, maxDigits)
    if (valueAs === "string") {
      field.handleChange(digits)
      return
    }
    if (digits === "") {
      field.handleChange(Number.NaN)
      return
    }
    const parsed = Number(digits)
    field.handleChange(max != null ? Math.min(parsed, max) : parsed)
  }

  const inputProps = {
    id,
    name: field.name,
    type: "text",
    inputMode: "numeric" as const,
    autoComplete: "off",
    placeholder,
    disabled,
    value: display,
    onBlur: field.handleBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value),
    "aria-invalid": invalid,
  }

  return (
    <FieldFrame {...frame} htmlFor={id} invalid={invalid} errors={errors} disabled={disabled}>
      {suffix != null ? (
        <InputGroup className={OUTLINED_INPUT_GROUP}>
          <InputGroupInput {...inputProps} className="px-0" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      ) : (
        <Input {...inputProps} />
      )}
    </FieldFrame>
  )
}

// ---------------------------------------------------------------------------
// SelectField

/** Valor interno de "sin elegir": Base UI no distingue `""` de un ítem real. */
const NONE = "__none__"

type SelectValueType = string | number

interface SelectFieldProps<TValue extends SelectValueType> extends BaseFieldProps {
  options: SelectOption<TValue>[]
  /** Texto del trigger vacío y del ítem para limpiar. */
  placeholder?: string
  /** Agrega un primer ítem con el `placeholder` que vuelve el campo a `emptyValue`. */
  clearable?: boolean
  /**
   * Valor del form que significa "sin elegir" (default `""`). Formularios
   * con ids numéricos suelen usar `null` o `0`. `null`/`undefined`/`""`
   * siempre se leen como vacíos.
   */
  emptyValue?: TValue | null | ""
  /** Cómo se pinta la opción elegida en el trigger (p. ej. un `Badge`). */
  renderValue?: (option: SelectOption<TValue>) => ReactNode
}

/**
 * Resuelve adentro las dos trampas del `Select` de Base UI: el `items` que
 * necesita `SelectValue` para mostrar la etiqueta (`toSelectItemsMap`) y el
 * centinela `__none__` para el valor vacío. El valor que llega al form es el
 * de la opción (number o string), nunca su versión stringificada.
 */
export function SelectField<TValue extends SelectValueType>({
  options,
  placeholder = "Seleccione",
  clearable = false,
  emptyValue = "",
  renderValue,
  ...frame
}: SelectFieldProps<TValue>) {
  const { field, value, invalid, errors, disabled } = useRegisteredField<
    TValue | null | "" | undefined
  >(frame.disabled)
  const id = frame.id ?? field.name

  const isEmpty = value == null || value === "" || value === emptyValue
  const selectValue = isEmpty ? NONE : String(value)

  const items: Record<string, ReactNode> = {
    [NONE]: placeholder,
    ...(renderValue
      ? Object.fromEntries(options.map((option) => [String(option.value), renderValue(option)]))
      : toSelectItemsMap(options)),
  }

  return (
    <FieldFrame {...frame} htmlFor={id} invalid={invalid} errors={errors} disabled={disabled}>
      <Select
        items={items}
        value={selectValue}
        disabled={disabled}
        onValueChange={(next) => {
          if (next == null) return
          if (next === NONE) {
            if (clearable) field.handleChange(emptyValue)
            return
          }
          const option = options.find((o) => String(o.value) === next)
          if (option) field.handleChange(option.value)
        }}
      >
        <SelectTrigger id={id} aria-invalid={invalid} onBlur={field.handleBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {clearable && <SelectItem value={NONE}>{placeholder}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={String(option.value)} value={String(option.value)} title={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FieldFrame>
  )
}

// ---------------------------------------------------------------------------
// DateField

type DatePickerProps = React.ComponentProps<typeof DatePicker>

interface DateFieldProps extends BaseFieldProps {
  /**
   * - `"date"`: `yyyy-MM-dd` con `@/lib/date-value` (vacío → `""`).
   * - `"datetime"`: `yyyy-MM-dd'T'HH:mm` con `@/lib/date-time-value` (vacío → `""`).
   */
  mode?: "date" | "datetime"
  /** Solo `mode="date"`: para modelos `string | null` (vacío → `null`), vía
   *  el `formatDateValue` de `@/lib/date-time-value`. */
  nullable?: boolean
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  disabledRanges?: DatePickerProps["disabledRanges"]
  enabledDaysOfWeek?: number[]
  align?: DatePickerProps["align"]
}

export function DateField({
  mode = "date",
  nullable = false,
  placeholder,
  minDate,
  maxDate,
  disabledRanges,
  enabledDaysOfWeek,
  align,
  ...frame
}: DateFieldProps) {
  const { field, value, invalid, errors, disabled } = useRegisteredField<string | null>(
    frame.disabled,
  )
  const id = frame.id ?? field.name

  const parsed =
    mode === "datetime"
      ? parseDateTimeValue(value ?? "")
      : nullable
        ? parseNullableDateValue(value)
        : parseDateValue(value ?? "")

  function handleChange(date: Date | undefined) {
    const next =
      mode === "datetime"
        ? formatDateTimeValue(date)
        : nullable
          ? formatNullableDateValue(date)
          : formatDateValue(date)
    field.handleChange(next)
    // El picker no tiene un blur propio útil: elegir fecha cuenta como tocar.
    field.handleBlur()
  }

  const shared = {
    id,
    placeholder,
    disabled,
    minDate,
    maxDate,
    disabledRanges,
    enabledDaysOfWeek,
    align,
    value: parsed,
    onChange: handleChange,
    "aria-invalid": invalid,
  }

  return (
    <FieldFrame {...frame} htmlFor={id} invalid={invalid} errors={errors} disabled={disabled}>
      {mode === "datetime" ? (
        <DatePicker mode="datetime" {...shared} />
      ) : (
        <DatePicker mode="date" {...shared} />
      )}
    </FieldFrame>
  )
}

// ---------------------------------------------------------------------------
// CheckboxField

type CheckboxFieldProps = Omit<BaseFieldProps, "variant">

export function CheckboxField({
  label,
  required,
  description,
  className,
  ...rest
}: CheckboxFieldProps) {
  const { field, value, invalid, errors, disabled } = useRegisteredField<boolean>(rest.disabled)
  const id = rest.id ?? field.name
  return (
    <Field
      orientation="horizontal"
      className={className}
      data-invalid={invalid}
      data-disabled={disabled || undefined}
    >
      <Checkbox
        id={id}
        name={field.name}
        checked={Boolean(value)}
        disabled={disabled}
        onCheckedChange={(checked) => {
          field.handleChange(checked === true)
          field.handleBlur()
        }}
        aria-invalid={invalid}
      />
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      {invalid ? (
        <FieldError errors={errors} />
      ) : typeof description === "string" ? (
        <FieldDescription>{description}</FieldDescription>
      ) : (
        description
      )}
    </Field>
  )
}
