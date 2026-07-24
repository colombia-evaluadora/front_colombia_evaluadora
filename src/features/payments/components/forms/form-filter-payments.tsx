import { useForm } from "@tanstack/react-form"
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  XCircleIcon,
} from "@/components/ui/icons"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"

import {
  paymentFiltersFormSchema,
  type PaymentFiltersFormInput,
  type PaymentFiltersFormValues,
} from "../../api/schema"
import type { PaymentStatus } from "../../api/types/payment"

interface FilterPaymentsFormProps {
  id: string
  defaultValues: PaymentFiltersFormInput
  onSubmit: (values: PaymentFiltersFormValues) => void
}

export function FilterPaymentsForm({
  id,
  defaultValues,
  onSubmit,
}: FilterPaymentsFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: paymentFiltersFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(paymentFiltersFormSchema.parse(value))
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
        name="email"
        children={(field) => (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              inputMode="email"
              autoComplete="off"
              placeholder="ej. user@example.com"
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
          const toggle = (status: PaymentStatus, checked: boolean) => {
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
                <FieldLabel htmlFor="status-filter-pending" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="status-filter-pending"
                      name={field.name}
                      checked={field.state.value.includes("pending")}
                      onCheckedChange={(checked) =>
                        toggle("pending", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Pending</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel
                  htmlFor="status-filter-processing"
                  className="min-w-0"
                >
                  <Field orientation="horizontal">
                    <Checkbox
                      id="status-filter-processing"
                      name={field.name}
                      checked={field.state.value.includes("processing")}
                      onCheckedChange={(checked) =>
                        toggle("processing", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <CircleHalfIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Processing</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="status-filter-success" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="status-filter-success"
                      name={field.name}
                      checked={field.state.value.includes("success")}
                      onCheckedChange={(checked) =>
                        toggle("success", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <CheckCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Success</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="status-filter-failed" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="status-filter-failed"
                      name={field.name}
                      checked={field.state.value.includes("failed")}
                      onCheckedChange={(checked) =>
                        toggle("failed", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <XCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Failed</span>
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
        name="amountMin"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field
              orientation="vertical"
              className="gap-2"
              data-invalid={isInvalid}
            >
              <FieldLabel>
                <CurrencyDollarIcon />
                Monto (USD)
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={0}
                  placeholder="Mín"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                <span aria-hidden className="text-muted-foreground">—</span>
                <form.Field
                  name="amountMax"
                  children={(maxField) => {
                    const isMaxInvalid =
                      maxField.state.meta.isTouched &&
                      !maxField.state.meta.isValid
                    return (
                      <Input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min={0}
                        placeholder="Máx"
                        name={maxField.name}
                        value={maxField.state.value}
                        onBlur={maxField.handleBlur}
                        onChange={(e) => maxField.handleChange(e.target.value)}
                        aria-invalid={isMaxInvalid}
                      />
                    )
                  }}
                />
              </div>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      />
    </form>
  )
}
