import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { YES_NO_OPTIONS } from "@/features/coverage/matricula/api/ui-mappings"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import { ComboboxField, ComboboxFieldContent, ComboboxFieldItem, ComboboxFieldTrigger, ComboboxFieldValue } from "@/components/ui/combobox"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import type { MatriculaDeptMunicipio } from "@/features/coverage/matricula/api/types/matricula"

interface SectionProps {
  title: string
  /** Archivos va a 2 por fila; el resto de las secciones, a 3. */
  columns?: 2 | 3
  children: ReactNode
}

/**
 * Campos que faltan del formulario (ids de los inputs). Cada sección cuenta los
 * suyos buscándolos en su propio DOM, así no hay que mantener un mapa
 * campo → sección aparte de donde se pinta el campo.
 */
export const MatriculaPendingContext = createContext<string[]>([])

/** Evento que abre la sección que contiene el campo antes de enfocarlo ("Ver pendientes"). */
// Modo ver: se deshabilitan los campos, no el botón que pliega la sección.
export const MatriculaSectionDisabledContext = createContext(false)

export const OPEN_SECTION_EVENT = "matricula:abrir-seccion"

// Plegable (prototipo C.1.AGR): el número sale de un contador CSS del
// contenedor (`[counter-reset:seccion]`), porque las secciones se ocultan
// según la configuración de campos y la numeración tiene que seguir corrida.
// El contenido plegado queda montado (`hidden`) para conservar el conteo.
export function MatriculaFormSection({ title, columns = 3, children }: SectionProps) {
  const pending = useContext(MatriculaPendingContext)
  const disabled = useContext(MatriculaSectionDisabledContext)
  const [open, setOpen] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const bodyId = useId()

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    setPendingCount(pending.filter((id) => body.querySelector(`#${CSS.escape(id)}`)).length)
  }, [pending, children])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const handleOpen = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      if (body.querySelector(`#${CSS.escape(id)}`)) setOpen(true)
    }
    window.addEventListener(OPEN_SECTION_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_SECTION_EVENT, handleOpen)
  }, [])

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card [counter-increment:seccion]">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center gap-3 bg-muted/40 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          <CaretDownIcon
            aria-hidden
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", !open && "-rotate-90")}
          />
          <span className="before:content-[counter(seccion)_'._']">{title}</span>
          {pendingCount > 0 ? (
            <Badge variant="outline" color="orange" className="rounded-full bg-orange-22 text-xs font-medium tracking-normal">
              <span aria-hidden className="size-1.5 rounded-full bg-orange" />
              {pendingCount === 1 ? "1 pendiente" : `${pendingCount} pendientes`}
            </Badge>
          ) : null}
        </button>
      </h2>
      <div ref={bodyRef} id={bodyId} hidden={!open} className="border-t border-border px-4 py-4">
        <fieldset
          disabled={disabled}
          className={
            columns === 2
              ? "m-0 min-w-0 border-0 p-0 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2"
              : "m-0 min-w-0 border-0 p-0 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3"
          }
        >
          {children}
        </fieldset>
      </div>
    </section>
  )
}

/** «DERRICK JORDAN» → «D****** J*****»: la primera letra de cada palabra. */
export function enmascarar(value: string) {
  return value.replace(/\p{L}+/gu, (palabra) => palabra[0] + "*".repeat(palabra.length - 1))
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "date" | "email" | "tel"
  required?: boolean
  invalid?: boolean
  numeric?: boolean
  maxLength?: number
  disabled?: boolean
  /** Dato protegido (Regla 43): se ve parcialmente enmascarado y en solo lectura. */
  masked?: boolean
  /** Sanitizador de lo que se escribe (sustituye a `numeric`). */
  transform?: (value: string) => string
}

export function MatriculaTextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  invalid,
  numeric,
  maxLength,
  disabled,
  masked,
  transform,
}: TextFieldProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span data-required-mark="">*</span> : ""}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        size="sm"
        autoComplete="off"
        placeholder="Agregar"
        value={masked ? enmascarar(value) : value}
        readOnly={masked}
        aria-invalid={invalid}
        inputMode={numeric ? "numeric" : undefined}
        maxLength={maxLength}
        disabled={disabled || masked}
        onChange={(event) => {
          const raw = event.target.value
          onChange(transform ? transform(raw) : numeric ? raw.replace(/\D/g, "") : raw)
        }}
      />
    </Field>
  )
}

interface YesNoFieldProps {
  id: string
  label: string
  /** "Sí" | "No" | "" (sin responder), los mismos valores que el select de antes. */
  value: string
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
  disabled?: boolean
}

// Prototipo C.1.AGR: una pregunta de dos respuestas se contesta de un clic,
// sin abrir una lista. El `id` va en el primer radio para que "Ver pendientes"
// y el conteo por sección lo encuentren igual que a un input.
export function MatriculaYesNoField({ id, label, value, onChange, required, invalid, disabled }: YesNoFieldProps) {
  const labelId = `${id}-label`
  return (
    <div className="flex flex-col gap-2" data-invalid={invalid ? "true" : undefined}>
      <span id={labelId} className={cn("text-sm font-medium", invalid && "text-red")}>
        {label}
        {required ? <span className="ml-0.5 text-red" aria-hidden>*</span> : null}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        aria-required={required}
        aria-invalid={invalid}
        value={value || null}
        onValueChange={(next) => onChange(String(next))}
        disabled={disabled}
        className="flex flex-row items-center gap-6"
      >
        {YES_NO_OPTIONS.map((option, index) => (
          <label key={option} className="flex cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-60">
            <RadioGroupItem id={index === 0 ? id : undefined} value={option} aria-invalid={invalid} />
            {option}
          </label>
        ))}
      </RadioGroup>
    </div>
  )
}

interface DateFieldProps {
  id: string
  label: string
  /** `yyyy-MM-dd`, igual que el resto del formulario (mismo shape que un
   * `<input type="date">` nativo). */
  value: string
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
  maxDate?: Date
  minDate?: Date
  disabled?: boolean
}

/** Mismo `DatePicker` que usa Establecimiento, con el label flotante del resto de campos del alta. */
export function MatriculaDateField({
  id,
  label,
  value,
  onChange,
  required,
  invalid,
  maxDate,
  minDate,
  disabled,
}: DateFieldProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span data-required-mark="">*</span> : ""}
      </FieldLabel>
      <DatePicker
        id={id}
        mode="date"
        value={parseDateValue(value)}
        aria-invalid={invalid}
        maxDate={maxDate}
        minDate={minDate}
        disabled={disabled}
        onChange={(date) => onChange(formatDateValue(date) ?? "")}
      />
    </Field>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  labelFor?: (option: string) => string
  invalid?: boolean
  disabled?: boolean
  /** Ayuda debajo del campo, p. ej. por qué está en solo lectura. */
  description?: string
}

export function MatriculaSelectField({
  id,
  label,
  value,
  options,
  onChange,
  required,
  placeholder = "Seleccionar",
  labelFor = (option) => option,
  invalid,
  disabled,
  description,
}: SelectFieldProps) {
  const items = Object.fromEntries([
    ["", placeholder],
    ...options.map((option) => [option, labelFor(option)]),
  ])
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span data-required-mark="">*</span> : ""}
      </FieldLabel>
      <ComboboxField
        items={items}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full" aria-invalid={invalid}>
          <ComboboxFieldValue placeholder={placeholder} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {/* Opción para deseleccionar: vuelve el campo a su placeholder. */}
          <ComboboxFieldItem key="__empty__" value="">
            {placeholder}
          </ComboboxFieldItem>
          {options.map((option) => (
            <ComboboxFieldItem key={option} value={option}>
              {labelFor(option)}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

// ── Departamento / municipio ─────────────────────────────────────────────────
// Se repite seis veces en el formulario (expedición y nacimiento del
// estudiante, residencia de estudiante y acudiente, expedición del
// acudiente): un solo componente evita reescribir el filtrado en cascada
// cada vez.

export interface MunicipalityOption {
  id: number
  name: string
}

export interface DepartmentOption {
  name: string
  municipalities: MunicipalityOption[]
}

interface DeptMunicipioFieldsProps {
  idPrefix: string
  departmentLabel: string
  municipalityLabel: string
  value: MatriculaDeptMunicipio
  departments: DepartmentOption[]
  onChange: (value: MatriculaDeptMunicipio) => void
  fieldSettings?: MatriculaFieldSettingsMap
  disabled?: boolean
}

export function DeptMunicipioFields({
  idPrefix,
  departmentLabel,
  municipalityLabel,
  value,
  departments,
  onChange,
  fieldSettings,
  disabled,
}: DeptMunicipioFieldsProps) {
  // Regla 4: un solo selector de municipio de la DIVIPOLA; el departamento sale
  // del municipio elegido. Los dos ids siguen en la config (posiciones del back).
  const departmentId = `${idPrefix}-department`
  const municipalityId = `${idPrefix}-municipality`
  void departmentLabel
  const opciones = departments.flatMap((d) =>
    d.municipalities.map((m) => ({ id: String(m.id), etiqueta: `${m.name} (${d.name})`, departamento: d.name })),
  )
  const porId = new Map(opciones.map((o) => [o.id, o]))
  const visible = isFieldVisible(fieldSettings, municipalityId) || isFieldVisible(fieldSettings, departmentId)
  if (!visible) return null
  const label = /\(municipio\)/i.test(municipalityLabel)
    ? municipalityLabel
    : `${municipalityLabel.replace(/\s*municipio\b/i, "").trim()} (municipio)`

  return (
    <MatriculaSelectField
      id={municipalityId}
      label={label}
      required={isFieldRequired(fieldSettings, municipalityId) || isFieldRequired(fieldSettings, departmentId)}
      value={value.municipality}
      options={opciones.map((o) => o.id)}
      labelFor={(id) => porId.get(id)?.etiqueta ?? id}
      placeholder="Buscar municipio"
      disabled={disabled}
      onChange={(municipality) =>
        onChange({ municipality, department: porId.get(municipality)?.departamento ?? "" })
      }
    />
  )
}
