import { useForm } from "@tanstack/react-form"
import { CalendarIcon, CheckCircleIcon, CircleDashedIcon } from "@phosphor-icons/react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

const DATE_FORMAT = "yyyy-MM-dd"

interface FilterAuditSessionFormProps {
  id: string
  defaultValues: AuditFiltersFormInput
  onSubmit: (values: AuditFiltersFormValues) => void
}

export function FilterAuditSessionForm({
  id,
  defaultValues,
  onSubmit,
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

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
    >
      <form.Field
        name="author"
        children={(field) => (
          <Field orientation="vertical" className="gap-2">
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
              <FieldGroup className="grid grid-cols-2 gap-3">
                <FieldLabel htmlFor="status-filter-active" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="status-filter-active"
                      name={field.name}
                      checked={field.state.value.includes("active")}
                      onCheckedChange={(checked) =>
                        toggle("active", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Activo</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="status-filter-closed" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="status-filter-closed"
                      name={field.name}
                      checked={field.state.value.includes("closed")}
                      onCheckedChange={(checked) =>
                        toggle("closed", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <CheckCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Cerrada</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              </FieldGroup>
            </FieldSet>
          )
        }}
      />

      <Separator />

      <form.Field
        name="startedFrom"
        children={(fromField) => (
          <form.Field
            name="startedTo"
            children={(toField) => {
              const range: DateRange | undefined = fromField.state.value
                ? {
                    from: parseISO(fromField.state.value),
                    to: toField.state.value
                      ? parseISO(toField.state.value)
                      : undefined,
                  }
                : undefined

              const label = range?.from
                ? range.to
                  ? `${format(range.from, "d MMM", { locale: es })} – ${format(range.to, "d MMM yyyy", { locale: es })}`
                  : format(range.from, "d MMM yyyy", { locale: es })
                : "Rango de fechas"

              const handleSelect = (next: DateRange | undefined) => {
                fromField.handleChange(next?.from ? format(next.from, DATE_FORMAT) : "")
                toField.handleChange(next?.to ? format(next.to, DATE_FORMAT) : "")
              }

              return (
                <Field orientation="vertical" className="gap-2">
                  <FieldLabel>Fecha (rango)</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start font-normal"
                        />
                      }
                    >
                      <CalendarIcon data-icon="inline-start" />
                      {label}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={range}
                        onSelect={handleSelect}
                        locale={es}
                        numberOfMonths={1}
                      />
                      {range?.from && (
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => handleSelect(undefined)}
                          >
                            Limpiar rango
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </Field>
              )
            }}
          />
        )}
      />
    </form>
  )
}
