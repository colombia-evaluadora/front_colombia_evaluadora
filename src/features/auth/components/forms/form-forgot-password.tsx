import { useForm } from "@tanstack/react-form"

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { EnvelopeIcon } from "@/components/ui/icons"

import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from "../../api/schema"

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
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Correo electrónico</FieldLabel>
                <InputGroup className="rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                  <InputGroupAddon align="inline-start" className="ml-2">
                    <EnvelopeIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="Ingresar correo electrónico"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                </InputGroup>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>
    </form>
  )
}
