import { api } from "@/lib/api-client"
import type { ExportFormat, ExportResult } from "@/features/coverage/reservations/api/types/reservation"

interface ExportSelectedReservationsInput {
  ids: string[]
  format: ExportFormat
}

export function exportSelectedReservations(input: ExportSelectedReservationsInput): Promise<ExportResult> {
  return api.post("/coverage/reservations/export", input)
}
