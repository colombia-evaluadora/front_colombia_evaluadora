import { useForm } from "@tanstack/react-form"
import { CircleDashedIcon, CheckCircleIcon, SpinnerIcon } from "@/components/ui/icons"

import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"

import {
  auditFiltersFormSchema,
  type AuditFiltersFormInput,
  type AuditFiltersFormValues,
} from "../../api/schema"
import type { SessionStatus } from "../../api/types/audit"
import { useAuditSessionStatusesQuery } from "../../api/query/use-audit-session-statuses-query"
import { formatDateTimeValue, parseDateTimeValue } from "@/lib/date-time-value"

interface FilterAuditSessionFormProps {
  id: string
  defaultValues: AuditFiltersFormInput
  onSubmit: (values: AuditFiltersFormValues) => void
  // El input de autor vive en el buscador del InputGroup; cuando `hideAuthor`
  // es `true` se omite del form del popover y se conserva como "search".
  hideAuthor?: boolean
}

export function FilterAuditSessionForm({
  id,
  defaultValues,
  onSubmit,
  hideAuthor = false,
}: FilterAuditSessionFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: auditFiltersFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(auditFiltersFormSchema.parse(value))
    },
  })

  // Las opciones de estado las entrega el backend como `{ key, label }`.
  const { data: statusOptions = [], isPending: isLoadingStatuses } =
    useAuditSessionStatusesQuery()

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
    >
      {!hideAuthor && (
        <>
          <form.Field
            name="author"
            children={(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Autor / IP</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  autoComplete="off"
                  placeholder="ej. Juan Pérez o 190.2.45.12"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="h-9"
                />
              </Field>
            )}
          />

          <Separator />
        </>
      )}

      <form.Field
        name="statuses"
        mode="array"
        children={(field) => {
          const toggle = (status: SessionStatus, checked: boolean) => {
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
              {isLoadingStatuses ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <SpinnerIcon className="size-3 animate-spin" />
                  Cargando estados…
                </div>
              ) : (
                <FieldGroup className="grid grid-cols-2 gap-3">
                  {statusOptions.map((option) => {
                    const id = `status-filter-${option.key}`
                    return (
                      <FieldLabel key={option.key} htmlFor={id} className="min-w-0">
                        <Field orientation="horizontal">
                          <Checkbox
                            id={id}
                            name={field.name}
                            checked={field.state.value.includes(option.key)}
                            onCheckedChange={(checked) => toggle(option.key, checked === true)}
                          />
                          <FieldContent className="min-w-0">
                            <FieldTitle className="w-full min-w-0">
                              {option.key === "active" ? (
                                <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <CheckCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate">{option.label}</span>
                            </FieldTitle>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    )
                  })}
                </FieldGroup>
              )}
            </FieldSet>
          )
        }}
      />

      <Separator />

      {/* Dos campos independientes (no un único rango) — cada uno usa el
          modo `datetime`, que combina calendario y hora en el mismo popover
          para no tener que abrir dos controles distintos. */}
      <form.Field
        name="startedFrom"
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
        name="startedTo"
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
    </form>
  )
}