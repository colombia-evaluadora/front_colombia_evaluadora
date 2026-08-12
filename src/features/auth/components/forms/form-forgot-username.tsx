import { useForm } from "@tanstack/react-form"

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { forgotUsernameFormSchema, type ForgotUsernameFormValues } from "../../api/schema"

interface ForgotUsernameFormProps {
  id: string
  onSubmit: (values: ForgotUsernameFormValues) => void
}

export function ForgotUsernameForm({ id, onSubmit }: ForgotUsernameFormProps) {
  const form = useForm({
    defaultValues: { document: "" } as ForgotUsernameFormValues,
    validators: {
      onChange: forgotUsernameFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="document">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Número de documento</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Agregar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>
    </form>
  )
}
