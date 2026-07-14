import { z } from "zod"

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "success",
  "failed",
] as const

export const paymentFormSchema = z.object({
  email: z.email("Ingresa un email válido."),
  amount: z.number().positive("El monto debe ser mayor a 0."),
  status: z.enum(PAYMENT_STATUSES),
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>

const optionalAmountString = z
  .string()
  .transform((value) => (value.trim() === "" ? undefined : Number(value)))
  .pipe(z.number().nonnegative().optional())

export const paymentFiltersFormSchema = z.object({
  email: z.string(),
  statuses: z.array(z.enum(PAYMENT_STATUSES)),
  amountMin: optionalAmountString,
  amountMax: optionalAmountString,
})

export type PaymentFiltersFormInput = z.input<typeof paymentFiltersFormSchema>
export type PaymentFiltersFormValues = z.infer<typeof paymentFiltersFormSchema>

export const paymentsSearchSchema = z.object({
  email: z.string().optional(),
  status: z.array(z.enum(PAYMENT_STATUSES)).optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  pageIndex: z.number().optional(),
  pageSize: z.number().optional(),
})

export type PaymentsSearch = z.infer<typeof paymentsSearchSchema>
