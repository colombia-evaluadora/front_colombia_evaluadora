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
  { variant: "soft"; color: "primary" | "secondary" | "destructive" }
> = {
  pending: { variant: "soft", color: "secondary" },
  processing: { variant: "soft", color: "secondary" },
  success: { variant: "soft", color: "primary" },
  failed: { variant: "soft", color: "destructive" },
}
