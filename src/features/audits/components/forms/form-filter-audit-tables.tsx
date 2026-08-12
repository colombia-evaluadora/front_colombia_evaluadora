import { useForm } from "@tanstack/react-form"
import { MagnifyingGlassIcon } from "@/components/ui/icons"

import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"

import {
  auditTablesFiltersFormSchema,
  type AuditTablesFiltersFormInput,
  type AuditTablesFiltersFormValues,
} from "../../api/schema"

const DEBOUNCE_MS = 300

interface FilterAuditTablesFormProps {
  id: string
  defaultValues: AuditTablesFiltersFormInput
  onSubmit: (values: AuditTablesFiltersFormValues) => void
}

export function FilterAuditTablesForm({ id, defaultValues, onSubmit }: FilterAuditTablesFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: auditTablesFiltersFormSchema,
    },
  })

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-2"
    >
      <form.Field
        name="name"
        asyncDebounceMs={DEBOUNCE_MS}
        validators={{
          onChangeAsync: async ({ value }) => {
            onSubmit({ name: value })
            return undefined
          },
        }}
      >
        {(field) => (
          <Field orientation="vertical" variant="outlined" className="w-full sm:w-72">
            <FieldLabel htmlFor={field.name}>Buscar</FieldLabel>
            <div className="relative w-full">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={field.name}
                name={field.name}
                type="search"
                variant="outlined"
                autoComplete="off"
                placeholder="Agregar"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 rounded-md pl-8"
              />
            </div>
          </Field>
        )}
      </form.Field>
    </form>
  )
}
