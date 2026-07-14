import type { PaymentStatus } from "./types/payment"
import { PAYMENT_STATUSES } from "./schema"

export const PAYMENT_STATUS_OPTIONS = PAYMENT_STATUSES

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  success: "Exitoso",
  failed: "Fallido",
}

export const PAYMENT_STATUS_VARIANTS: Record<
  PaymentStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  pending: "outline",
  processing: "secondary",
  success: "default",
  failed: "destructive",
}
