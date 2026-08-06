import { useForm } from "@tanstack/react-form"

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
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
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

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <form.Field
          name="firstName"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                autoComplete="off"
                placeholder="Ingresar nombres"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9"
              />
            </Field>
          )}
        />

        <form.Field
          name="lastName"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Apellido</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                autoComplete="off"
                placeholder="Ingresar apellidos"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9"
              />
            </Field>
          )}
        />
      </div>

      {!hideDocumentNumber && (
        <form.Field
          name="documentNumber"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>N° Identificación</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ingresar N° de identificación"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9"
              />
            </Field>
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <form.Field
          name="institution"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Institución educativa</FieldLabel>
              <Select
                value={field.state.value || ANY}
                onValueChange={(value) => field.handleChange(value === ANY ? "" : (value ?? ""))}
              >
                <SelectTrigger id={field.name} size="sm" className="w-full">
                  <SelectValue>
                    {(value) => (!value || value === ANY ? "Todas" : String(value))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todas</SelectItem>
                  {catalogs?.institutions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <form.Field
          name="campus"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Sede</FieldLabel>
              <Select
                value={field.state.value || ANY}
                onValueChange={(value) => field.handleChange(value === ANY ? "" : (value ?? ""))}
              >
                <SelectTrigger id={field.name} size="sm" className="w-full">
                  <SelectValue>
                    {(value) => (!value || value === ANY ? "Todas" : String(value))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todas</SelectItem>
                  {catalogs?.campuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form.Field
          name="grade"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Grado</FieldLabel>
              <Select
                value={field.state.value || ANY}
                onValueChange={(value) => field.handleChange(value === ANY ? "" : (value ?? ""))}
              >
                <SelectTrigger id={field.name} size="sm" className="w-full">
                  <SelectValue>
                    {(value) => (!value || value === ANY ? "Todos" : formatGrade(Number(value)))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos</SelectItem>
                  {catalogs?.grades.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {formatGrade(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <form.Field
          name="group"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Grupo</FieldLabel>
              <Select
                value={field.state.value || ANY}
                onValueChange={(value) => field.handleChange(value === ANY ? "" : (value ?? ""))}
              >
                <SelectTrigger id={field.name} size="sm" className="w-full">
                  <SelectValue>
                    {(value) => (!value || value === ANY ? "Todos" : String(value))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos</SelectItem>
                  {catalogs?.groups.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      </div>

      <form.Field
        name="shifts"
        mode="array"
        children={(field) => {
          const toggle = (shift: (typeof SHIFTS)[number], checked: boolean) => {
            if (checked) {
              field.pushValue(shift)
            } else {
              const index = field.state.value.indexOf(shift)
              if (index > -1) field.removeValue(index)
            }
          }
          return (
            <FieldSet>
              <FieldLegend variant="label">Jornada</FieldLegend>
              <FieldGroup className="grid grid-cols-2 gap-3">
                {SHIFTS.map((shift) => (
                  <FieldLabel key={shift} htmlFor={`shift-filter-${shift}`} className="min-w-0">
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`shift-filter-${shift}`}
                        name={field.name}
                        checked={field.state.value.includes(shift)}
                        onCheckedChange={(checked) => toggle(shift, checked === true)}
                      />
                      <FieldContent className="min-w-0">
                        <FieldTitle className="w-full min-w-0">
                          <span className="truncate">{SHIFT_LABELS[shift]}</span>
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </FieldGroup>
            </FieldSet>
          )
        }}
      />

      <form.Field
        name="levels"
        mode="array"
        children={(field) => {
          const toggle = (level: (typeof EDUCATION_LEVELS)[number], checked: boolean) => {
            if (checked) {
              field.pushValue(level)
            } else {
              const index = field.state.value.indexOf(level)
              if (index > -1) field.removeValue(index)
            }
          }
          return (
            <FieldSet>
              <FieldLegend variant="label">Nivel educativo</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-3">
                {EDUCATION_LEVELS.map((level) => (
                  <FieldLabel key={level} htmlFor={`level-filter-${level}`} className="min-w-0">
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`level-filter-${level}`}
                        name={field.name}
                        checked={field.state.value.includes(level)}
                        onCheckedChange={(checked) => toggle(level, checked === true)}
                      />
                      <FieldContent className="min-w-0">
                        <FieldTitle className="w-full min-w-0">
                          <span className="truncate">{EDUCATION_LEVEL_LABELS[level]}</span>
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </FieldGroup>
            </FieldSet>
          )
        }}
      />

      <form.Field
        name="statuses"
        mode="array"
        children={(field) => {
          const toggle = (status: (typeof RESERVATION_STATUSES)[number], checked: boolean) => {
            if (checked) {
              field.pushValue(status)
            } else {
              const index = field.state.value.indexOf(status)
              if (index > -1) field.removeValue(index)
            }
          }
          return (
            <FieldSet>
              <FieldLegend variant="label">Estado</FieldLegend>
              <FieldGroup className="grid grid-cols-2 gap-3">
                {RESERVATION_STATUSES.map((status) => (
                  <FieldLabel key={status} htmlFor={`status-filter-${status}`} className="min-w-0">
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`status-filter-${status}`}
                        name={field.name}
                        checked={field.state.value.includes(status)}
                        onCheckedChange={(checked) => toggle(status, checked === true)}
                      />
                      <FieldContent className="min-w-0">
                        <FieldTitle className="w-full min-w-0">
                          <span className="truncate">{RESERVATION_STATUS_LABELS[status]}</span>
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </FieldGroup>
            </FieldSet>
          )
        }}
      />

      {/* Fecha de reserva: dos campos independientes (no un único rango), cada
          uno en modo `datetime` —calendario y hora en el mismo popover—. La
          leyenda sí aporta acá: "Desde" y "Hasta" sueltos no dicen de qué son. */}
      <FieldSet>
        <FieldLegend variant="label">Fecha de reserva</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
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
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Hasta</FieldLabel>
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
        </div>
      </FieldSet>

      {/* "Agrupar por" no filtra: reordena el listado para que las filas de
          la misma institución/sede/grado queden juntas. */}
      <form.Field
        name="groupBy"
        children={(field) => (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={field.name}>Agrupar por</FieldLabel>
            <Select
              value={field.state.value || ANY}
              onValueChange={(value) => field.handleChange(value === ANY ? "" : (value ?? ""))}
            >
              <SelectTrigger id={field.name} size="sm" className="w-full">
                <SelectValue>
                  {(value) =>
                    !value || value === ANY
                      ? "Sin agrupar"
                      : RESERVATION_GROUP_BY_LABELS[value as ReservationGroupBy]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Sin agrupar</SelectItem>
                {RESERVATION_GROUP_BY.map((option) => (
                  <SelectItem key={option} value={option}>
                    {RESERVATION_GROUP_BY_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
    </form>
  )
}
