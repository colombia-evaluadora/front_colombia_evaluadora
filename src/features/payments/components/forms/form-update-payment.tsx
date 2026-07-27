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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { paymentFormSchema, type PaymentFormValues } from "../../api/schema"
import { PAYMENT_STATUS_OPTIONS } from "../../api/ui-mappings"
import type { Payment } from "../../api/types/payment"

interface UpdatePaymentFormProps {
  id: string
  payment: Payment
  onSubmit: (values: PaymentFormValues) => void
}

export function UpdatePaymentForm({
  id,
  payment,
  onSubmit,
}: UpdatePaymentFormProps) {
  const form = useForm({
    defaultValues: {
      email: payment.email,
      amount: payment.amount,
      status: payment.status,
    } as PaymentFormValues,
    validators: {
      onChange: paymentFormSchema,
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
      className="flex-1 overflow-y-auto px-6 py-4"
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
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                <FieldDescription>Ingresa un email vÃ¡lido.</FieldDescription>
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            )
          }}
        </form.Field>
        <form.Field name="amount">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Monto</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  step="0.01"
                  value={
                    Number.isNaN(field.state.value) ? "" : field.state.value
                  }
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(e.target.valueAsNumber)
                  }
                  aria-invalid={isInvalid}
                />
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            )
          }}
        </form.Field>
        <form.Field name="status">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
                <Select
                  name={field.name}
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value !== null) field.handleChange(value)
                  }}
                >
                  <SelectTrigger
                    id={field.name}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PAYMENT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
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
