import { z } from "zod"

export const PAYMENT_STATUSES = ["pending", "processing", "success", "failed"] as const

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
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  email: z.string().optional().catch(undefined),
  statuses: z.array(z.enum(PAYMENT_STATUSES)).optional().catch(undefined),
  amountMin: z.coerce.number().nonnegative().optional().catch(undefined),
  amountMax: z.coerce.number().nonnegative().optional().catch(undefined),
})

export type PaymentsSearch = z.infer<typeof paymentsSearchSchema>
