import { useForm, type AnyFieldApi } from "@tanstack/react-form"
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
// trigger nunca lo muestra: `SelectValue` recibe una función que mapea el
// valor a su etiqueta.
const ANY = "__any__"

export function FilterReservationsForm({
  id,
  defaultValues,
  onSubmit,
  catalogs,
  hideDocumentNumber = false,
}: FilterReservationsFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: reservationFiltersFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(reservationFiltersFormSchema.parse(value))
    },
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
        <form.Field
          name="firstName"
          children={(field) => <TextFilter field={field} label="Nombre" />}
        />
        <form.Field
          name="lastName"
          children={(field) => <TextFilter field={field} label="Apellido" />}
        />
      </div>

      {!hideDocumentNumber && (
        <form.Field
          name="documentNumber"
          children={(field) => (
            <TextFilter field={field} label="N° Identificación" inputMode="numeric" />
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <form.Field
          name="institution"
          children={(field) => (
            <SelectFilter
              field={field}
              label="Institución educativa"
              anyLabel="Todas"
              options={catalogs?.institutions ?? []}
            />
          )}
        />
        <form.Field
          name="campus"
          children={(field) => (
            <SelectFilter
              field={field}
              label="Sede"
              anyLabel="Todas"
              options={catalogs?.campuses ?? []}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <form.Field
          name="grade"
          children={(field) => (
            <SelectFilter
              field={field}
              label="Grado"
              anyLabel="Todos"
              // El grado viaja como string en el form (igual que en la URL) y
              // se muestra como se lee en la tabla: "3°".
              options={(catalogs?.grades ?? []).map((grade) => String(grade))}
              renderOption={(value) => formatGrade(Number(value))}
            />
          )}
        />
        <form.Field
          name="group"
          children={(field) => (
            <SelectFilter
              field={field}
              label="Grupo"
              anyLabel="Todos"
              options={catalogs?.groups ?? []}
            />
          )}
        />
      </div>

      <form.Field
        name="shifts"
        mode="array"
        children={(field) => (
          <CheckboxFilterGroup
            legend="Jornada"
            name={field.name}
            options={SHIFTS}
            labels={SHIFT_LABELS}
            selected={field.state.value}
            onToggle={(value, checked) => toggleArrayValue(field, value, checked)}
          />
        )}
      />

      <form.Field
        name="levels"
        mode="array"
        children={(field) => (
          <CheckboxFilterGroup
            legend="Nivel educativo"
            name={field.name}
            options={EDUCATION_LEVELS}
            labels={EDUCATION_LEVEL_LABELS}
            selected={field.state.value}
            onToggle={(value, checked) => toggleArrayValue(field, value, checked)}
          />
        )}
      />

      <form.Field
        name="statuses"
        mode="array"
        children={(field) => (
          <CheckboxFilterGroup
            legend="Estado"
            name={field.name}
            options={RESERVATION_STATUSES}
            labels={RESERVATION_STATUS_LABELS}
            selected={field.state.value}
            onToggle={(value, checked) => toggleArrayValue(field, value, checked)}
          />
        )}
      />

      {/* Fecha de reserva: dos campos independientes (no un único rango), cada
          uno en modo `datetime` —calendario y hora en el mismo popover—. La
          leyenda sí aporta acá: "Desde" y "Hasta" sueltos no dicen de qué son. */}
      <FieldSet>
        <FieldLegend variant="label">Fecha de reserva</FieldLegend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <form.Field
            name="reservedFrom"
            children={(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Desde</FieldLabel>
                <DatePicker
                  mode="datetime"
                  id={field.name}
                  value={parseDateTimeValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                  className="h-9"
                />
              </Field>
            )}
          />
          <form.Field
            name="reservedTo"
            children={(field) => (
              // Sin `isTouched`: el error nace del otro campo del rango, así
              // que se muestra apenas la validación de submit lo reporta.
              <Field
                orientation="vertical"
                variant="outlined"
                className="gap-2"
                data-invalid={field.state.meta.errors.length > 0 ? "true" : undefined}
              >
                <FieldLabel htmlFor={field.name}>Hasta</FieldLabel>
                <DatePicker
                  mode="datetime"
                  id={field.name}
                  value={parseDateTimeValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                  className="h-9"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          />
        </div>
      </FieldSet>

      {/* "Agrupar por" no filtra: reordena el listado para que las filas de
          la misma institución/sede/grado queden juntas. */}
      <form.Field
        name="groupBy"
        children={(field) => (
          <SelectFilter
            field={field}
            label="Agrupar por"
            anyLabel="Sin agrupar"
            options={[...RESERVATION_GROUP_BY]}
            renderOption={(value) => RESERVATION_GROUP_BY_LABELS[value as ReservationGroupBy]}
          />
        )}
      />
    </form>
  )
}

/*
 * Los ladrillos del panel. Están acá y no en un componente compartido porque
 * solo los usa este formulario; el `field` se tipa como `AnyFieldApi` para no
 * arrastrar los genéricos del form hasta cada helper —los campos que reciben
 * son todos de tipo `string`—.
 */
function TextFilter({
  field,
  label,
  inputMode,
}: {
  field: AnyFieldApi
  label: string
  inputMode?: "numeric"
}) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        placeholder="Agregar"
        value={field.state.value as string}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        className="h-9"
      />
    </Field>
  )
}

function SelectFilter({
  field,
  label,
  anyLabel,
  options,
  renderOption = (value) => value,
}: {
  field: AnyFieldApi
  label: string
  /** Etiqueta de la opción "sin filtro" ("Todas", "Todos", "Sin agrupar"). */
  anyLabel: string
  options: string[]
  /** Cómo se lee cada valor; por defecto, el valor tal cual. */
  renderOption?: (value: string) => ReactNode
}) {
  const value = (field.state.value as string) || ANY

  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => field.handleChange(next === ANY ? "" : (next ?? ""))}
      >
        <SelectTrigger id={field.name} size="sm" className="w-full">
          <SelectValue>
            {(current) => (!current || current === ANY ? anyLabel : renderOption(String(current)))}
          </SelectValue>
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
  name,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string
  name: string
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
          const optionId = `${name}-filter-${option}`
          return (
            <Field key={option} orientation="horizontal" className="min-w-0 gap-2">
              <Checkbox
                id={optionId}
                name={name}
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
