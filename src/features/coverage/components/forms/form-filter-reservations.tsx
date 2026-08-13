import type { ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { useAppForm, useFieldContext } from "@/lib/forms"
import { formatDateTimeValue, parseDateTimeValue } from "@/lib/date-time-value"

import {
  EDUCATION_LEVELS,
  RESERVATION_GROUP_BY,
  RESERVATION_STATUSES,
  SHIFTS,
  reservationFiltersFormSchema,
  type ReservationFiltersFormInput,
  type ReservationFiltersFormValues,
} from "../../api/schema"
import {
  EDUCATION_LEVEL_LABELS,
  RESERVATION_GROUP_BY_LABELS,
  RESERVATION_STATUS_LABELS,
  SHIFT_LABELS,
  formatGrade,
} from "../../api/ui-mappings"
import type { ReservationCatalogs, ReservationGroupBy } from "../../api/types/reservation"

interface FilterReservationsFormProps {
  id: string
  defaultValues: ReservationFiltersFormInput
  onSubmit: (values: ReservationFiltersFormValues) => void
  catalogs?: ReservationCatalogs
  // El input de identificación vive en el buscador del InputGroup; cuando
  // `hideDocumentNumber` es `true` se omite del form y se conserva como
  // "search".
  hideDocumentNumber?: boolean
}

// El "sin filtro" necesita un valor propio (el string vacío no distingue de
// "sin elegir"); usamos un centinela y lo traducimos a "" al guardar. El
// trigger nunca lo muestra: cuando el value es `ANY`, el `SelectValue`
// resuelve el label desde `items` y el form lo guarda como "".
const ANY = "__any__"

export function FilterReservationsForm({
  id,
  defaultValues,
  onSubmit,
  catalogs,
  hideDocumentNumber = false,
}: FilterReservationsFormProps) {
  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: reservationFiltersFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  // `gap-x-4 gap-y-2` en las filas y `gap-4` entre secciones: el mismo ritmo
  // que los formularios de establecimiento. Los campos `outlined` ya traen su
  // propio `mt-2` para la etiqueta flotante, así que un gap más grande deja el
  // panel lleno de aire.
  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-4 px-4"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <form.AppField name="firstName">
          {() => <TextFilter label="Nombre" />}
        </form.AppField>
        <form.AppField name="lastName">
          {() => <TextFilter label="Apellido" />}
        </form.AppField>
      </div>

      {!hideDocumentNumber && (
        <form.AppField name="documentNumber">
          {() => <TextFilter label="N° Identificación" inputMode="numeric" />}
        </form.AppField>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <form.AppField name="institution">
          {() => (
            <SelectFilter
              label="Institución educativa"
              anyLabel="Todas"
              options={catalogs?.institutions ?? []}
            />
          )}
        </form.AppField>
        <form.AppField name="campus">
          {() => (
            <SelectFilter
              label="Sede"
              anyLabel="Todas"
              options={catalogs?.campuses ?? []}
            />
          )}
        </form.AppField>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <form.AppField name="grade">
          {() => (
            <SelectFilter
              label="Grado"
              anyLabel="Todos"
              // El grado viaja como string en el form (igual que en la URL) y
              // se muestra como se lee en la tabla: "3°".
              options={(catalogs?.grades ?? []).map((grade) => String(grade))}
              renderOption={(value) => formatGrade(Number(value))}
            />
          )}
        </form.AppField>
        <form.AppField name="group">
          {() => (
            <SelectFilter
              label="Grupo"
              anyLabel="Todos"
              options={catalogs?.groups ?? []}
            />
          )}
        </form.AppField>
      </div>

      <form.AppField name="shifts" mode="array">
        {(field) => (
          <CheckboxFilterGroup
            legend="Jornada"
            options={SHIFTS}
            labels={SHIFT_LABELS}
            selected={field.state.value}
            onToggle={(value, checked) => toggleArrayValue(field, value, checked)}
          />
        )}
      </form.AppField>

      <form.AppField name="levels" mode="array">
        {(field) => (
          <CheckboxFilterGroup
            legend="Nivel educativo"
            options={EDUCATION_LEVELS}
            labels={EDUCATION_LEVEL_LABELS}
            selected={field.state.value}
            onToggle={(value, checked) => toggleArrayValue(field, value, checked)}
          />
        )}
      </form.AppField>

      <form.AppField name="statuses" mode="array">
        {(field) => (
          <CheckboxFilterGroup
            legend="Estado"
            options={RESERVATION_STATUSES}
            labels={RESERVATION_STATUS_LABELS}
            selected={field.state.value}
            onToggle={(value, checked) => toggleArrayValue(field, value, checked)}
          />
        )}
      </form.AppField>

      {/* Fecha de reserva: dos campos independientes (no un único rango), cada
          uno en modo `datetime` —calendario y hora en el mismo popover—. La
          leyenda sí aporta acá: "Desde" y "Hasta" sueltos no dicen de qué son. */}
      <FieldSet>
        <FieldLegend variant="label">Fecha de reserva</FieldLegend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <form.AppField name="reservedFrom">
            {(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Desde</FieldLabel>
                <DatePicker
                  mode="datetime"
                  id={field.name}
                  size="sm"
                  value={parseDateTimeValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                />
              </Field>
            )}
          </form.AppField>
          <form.AppField name="reservedTo">
            {(field) => {
              // El error de rango es de submit (validación cruzada entre los
              // dos campos), no del campo: se muestra apenas la validación
              // dispara, sin esperar al `isTouched` del propio "Hasta".
              const isInvalid = !field.state.meta.isValid
              return (
                <Field
                  orientation="vertical"
                  variant="outlined"
                  className="gap-2"
                  data-invalid={isInvalid ? "true" : undefined}
                >
                  <FieldLabel htmlFor={field.name}>Hasta</FieldLabel>
                  <DatePicker
                    mode="datetime"
                    id={field.name}
                    size="sm"
                    aria-invalid={isInvalid}
                    value={parseDateTimeValue(field.state.value)}
                    onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )
            }}
          </form.AppField>
        </div>
      </FieldSet>

      {/* "Agrupar por" no filtra: reordena el listado para que las filas de
          la misma institución/sede/grado queden juntas. */}
      <form.AppField name="groupBy">
        {() => (
          <SelectFilter
            label="Agrupar por"
            anyLabel="Sin agrupar"
            options={[...RESERVATION_GROUP_BY]}
            renderOption={(value) => RESERVATION_GROUP_BY_LABELS[value as ReservationGroupBy]}
          />
        )}
      </form.AppField>
    </form>
  )
}

/*
 * Helpers que viven dentro de `<form.AppField>` y leen el `field` del
 * contexto, así no arrastran `field: AnyFieldApi` por props. Cada uno declara
 * el tipo del valor que espera del form (`string`, `string[]`, …).
 */

function TextFilter({ label, inputMode }: { label: string; inputMode?: "numeric" }) {
  const field = useFieldContext<string>()
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type="text"
        inputMode={inputMode}
        size="sm"
        autoComplete="off"
        placeholder="Agregar"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
    </Field>
  )
}

function SelectFilter({
  label,
  anyLabel,
  options,
  renderOption = (value) => value,
}: {
  label: string
  /** Etiqueta de la opción "sin filtro" ("Todas", "Todos", "Sin agrupar"). */
  anyLabel: string
  options: string[]
  /** Cómo se lee cada valor; por defecto, el valor tal cual. */
  renderOption?: (value: string) => ReactNode
}) {
  const field = useFieldContext<string>()
  // El estado interno del select usa `ANY` para "sin filtro"; al guardar lo
  // traducimos a `""` para que el serializador del search schema no mande un
  // centinela a la API.
  const currentValue = field.state.value || ANY
  const itemsMap: Record<string, ReactNode> = {
    [ANY]: anyLabel,
    ...Object.fromEntries(options.map((option) => [option, renderOption(option)])),
  }

  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        items={itemsMap}
        value={currentValue}
        onValueChange={(next) => field.handleChange(next === ANY ? "" : (next ?? ""))}
      >
        <SelectTrigger id={field.name} size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {renderOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function CheckboxFilterGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string
  options: readonly T[]
  labels: Record<T, string>
  selected: readonly T[]
  onToggle: (value: T, checked: boolean) => void
}) {
  /*
   * Las opciones van "peladas" —casilla y texto—, no como tarjetas con borde:
   * `FieldLabel` solo dibuja la tarjeta cuando envuelve un `Field`, así que
   * acá el `Field` es el contenedor y la etiqueta va adentro. Con 5 jornadas o
   * 4 niveles, las tarjetas de `p-4` gastaban media pantalla del panel para
   * mostrar una palabra por fila.
   */
  return (
    <FieldSet className="gap-0">
      <FieldLegend variant="label">{legend}</FieldLegend>
      {/* Tres columnas en las tres secciones: las etiquetas más largas
          ("Básica secundaria") entran en la columna y las opciones quedan
          alineadas entre secciones. */}
      <FieldGroup className="grid grid-cols-3 gap-x-4 gap-y-2">
        {options.map((option) => {
          const optionId = `${legend}-filter-${option}`
          return (
            <Field key={option} orientation="horizontal" className="min-w-0 gap-2">
              <Checkbox
                id={optionId}
                checked={selected.includes(option)}
                onCheckedChange={(checked) => onToggle(option, checked === true)}
              />
              <FieldLabel
                htmlFor={optionId}
                className="min-w-0 flex-1 truncate text-sm font-normal normal-case"
              >
                {labels[option]}
              </FieldLabel>
            </Field>
          )
        })}
      </FieldGroup>
    </FieldSet>
  )
}

/** Alta/baja de una opción en un campo `mode="array"` de TanStack Form. */
function toggleArrayValue<T>(
  field: { state: { value: T[] }; pushValue: (value: T) => void; removeValue: (i: number) => void },
  value: T,
  checked: boolean,
) {
  if (checked) {
    field.pushValue(value)
    return
  }
  const index = field.state.value.indexOf(value)
  if (index > -1) field.removeValue(index)
}
