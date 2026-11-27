import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { MarcaPendientes } from "@/components/marca-pendientes"
import { Switch } from "@/components/ui/switch"
import { MarcoOpciones } from "@/components/marco-opciones"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { CoincideTodoContext, normalizarBusqueda, Resaltado, useBusquedaDetalle } from "@/components/busqueda-detalle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTruncated } from "@/hooks/use-truncated"
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
  /** Aviso a todo el ancho antes de los campos (p. ej. estudiante ya registrado). */
  aviso?: ReactNode
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

/**
 * Ver detalle (CLAUDE.md §13): cada sección se pinta como `FichaDatos` (etiqueta gris, valor blanco, dos pares
 * por fila) en vez del formulario deshabilitado. Cada campo resuelve su propia etiqueta legible (catálogos,
 * municipios, Sí/No), así el detalle no repite la lógica de los ~70 campos.
 */
export const MatriculaLecturaContext = createContext(false)

/** Cuadrícula de la ficha: la misma de `FichaDatos`; el último par suelto ocupa la fila entera. */
const FICHA_GRID_CLASS = cn(
  "m-0 grid grid-cols-[8.5rem_1fr] gap-px overflow-hidden rounded-lg border border-border bg-border p-0 text-sm",
  "sm:grid-cols-[12rem_1fr_12rem_1fr] sm:[&>dd:last-of-type:nth-of-type(odd)]:col-span-3",
)

/**
 * Campo del formulario con buscador (Agregar/Editar largos, CLAUDE.md §13): mientras se busca, se oculta si ni la
 * etiqueta ni el valor coinciden. Se oculta con `hidden`, sin desmontarlo, para no perder lo escrito ni la
 * validación; los que coinciden llevan `data-par-ficha` para el contador y la sección.
 */
export function CampoBuscable({ label, valor, children }: { label: string; valor?: string; children: ReactNode }) {
  const busqueda = useBusquedaDetalle()
  const todo = useContext(CoincideTodoContext)
  if (!normalizarBusqueda(busqueda)) return <>{children}</>
  return todo || normalizarBusqueda(`${label} ${valor ?? ""}`).includes(normalizarBusqueda(busqueda)) ? (
    <div data-par-ficha="" className="contents">
      {children}
    </div>
  ) : (
    <div hidden>{children}</div>
  )
}

/** Un par de la ficha de detalle. Vacío se ve «—». Con búsqueda, se oculta si no coincide. */
export function ParFicha({ label, valor }: { label: string; valor: ReactNode }) {
  const busqueda = useBusquedaDetalle()
  const q = normalizarBusqueda(busqueda)
  const textoValor = typeof valor === "string" || typeof valor === "number" ? String(valor) : ""
  const todo = useContext(CoincideTodoContext)
  if (q && !todo && !normalizarBusqueda(`${label} ${textoValor}`).includes(q)) return null
  return (
    <>
      <dt data-par-ficha="" className="flex items-center bg-table-screen-title px-4 py-2.5 text-muted-foreground">
        <Resaltado texto={label} busqueda={busqueda} />
      </dt>
      <dd className="m-0 flex min-w-0 items-center bg-background px-4 py-2.5 [overflow-wrap:anywhere]">
        {valor === "" || valor == null ? "—" : textoValor ? <Resaltado texto={textoValor} busqueda={busqueda} /> : valor}
      </dd>
    </>
  )
}

const fechaLegible = (value: string) => (/^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10).split("-").reverse().join("/") : value)

/**
 * Label flotante en UNA línea: los nombres largos ("Lugar expedición documento
 * acudiente (municipio)") se cortan con "…" en vez de partirse en dos líneas y
 * montarse sobre el campo de arriba. El * queda siempre visible al final y,
 * solo si el texto se cortó, al pasar el mouse por el label se ve completo.
 */
function EtiquetaFlotante({ id, label, required }: { id: string; label: string; required?: boolean }) {
  const { ref, isTruncated } = useTruncated<HTMLSpanElement>()
  const busqueda = useBusquedaDetalle()
  return (
    <Tooltip disabled={!isTruncated}>
      <TooltipTrigger
        // El trigger pone su propio data-slot; se conserva el del label, del que
        // dependen los estilos del campo flotante.
        data-slot="field-label"
        render={
          <FieldLabel
            htmlFor={id}
            // w-max: con w-fit el label flex con un hijo truncate tomaba todo el
            // ancho máximo y su fondo tapaba el borde del campo.
            className={cn("flex w-max max-w-[calc(100%-1.25rem)] gap-1", isTruncated && "pointer-events-auto cursor-help")}
          />
        }
      >
        <span ref={ref} className="truncate">
          <Resaltado texto={label} busqueda={busqueda} />
        </span>
        {required ? (
          <span data-required-mark="" className="shrink-0">
            *
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Si la sección arranca abierta (por defecto sí); la inscripción pública abre solo la primera de cada paso. */
export const MatriculaSectionDefaultOpenContext = createContext(true)

/**
 * Sin la autorización de tratamiento de datos (Regla 81), los datos del
 * estudiante (2.2 a 2.9) se ven parcialmente enmascarados y en solo lectura,
 * salvo los de verificación de identidad.
 */
export const MatriculaMaskedContext = createContext(false)

const VERIFICACION_IDENTIDAD = new Set([
  "student-document-type",
  "student-document-number",
  "student-first-name",
  "student-second-name",
  "student-last-name",
  "student-second-last-name",
  "student-birth-date",
])

function useEnmascarado(id: string) {
  return useContext(MatriculaMaskedContext) && !VERIFICACION_IDENTIDAD.has(id)
}

/** Campo de solo lectura con el valor parcialmente enmascarado (Guía UX §5). */
function CampoEnmascarado({ id, label, value }: { id: string; label: string; value: string }) {
  const lectura = useContext(MatriculaLecturaContext)
  if (lectura) return <ParFicha label={label} valor={value ? enmascarar(value) : ""} />
  return (
    <CampoBuscable label={label}>
      <Field orientation="vertical" variant="outlined" className="w-full gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input id={id} size="sm" value={value ? enmascarar(value) : ""} readOnly disabled />
      </Field>
    </CampoBuscable>
  )
}

/**
 * Asignar grupo de una reserva de cupo: las secciones vienen de la matrícula anterior y se marcan
 * «Precargado» (solo lectura) o «Precargado · revisar» (editables, para que se confirmen).
 */
export const MatriculaPrecargaContext = createContext(false)

// Plegable (prototipo C.1.AGR): el número sale de un contador CSS del
// contenedor (`[counter-reset:seccion]`), porque las secciones se ocultan
// según la configuración de campos y la numeración tiene que seguir corrida.
// El contenido plegado queda montado (`hidden`) para conservar el conteo.
export function MatriculaFormSection({ title, columns = 3, children, aviso }: SectionProps) {
  const pending = useContext(MatriculaPendingContext)
  const disabled = useContext(MatriculaSectionDisabledContext)
  const precarga = useContext(MatriculaPrecargaContext)
  const lectura = useContext(MatriculaLecturaContext)
  const busqueda = useBusquedaDetalle()
  const buscando = normalizarBusqueda(busqueda) !== ""
  // Si lo buscado está en el título («acudiente»), la sección se muestra entera, sin filtrar sus campos.
  const tituloCoincide = buscando && normalizarBusqueda(title).includes(normalizarBusqueda(busqueda))
  const [paresVisibles, setParesVisibles] = useState(1)
  const [open, setOpen] = useState(useContext(MatriculaSectionDefaultOpenContext))
  const [pendingCount, setPendingCount] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const bodyId = useId()

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    setPendingCount(pending.filter((id) => body.querySelector(`#${CSS.escape(id)}`)).length)
  }, [pending, children])

  // Con búsqueda: cuántos pares quedaron (si ninguno, la sección entera se oculta).
  useLayoutEffect(() => {
    if (!buscando) return
    setParesVisibles(bodyRef.current?.querySelectorAll("[data-par-ficha]").length ?? 0)
  }, [buscando, tituloCoincide, busqueda, children])

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
    <section
      // Sin coincidencias se saca del flujo pero sigue contando para la numeración (con hidden las demás se
      // renumeraban: «3. Domicilio» pasaba a «1.»).
      aria-hidden={buscando && paresVisibles === 0 ? true : undefined}
      data-seccion-detalle=""
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card [counter-increment:seccion]",
        buscando && paresVisibles === 0 && "invisible absolute h-0 w-0 border-0",
      )}
    >
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open || buscando}
          aria-controls={bodyId}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center gap-3 bg-table-screen-title px-4 py-3 text-left text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          <CaretDownIcon
            aria-hidden
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", !(open || buscando) && "-rotate-90")}
          />
          <span className="before:content-[counter(seccion)_'._']">
            <Resaltado texto={title} busqueda={busqueda} />
          </span>
          {precarga ? (
            <Badge variant="soft" color="muted" className="rounded-full text-xs font-medium tracking-normal">
              {disabled ? "Precargado" : "Precargado · revisar"}
            </Badge>
          ) : null}
          <MarcaPendientes pendientes={pendingCount} />
        </button>
      </h2>
      <div ref={bodyRef} id={bodyId} hidden={!(open || buscando)} className="border-t border-border px-4 py-4">
        {aviso ? <div className="mb-4 flex flex-col gap-3">{aviso}</div> : null}
        <CoincideTodoContext value={tituloCoincide}>
        {lectura ? (
          <dl className={FICHA_GRID_CLASS}>{children}</dl>
        ) : (
        <fieldset
          disabled={disabled}
          // Con menos campos que columnas, los que hay se reparten todo el ancho
          // (2 campos → 2 columnas, 1 campo → ancho completo) en vez de dejar un hueco.
          className={cn(
            "m-0 grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 border-0 p-0",
            columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3 md:has-[>:nth-child(2):last-child]:grid-cols-2",
            "md:has-[>:only-child]:grid-cols-1",
          )}
        >
          {children}
        </fieldset>
        )}
        </CoincideTodoContext>
      </div>
    </section>
  )
}

/** «DERRICK JORDAN» → «D****** J*****»: la primera letra de cada palabra. */
export function enmascarar(value: string) {
  return value.replace(/[\p{L}\p{N}]+/gu, (palabra) => palabra[0] + "*".repeat(palabra.length - 1))
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
  /** Ayuda debajo del campo. */
  description?: string
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
  description,
}: TextFieldProps) {
  const oculto = useEnmascarado(id)
  const lectura = useContext(MatriculaLecturaContext)
  if (oculto) return <CampoEnmascarado id={id} label={label} value={value} />
  if (lectura) return <ParFicha label={label} valor={masked ? enmascarar(value) : value} />
  return (
    <CampoBuscable label={label} valor={masked ? "" : value}>
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <EtiquetaFlotante id={id} label={label} required={required} />
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
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
    </CampoBuscable>
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

// Prototipo C.1.AGR: una pregunta de dos respuestas se contesta de un clic con un interruptor (Sí/No),
// en su recuadro con label flotante (`MarcoOpciones`, CLAUDE.md §13), como «¿Media técnica…?». Sin tocar
// cuenta como No (así lo manda `toBoolSN`). El `id` va en el interruptor para que "Ver pendientes" y el
// conteo por sección lo encuentren igual que a un input.
export function MatriculaYesNoField({ id, label, value, onChange, required, invalid, disabled }: YesNoFieldProps) {
  const oculto = useEnmascarado(id)
  const lectura = useContext(MatriculaLecturaContext)
  if (oculto) return <CampoEnmascarado id={id} label={label} value={value} />
  if (lectura) return <ParFicha label={label} valor={value === "Sí" ? "Sí" : "No"} />
  const marcoId = `${id}-marco`
  const si = value === "Sí"
  return (
    <CampoBuscable label={label} valor={si ? "Sí" : "No"}>
    <MarcoOpciones id={marcoId} label={label} required={required} invalido={invalid}>
      <label
        htmlFor={id}
        className="flex w-fit cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-60"
      >
        <Switch
          round
          id={id}
          aria-labelledby={`${marcoId}-label`}
          aria-invalid={invalid}
          checked={si}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked ? "Sí" : "No")}
        />
        {si ? "Sí" : "No"}
      </label>
    </MarcoOpciones>
    </CampoBuscable>
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
  /** Ayuda debajo del campo. */
  description?: string
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
  description,
}: DateFieldProps) {
  const oculto = useEnmascarado(id)
  const lectura = useContext(MatriculaLecturaContext)
  if (oculto) return <CampoEnmascarado id={id} label={label} value={value} />
  if (lectura) return <ParFicha label={label} valor={fechaLegible(value)} />
  return (
    <CampoBuscable label={label} valor={fechaLegible(value)}>
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <EtiquetaFlotante id={id} label={label} required={required} />
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
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
    </CampoBuscable>
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
  /** Opciones visibles pero no elegibles, con su texto secundario. */
  disabledOptions?: Record<string, string>
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
  disabledOptions,
}: SelectFieldProps) {
  const oculto = useEnmascarado(id)
  const lectura = useContext(MatriculaLecturaContext)
  if (oculto) return <CampoEnmascarado id={id} label={label} value={value ? labelFor(value) : ""} />
  if (lectura) return <ParFicha label={label} valor={value ? labelFor(value) : ""} />
  return (
    <CampoBuscable label={label} valor={value ? labelFor(value) : ""}>
      <SelectFieldInterno
        id={id}
        label={label}
        value={value}
        options={options}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        labelFor={labelFor}
        invalid={invalid}
        disabled={disabled}
        description={description}
        disabledOptions={disabledOptions}
      />
    </CampoBuscable>
  )
}

function SelectFieldInterno({
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
  disabledOptions,
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
      <EtiquetaFlotante id={id} label={label} required={required} />
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
            <ComboboxFieldItem key={option} value={option} disabled={Boolean(disabledOptions?.[option])}>
              {disabledOptions?.[option] ? (
                <span className="flex flex-col">
                  {labelFor(option)}
                  <span className="text-xs text-muted-foreground">{disabledOptions[option]}</span>
                </span>
              ) : (
                labelFor(option)
              )}
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
