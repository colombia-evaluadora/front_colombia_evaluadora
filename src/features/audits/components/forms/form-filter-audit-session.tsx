import { useForm } from "@tanstack/react-form"
import { CircleDashedIcon, CheckCircleIcon, SpinnerIcon } from "@/components/ui/icons"

import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
                  placeholder="Ingresar autor o IP"
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
          return (
            <FieldSet>
              <FieldLegend variant="label">Estado</FieldLegend>
              {isLoadingStatuses ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <SpinnerIcon className="size-3 animate-spin" />
                  Cargando estados…
                </div>
              ) : (
                // Selección única (`multiple={false}`): el estado es excluyente,
                // pero se puede volver a pulsar el activo para quitar el filtro.
                // El valor sigue siendo un array (0 ó 1 elemento) para no cambiar
                // el contrato de `statuses` con la query.
                <ToggleGroup
                  value={field.state.value}
                  onValueChange={(next) =>
                    field.handleChange(next.slice(-1) as SessionStatus[])
                  }
                  multiple={false}
                  spacing={0}
                  variant="outline"
                  className="w-full"
                >
                  {statusOptions.map((option) => (
                    <ToggleGroupItem
                      key={option.key}
                      value={option.key}
                      size="sm"
                      aria-label={option.label}
                      className="min-w-0 flex-1 gap-1.5"
                    >
                      {option.key === "active" ? (
                        <CircleDashedIcon className="size-4 shrink-0" />
                      ) : (
                        <CheckCircleIcon className="size-4 shrink-0" />
                      )}
                      <span className="truncate">{option.label}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
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