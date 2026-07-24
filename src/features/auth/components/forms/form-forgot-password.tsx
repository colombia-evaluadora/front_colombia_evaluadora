import { useForm } from "@tanstack/react-form"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "../../api/schema"

interface ForgotPasswordFormProps {
  id: string
  onSubmit: (values: ForgotPasswordFormValues) => void
}

export function ForgotPasswordForm({ id, onSubmit }: ForgotPasswordFormProps) {
  const form = useForm({
    defaultValues: { email: "" } as ForgotPasswordFormValues,
    validators: {
      onChange: forgotPasswordFormSchema,
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
              <Field variant="outlined" data-invalid={isInvalid}>
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
                />
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>
    </form>
  )
}
