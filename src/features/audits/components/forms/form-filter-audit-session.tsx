import { useForm } from "@tanstack/react-form"
import { CheckCircleIcon, CircleDashedIcon } from "@/components/ui/icons"

import { Checkbox } from "@/components/ui/checkbox"
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
import { FieldDateTimePopover } from "./field-date-time-popover"

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

      {/* Dos campos independientes (no un único rango) — cada uno
          combina Calendar + TimePicker en el mismo popover para elegir
          fecha y hora sin tener que abrir dos controles distintos. */}
      <form.Field
        name="startedFrom"
        children={(field) => (
          <FieldDateTimePopover
            label="Desde"
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      />
      <form.Field
        name="startedTo"
        children={(field) => (
          <FieldDateTimePopover
            label="Hasta"
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      />
    </form>
  )
}
