import type { PaymentStatus } from "./types/payment"
import { PAYMENT_STATUSES } from "./schema"

export const PAYMENT_STATUS_OPTIONS = PAYMENT_STATUSES

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  success: "Exitoso",
  failed: "Fallido",
}

export const PAYMENT_STATUS_BADGE: Record<
  PaymentStatus,
  { variant: "fill" | "outline"; color: "primary" | "secondary" | "destructive" }
> = {
  pending: { variant: "outline", color: "secondary" },
  processing: { variant: "fill", color: "secondary" },
  success: { variant: "fill", color: "primary" },
  failed: { variant: "fill", color: "destructive" },
}
