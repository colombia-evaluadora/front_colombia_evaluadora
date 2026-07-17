import { useForm } from "@tanstack/react-form"
import {
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react"

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
  sessionOperationsFiltersFormSchema,
  type SessionOperationsFiltersFormInput,
  type SessionOperationsFiltersFormValues,
} from "../../api/schema"
import type { OperationType } from "../../api/types/audit-table"
import { FieldDateTimePopover } from "./field-date-time-popover"

interface FilterSessionOperationsFormProps {
  id: string
  defaultValues: SessionOperationsFiltersFormInput
  onSubmit: (values: SessionOperationsFiltersFormValues) => void
}

export function FilterSessionOperationsForm({
  id,
  defaultValues,
  onSubmit,
}: FilterSessionOperationsFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: sessionOperationsFiltersFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(sessionOperationsFiltersFormSchema.parse(value))
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
        name="operations"
        mode="array"
        children={(field) => {
          const toggle = (operation: OperationType, checked: boolean) => {
            if (checked) {
              field.pushValue(operation)
            } else {
              const index = field.state.value.indexOf(operation)
              if (index > -1) field.removeValue(index)
            }
          }
          return (
            <FieldSet>
              <FieldLegend variant="label">Operación</FieldLegend>
              <FieldGroup className="grid grid-cols-2 gap-3">
                <FieldLabel htmlFor="session-operation-filter-insert" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="session-operation-filter-insert"
                      name={field.name}
                      checked={field.state.value.includes("INSERT")}
                      onCheckedChange={(checked) =>
                        toggle("INSERT", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <PlusCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Insert</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="session-operation-filter-update" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="session-operation-filter-update"
                      name={field.name}
                      checked={field.state.value.includes("UPDATE")}
                      onCheckedChange={(checked) =>
                        toggle("UPDATE", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <PencilIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Update</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="session-operation-filter-delete" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="session-operation-filter-delete"
                      name={field.name}
                      checked={field.state.value.includes("DELETE")}
                      onCheckedChange={(checked) =>
                        toggle("DELETE", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <TrashIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Delete</span>
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
        name="tableSlug"
        children={(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Tabla</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              autoComplete="off"
              placeholder="ej. tnivel_ensenanza"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              className="h-9"
            />
          </Field>
        )}
      />

      <Separator />

      {/* Dos campos independientes (no un único rango) — cada uno
          combina Calendar + TimePicker en el mismo popover para elegir
          fecha y hora sin tener que abrir dos controles distintos. */}
      <form.Field
        name="occurredFrom"
        children={(field) => (
          <FieldDateTimePopover
            label="Desde"
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      />
      <form.Field
        name="occurredTo"
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