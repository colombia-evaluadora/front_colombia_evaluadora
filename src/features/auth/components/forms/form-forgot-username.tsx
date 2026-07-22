import { useForm } from "@tanstack/react-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  forgotUsernameFormSchema,
  type ForgotUsernameFormValues,
} from "../../api/schema"

interface ForgotUsernameFormProps {
  id: string
  onSubmit: (values: ForgotUsernameFormValues) => void
}

export function ForgotUsernameForm({ id, onSubmit }: ForgotUsernameFormProps) {
  const form = useForm({
    defaultValues: { email: "" } as ForgotUsernameFormValues,
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
        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  aria-describedby={`${field.name}-hint`}
                />
                <FieldDescription id={`${field.name}-hint`}>
                  Usa el correo asociado a tu cuenta.
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>
    </form>
  )
}
