import { api } from "@/lib/api-client"
import type { ExportFormat, ExportResult, ReservationsQueryRequest } from "@/features/coverage/reservations/api/types/reservation"

interface ExportReservationsInput {
  filters: ReservationsQueryRequest["filters"]
  format: ExportFormat
}

export function exportReservations(input: ExportReservationsInput): Promise<ExportResult> {
  return api.post("/coverage/reservations/export-all", input)
}
